import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { hashPassword, requireRole } from "../../auth.js";

export const usersRouter = Router();
usersRouter.use(requireRole("superadmin"));

usersRouter.get("/", async (_req, res) => {
  res.json(await db("users").select("id", "email", "name", "role", "created_at").orderBy("id"));
});

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  role: z.enum(["superadmin", "editor"]).optional(),
});

usersRouter.post("/", async (req, res) => {
  const p = schema.parse(req.body);
  if (!p.password) return res.status(400).json({ error: "password requerido" });
  const password_hash = await hashPassword(p.password);
  const [id] = await db("users").insert({
    email: p.email,
    name: p.name,
    password_hash,
    role: p.role ?? "editor",
  });
  res.status(201).json({ id });
});

usersRouter.put("/:id", async (req, res) => {
  const p = schema.partial().parse(req.body);
  const patch: any = {};
  if (p.email !== undefined) patch.email = p.email;
  if (p.name !== undefined) patch.name = p.name;
  if (p.role !== undefined) patch.role = p.role;
  if (p.password) patch.password_hash = await hashPassword(p.password);
  await db("users").where({ id: req.params.id }).update(patch);
  res.json({ ok: true });
});

usersRouter.delete("/:id", async (req, res) => {
  if (Number(req.params.id) === req.user?.id) {
    return res.status(400).json({ error: "no podés borrarte a vos mismo" });
  }
  await db("users").where({ id: req.params.id }).del();
  res.status(204).end();
});
