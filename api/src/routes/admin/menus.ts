import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";

export const menusRouter = Router();

menusRouter.get("/", async (_req, res) => {
  res.json(await db("menus").select("location", "items"));
});

menusRouter.put("/:location", async (req, res) => {
  const loc = req.params.location;
  if (!["header", "footer"].includes(loc)) return res.status(400).json({ error: "location invalida" });
  const items = z.array(z.any()).parse(req.body.items ?? []);
  await db("menus")
    .insert({ location: loc, items: JSON.stringify(items) })
    .onConflict("location")
    .merge({ items: JSON.stringify(items), updated_at: db.fn.now() });
  res.json({ ok: true });
});
