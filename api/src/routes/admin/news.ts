import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { sanitizeHtml, stripHtml } from "../../html.js";

export const newsRouter = Router();

const schema = z.object({
  slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().max(500).nullable().optional(),
  body: z.string().min(1).max(100_000),
  coverUrl: z.string().max(500).nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

newsRouter.get("/", async (_req, res) => {
  res.json(await db("news").orderBy("published_at", "desc").orderBy("id", "desc"));
});

newsRouter.get("/:id", async (req, res) => {
  const row = await db("news").where({ id: req.params.id }).first();
  if (!row) return res.status(404).json({ error: "no encontrada" });
  res.json(row);
});

newsRouter.post("/", async (req, res) => {
  const p = schema.parse(req.body);
  const [id] = await db("news").insert({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? (stripHtml(p.body).slice(0, 300) || null),
    body: sanitizeHtml(p.body) ?? "",
    cover_url: p.coverUrl ?? null,
    published_at: p.publishedAt ?? null,
    status: p.status ?? "draft",
  });
  res.status(201).json({ id });
});

newsRouter.put("/:id", async (req, res) => {
  const p = schema.partial().parse(req.body);
  const patch: any = {};
  if (p.slug !== undefined) patch.slug = p.slug;
  if (p.title !== undefined) patch.title = p.title;
  if (p.excerpt !== undefined) patch.excerpt = p.excerpt;
  if (p.body !== undefined) patch.body = sanitizeHtml(p.body);
  if (p.coverUrl !== undefined) patch.cover_url = p.coverUrl;
  if (p.publishedAt !== undefined) patch.published_at = p.publishedAt;
  if (p.status !== undefined) patch.status = p.status;
  patch.updated_at = db.fn.now();
  await db("news").where({ id: req.params.id }).update(patch);
  res.json({ ok: true });
});

newsRouter.delete("/:id", async (req, res) => {
  await db("news").where({ id: req.params.id }).del();
  res.status(204).end();
});
