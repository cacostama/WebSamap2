import type { Knex } from "knex";

/**
 * Aplica los lineamientos de marca Adventist Health:
 *   - Pantone 7462 C (navy)  → primary  #005587
 *   - Pantone 311 C  (cyan)  → secondary #00B5DA
 *   - Tipografía: Work Sans (heading) + Open Sans (body)
 *
 * Idempotente: usa onConflict.merge para no romper si la fila no existe.
 */
const BRAND = {
  primary: "#005587",   // Pantone 7462 C
  secondary: "#00B5DA", // Pantone 311 C
  fontHeading: "Work Sans",
  fontBody: "Open Sans",
};

export async function up(knex: Knex): Promise<void> {
  const row = await knex("settings").where({ key: "theme" }).first();
  const current = row?.value ?? {};
  const theme = typeof current === "string" ? JSON.parse(current) : current;
  const next = { ...theme, ...BRAND };
  await knex("settings")
    .insert({ key: "theme", value: JSON.stringify(next) })
    .onConflict("key")
    .merge({ value: JSON.stringify(next), updated_at: knex.fn.now() });
}

export async function down(knex: Knex): Promise<void> {
  const row = await knex("settings").where({ key: "theme" }).first();
  if (!row) return;
  const current = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  const reverted = {
    ...current,
    primary: "#004884",
    secondary: "#00bcd1",
    fontHeading: "Open Sans",
    fontBody: "Open Sans",
  };
  await knex("settings")
    .where({ key: "theme" })
    .update({ value: JSON.stringify(reverted), updated_at: knex.fn.now() });
}
