import { Router } from "express";
import type { Request, Response } from "express";
import { z, ZodSchema, ZodObject } from "zod";
import { db } from "../../db.js";

export interface CrudOpts {
  table: string;
  schema: ZodSchema<any>;
  /** columnas a devolver en list */
  listColumns?: string[];
  /** ordering por defecto */
  defaultOrderBy?: string;
  /** transformación de payload antes de insert/update (JSON.stringify de campos json) */
  prepare?: (input: any) => Record<string, unknown>;
  /** transformación de fila al leer */
  serialize?: (row: any) => any;
}

export function crudRouter(opts: CrudOpts): Router {
  const r = Router();
  const prepare = opts.prepare ?? ((x) => x);
  const serialize = opts.serialize ?? ((x) => x);

  r.get("/", async (req: Request, res: Response) => {
    const q = req.query.q as string | undefined;
    let qb = db(opts.table);
    if (opts.listColumns) qb = qb.select(opts.listColumns);
    if (opts.defaultOrderBy) qb = qb.orderBy(opts.defaultOrderBy);
    if (q && (req.query.searchField as string)) {
      qb = qb.where(req.query.searchField as string, "like", `%${q}%`);
    }
    const rows = await qb;
    res.json(rows.map(serialize));
  });

  r.get("/:id", async (req, res) => {
    const row = await db(opts.table).where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: "no encontrado" });
    res.json(serialize(row));
  });

  r.post("/", async (req, res) => {
    const parsed = opts.schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "payload invalido", issues: parsed.error.issues });
    const [id] = await db(opts.table).insert(prepare(parsed.data));
    const row = await db(opts.table).where({ id }).first();
    res.status(201).json(serialize(row));
  });

  r.put("/:id", async (req, res) => {
    const partialSchema = (opts.schema as ZodObject<any>).partial();
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "payload invalido", issues: parsed.error.issues });
    await db(opts.table).where({ id: req.params.id }).update(prepare(parsed.data));
    const row = await db(opts.table).where({ id: req.params.id }).first();
    res.json(serialize(row));
  });

  r.delete("/:id", async (req, res) => {
    await db(opts.table).where({ id: req.params.id }).del();
    res.status(204).end();
  });

  return r;
}

export { z };
