import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { sanitizeHtml } from "../html.js";

export const publicRouter = Router();

publicRouter.get("/settings", async (_req, res) => {
  const rows = await db("settings").select("key", "value");
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

publicRouter.get("/menus", async (_req, res) => {
  const rows = await db("menus").select("location", "items");
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.location] = r.items;
  res.json(out);
});

publicRouter.get("/pages", async (_req, res) => {
  const rows = await db("pages").where({ status: "published" }).orderBy("order").select("id", "slug", "title");
  res.json(rows);
});

publicRouter.get("/pages/:slug", async (req, res) => {
  const page = await db("pages").where({ slug: req.params.slug, status: "published" }).first();
  if (!page) return res.status(404).json({ error: "no encontrada" });
  const blocks = await db("blocks").where({ page_id: page.id }).orderBy("order");
  const visibleBlocks = blocks.filter((block) => shouldExposePublicBlock(page.slug, block));
  res.json({
    ...page,
    seo: page.seo,
    blocks: visibleBlocks.map((b, order) => ({
      id: b.id,
      type: b.type,
      order,
      props: sanitizeBlockProps(b.props),
    })),
  });
});

publicRouter.get("/specialties", async (_req, res) => {
  const rows = await db("specialties").orderBy("order").orderBy("name");
  res.json(rows);
});

publicRouter.get("/specialties/:slug", async (req, res) => {
  const sp = await db("specialties").where({ slug: req.params.slug }).first();
  if (!sp) return res.status(404).json({ error: "no encontrada" });
  const doctors = await db("doctors as d")
    .join("doctor_specialty as ds", "ds.doctor_id", "d.id")
    .where("ds.specialty_id", sp.id)
    .orderByRaw("COALESCE(d.`order`, 9999) ASC")
    .orderByRaw("LOWER(SUBSTRING_INDEX(d.name, ' ', -1)) ASC")
    .orderBy("d.name")
    .select("d.id", "d.slug", "d.name", "d.photo_url");
  res.json({ ...sp, doctors });
});

publicRouter.get("/doctors", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const specialty = req.query.specialty as string | undefined;
  // Orden por apellido: tomamos el último token del nombre (Dr./Dra. quedan al inicio).
  // Fallback al campo `order` para empujar destacados arriba.
  let qb = db("doctors as d")
    .select("d.id", "d.slug", "d.name", "d.photo_url")
    .orderByRaw("LOWER(SUBSTRING_INDEX(d.name, ' ', -1)) ASC")
    .orderBy("d.name");
  if (q) qb = qb.where("d.name", "like", `%${q}%`);
  if (specialty) {
    qb = qb
      .join("doctor_specialty as ds", "ds.doctor_id", "d.id")
      .join("specialties as s", "s.id", "ds.specialty_id")
      .where("s.slug", specialty);
  }
  const doctors = await qb;
  // adjuntar especialidades en batch
  if (doctors.length) {
    const ids = doctors.map((d) => d.id);
    const links = await db("doctor_specialty as ds")
      .join("specialties as s", "s.id", "ds.specialty_id")
      .whereIn("ds.doctor_id", ids)
      .select("ds.doctor_id", "s.id", "s.slug", "s.name");
    const map = new Map<number, any[]>();
    for (const l of links) {
      const arr = map.get(l.doctor_id) ?? [];
      arr.push({ id: l.id, slug: l.slug, name: l.name });
      map.set(l.doctor_id, arr);
    }
    for (const d of doctors as any[]) d.specialties = map.get(d.id) ?? [];
  }
  res.json(doctors);
});

publicRouter.get("/doctors/:slug", async (req, res) => {
  const d = await db("doctors").where({ slug: req.params.slug }).first();
  if (!d) return res.status(404).json({ error: "no encontrado" });
  const specialties = await db("doctor_specialty as ds")
    .join("specialties as s", "s.id", "ds.specialty_id")
    .where("ds.doctor_id", d.id)
    .select("s.id", "s.slug", "s.name");
  res.json({ ...d, bio: sanitizeHtml(d.bio), specialties });
});

publicRouter.get("/services", async (_req, res) => {
  res.json(await db("services").orderBy("order"));
});
publicRouter.get("/studies", async (_req, res) => {
  res.json(await db("studies").orderBy("order"));
});
publicRouter.get("/news", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  res.json(
    await db("news")
      .where({ status: "published" })
      .orderBy("published_at", "desc")
      .limit(limit),
  );
});
publicRouter.get("/news/:slug", async (req, res) => {
  const n = await db("news").where({ slug: req.params.slug, status: "published" }).first();
  if (!n) return res.status(404).json({ error: "no encontrada" });
  res.json({ ...n, body: sanitizeHtml(n.body) });
});

const appointmentSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(4),
  email: z.string().email(),
  specialtyId: z.number().int().optional(),
  doctorId: z.number().int().optional(),
  preferredAt: z.string().optional(),
  message: z.string().optional(),
});

function sanitizeBlockProps(props: unknown): unknown {
  if (Array.isArray(props)) return props.map(sanitizeBlockProps);
  if (!props || typeof props !== "object") return props;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" && (key === "html" || key === "body" || key === "embedHtml")) {
      out[key] = sanitizeHtml(value) ?? "";
    } else {
      out[key] = sanitizeBlockProps(value);
    }
  }
  return out;
}

function shouldExposePublicBlock(pageSlug: string, block: { type: string; props: unknown }) {
  if (block.type !== "cta") return true;
  // CTAs con acciones directas (tel:, mailto:, WhatsApp, Google Maps) siempre se muestran.
  const props = parseJson(block.props) as { ctaHref?: unknown } | null;
  const href = props?.ctaHref;
  if (typeof href === "string") {
    if (/^(tel:|mailto:)/i.test(href)) return true;
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return true;
    if (/^https?:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(href)) return true;
  }
  // CTAs internos genéricos: solo se muestran en el home y si el título habla de emergencias.
  if (pageSlug !== "home") return false;
  return blockTitleIncludes(block.props, "emergencia");
}

function blockTitleIncludes(props: unknown, needle: string) {
  const parsed = parseJson(props);
  if (!parsed || typeof parsed !== "object" || !("title" in parsed)) return false;
  const title = (parsed as { title?: unknown }).title;
  return typeof title === "string" && normalizeText(title).includes(needle);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
publicRouter.post("/appointments", async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "payload invalido", issues: parsed.error.issues });
  const d = parsed.data;
  const [id] = await db("appointments").insert({
    name: d.name,
    phone: d.phone,
    email: d.email,
    specialty_id: d.specialtyId ?? null,
    doctor_id: d.doctorId ?? null,
    preferred_at: d.preferredAt ?? null,
    message: d.message ?? null,
  });
  res.status(201).json({ id });
});

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(5),
});
publicRouter.post("/contact-messages", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "payload invalido" });
  const d = parsed.data;
  const [id] = await db("contact_messages").insert({
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    message: d.message,
  });
  res.status(201).json({ id });
});
