import { crudRouter, z } from "./crud.js";

export const specialtiesRouter = crudRouter({
  table: "specialties",
  defaultOrderBy: "order",
  schema: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    icon: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    order: z.number().int().optional(),
  }),
});
