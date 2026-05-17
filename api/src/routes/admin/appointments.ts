import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";

export const appointmentsRouter = Router();

appointmentsRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  let qb = db("appointments").orderBy("created_at", "desc");
  if (status) qb = qb.where({ status });
  res.json(await qb);
});

appointmentsRouter.put("/:id", async (req, res) => {
  const p = z.object({ status: z.enum(["pendiente", "confirmado", "cancelado"]) }).parse(req.body);
  await db("appointments").where({ id: req.params.id }).update({ status: p.status });
  res.json({ ok: true });
});

appointmentsRouter.delete("/:id", async (req, res) => {
  await db("appointments").where({ id: req.params.id }).del();
  res.status(204).end();
});
