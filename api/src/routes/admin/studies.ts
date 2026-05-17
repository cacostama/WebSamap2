import { crudRouter, z } from "./crud.js";

export const studiesRouter = crudRouter({
  table: "studies",
  defaultOrderBy: "order",
  schema: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    order: z.number().int().optional(),
  }),
});
