import type { Knex } from "knex";

const FONT = "Open Sans";

export async function up(knex: Knex): Promise<void> {
  const row = await knex("settings").where({ key: "theme" }).first();
  const current = row?.value ?? {};
  const theme = typeof current === "string" ? JSON.parse(current) : current;
  const next = { ...theme, fontHeading: FONT, fontBody: FONT };

  await knex("settings")
    .insert({ key: "theme", value: JSON.stringify(next) })
    .onConflict("key")
    .merge({ value: JSON.stringify(next), updated_at: knex.fn.now() });
}

export async function down(knex: Knex): Promise<void> {
  const row = await knex("settings").where({ key: "theme" }).first();
  if (!row) return;
  const current = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  await knex("settings")
    .where({ key: "theme" })
    .update({
      value: JSON.stringify({ ...current, fontHeading: "Poppins", fontBody: "Inter" }),
      updated_at: knex.fn.now(),
    });
}
