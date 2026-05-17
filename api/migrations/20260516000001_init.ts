import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("email", 191).notNullable().unique();
    t.string("password_hash", 255).notNullable();
    t.string("name", 191).notNullable();
    t.enu("role", ["superadmin", "editor"]).notNullable().defaultTo("editor");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("settings", (t) => {
    t.string("key", 64).primary();
    t.json("value").notNullable();
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("pages", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("title", 255).notNullable();
    t.enu("status", ["draft", "published"]).notNullable().defaultTo("draft");
    t.json("seo").nullable();
    t.integer("order").notNullable().defaultTo(0);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("blocks", (t) => {
    t.increments("id").primary();
    t.integer("page_id").unsigned().notNullable().references("id").inTable("pages").onDelete("CASCADE");
    t.string("type", 64).notNullable();
    t.json("props").notNullable();
    t.integer("order").notNullable().defaultTo(0);
    t.index(["page_id", "order"]);
  });

  await knex.schema.createTable("specialties", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("name", 191).notNullable();
    t.string("icon", 64).nullable();
    t.text("description").nullable();
    t.integer("order").notNullable().defaultTo(0);
  });

  await knex.schema.createTable("doctors", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("name", 191).notNullable();
    t.string("photo_url", 500).nullable();
    t.text("bio").nullable();
    t.json("schedule").nullable();
    t.integer("order").notNullable().defaultTo(0);
  });

  await knex.schema.createTable("doctor_specialty", (t) => {
    t.integer("doctor_id").unsigned().notNullable().references("id").inTable("doctors").onDelete("CASCADE");
    t.integer("specialty_id").unsigned().notNullable().references("id").inTable("specialties").onDelete("CASCADE");
    t.primary(["doctor_id", "specialty_id"]);
  });

  await knex.schema.createTable("services", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("name", 191).notNullable();
    t.string("icon", 64).nullable();
    t.text("description").nullable();
    t.text("body").nullable();
    t.integer("order").notNullable().defaultTo(0);
  });

  await knex.schema.createTable("studies", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("name", 191).notNullable();
    t.text("description").nullable();
    t.text("body").nullable();
    t.integer("order").notNullable().defaultTo(0);
  });

  await knex.schema.createTable("news", (t) => {
    t.increments("id").primary();
    t.string("slug", 191).notNullable().unique();
    t.string("title", 255).notNullable();
    t.string("excerpt", 500).nullable();
    t.text("body", "mediumtext").notNullable();
    t.string("cover_url", 500).nullable();
    t.timestamp("published_at").nullable();
    t.enu("status", ["draft", "published"]).notNullable().defaultTo("draft");
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("menus", (t) => {
    t.increments("id").primary();
    t.enu("location", ["header", "footer"]).notNullable().unique();
    t.json("items").notNullable();
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("appointments", (t) => {
    t.increments("id").primary();
    t.string("name", 191).notNullable();
    t.string("phone", 64).notNullable();
    t.string("email", 191).notNullable();
    t.integer("specialty_id").unsigned().nullable().references("id").inTable("specialties").onDelete("SET NULL");
    t.integer("doctor_id").unsigned().nullable().references("id").inTable("doctors").onDelete("SET NULL");
    t.timestamp("preferred_at").nullable();
    t.text("message").nullable();
    t.enu("status", ["pendiente", "confirmado", "cancelado"]).notNullable().defaultTo("pendiente");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("contact_messages", (t) => {
    t.increments("id").primary();
    t.string("name", 191).notNullable();
    t.string("email", 191).notNullable();
    t.string("phone", 64).nullable();
    t.text("message").notNullable();
    t.enu("status", ["nuevo", "leido", "respondido"]).notNullable().defaultTo("nuevo");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("media", (t) => {
    t.increments("id").primary();
    t.string("url", 500).notNullable();
    t.string("mime", 64).notNullable();
    t.integer("size").unsigned().notNullable();
    t.string("alt", 255).nullable();
    t.integer("uploaded_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("media");
  await knex.schema.dropTableIfExists("contact_messages");
  await knex.schema.dropTableIfExists("appointments");
  await knex.schema.dropTableIfExists("menus");
  await knex.schema.dropTableIfExists("news");
  await knex.schema.dropTableIfExists("studies");
  await knex.schema.dropTableIfExists("services");
  await knex.schema.dropTableIfExists("doctor_specialty");
  await knex.schema.dropTableIfExists("doctors");
  await knex.schema.dropTableIfExists("specialties");
  await knex.schema.dropTableIfExists("blocks");
  await knex.schema.dropTableIfExists("pages");
  await knex.schema.dropTableIfExists("settings");
  await knex.schema.dropTableIfExists("users");
}
