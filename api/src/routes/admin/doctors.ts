import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { sanitizeHtml } from "../../html.js";

export const doctorsRouter = Router();

const schema = z.object({
  slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(191),
  photoUrl: z.string().max(500).nullable().optional(),
  bio: z.string().max(100_000).nullable().optional(),
  schedule: z.unknown().optional(),
  order: z.number().int().optional(),
  specialtyIds: z.array(z.number().int()).optional(),
});

async function attachSpecialties(rows: any[]) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
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
  for (const r of rows) r.specialties = map.get(r.id) ?? [];
  return rows;
}

doctorsRouter.get("/", async (_req, res) => {
  const rows = await db("doctors").orderBy("order").orderBy("name");
  res.json(await attachSpecialties(rows));
});

doctorsRouter.get("/:id", async (req, res) => {
  const row = await db("doctors").where({ id: req.params.id }).first();
  if (!row) return res.status(404).json({ error: "no encontrado" });
  await attachSpecialties([row]);
  res.json(row);
});

async function syncSpecialties(doctorId: number, ids: number[]) {
  await db("doctor_specialty").where({ doctor_id: doctorId }).del();
  if (ids.length) {
    await db("doctor_specialty").insert(ids.map((sid) => ({ doctor_id: doctorId, specialty_id: sid })));
  }
}

doctorsRouter.post("/", async (req, res) => {
  const p = schema.parse(req.body);
  const [id] = await db("doctors").insert({
    slug: p.slug,
    name: p.name,
    photo_url: p.photoUrl ?? null,
    bio: sanitizeHtml(p.bio) ?? null,
    schedule: p.schedule ? JSON.stringify(p.schedule) : null,
    order: p.order ?? 0,
  });
  if (p.specialtyIds) await syncSpecialties(id, p.specialtyIds);
  res.status(201).json({ id });
});

doctorsRouter.put("/:id", async (req, res) => {
  const p = schema.partial().parse(req.body);
  const patch: any = {};
  if (p.slug !== undefined) patch.slug = p.slug;
  if (p.name !== undefined) patch.name = p.name;
  if (p.photoUrl !== undefined) patch.photo_url = p.photoUrl;
  if (p.bio !== undefined) patch.bio = sanitizeHtml(p.bio);
  if (p.schedule !== undefined) patch.schedule = JSON.stringify(p.schedule);
  if (p.order !== undefined) patch.order = p.order;
  await db("doctors").where({ id: req.params.id }).update(patch);
  if (p.specialtyIds) await syncSpecialties(Number(req.params.id), p.specialtyIds);
  res.json({ ok: true });
});

doctorsRouter.delete("/:id", async (req, res) => {
  await db("doctors").where({ id: req.params.id }).del();
  res.status(204).end();
});
