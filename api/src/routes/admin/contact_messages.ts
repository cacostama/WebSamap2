import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";

export const contactMessagesRouter = Router();

contactMessagesRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  let qb = db("contact_messages").orderBy("created_at", "desc");
  if (status) qb = qb.where({ status });
  res.json(await qb);
});

contactMessagesRouter.put("/:id", async (req, res) => {
  const p = z.object({ status: z.enum(["nuevo", "leido", "respondido"]) }).parse(req.body);
  await db("contact_messages").where({ id: req.params.id }).update({ status: p.status });
  res.json({ ok: true });
});

contactMessagesRouter.delete("/:id", async (req, res) => {
  await db("contact_messages").where({ id: req.params.id }).del();
  res.status(204).end();
});
