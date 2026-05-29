import type { Knex } from "knex";

/**
 * Lista completa de estudios (laboratorio + imágenes):
 * 1) Agrega columna `category` a `studies` ("laboratorio" | "imagenes").
 * 2) Backfill best-effort de las categorías para los estudios del seed inicial.
 * 3) Activa la agrupación por categoría + SEO en la página pública /estudios.
 * 4) Mueve el ítem "Estudios" del menú header al footer (no hace falta arriba,
 *    pero sí accesible e indexable). Preserva el resto de la personalización.
 *
 * Todo sigue siendo editable desde el admin (CRUD de estudios, page builder,
 * editor de menús). Idempotente: no pisa categorías ya cargadas por el cliente.
 */

const IMAGING_SLUGS = ["ecografias", "tomografia", "resonancia", "rayos-x", "endoscopia"];

export async function up(knex: Knex): Promise<void> {
  const hasCategory = await knex.schema.hasColumn("studies", "category");
  if (!hasCategory) {
    await knex.schema.alterTable("studies", (t) => {
      t.string("category", 32).nullable();
    });
  }

  // Backfill best-effort por slug conocido, solo donde aún no hay categoría.
  await knex("studies").whereNull("category").where({ slug: "laboratorio" }).update({ category: "laboratorio" });
  await knex("studies").whereNull("category").whereIn("slug", IMAGING_SLUGS).update({ category: "imagenes" });

  // Activar agrupación en el bloque studyGrid de la página /estudios.
  const estudios = await knex("pages").where({ slug: "estudios" }).first();
  if (estudios) {
    const blocks = await knex("blocks").where({ page_id: estudios.id, type: "studyGrid" });
    for (const b of blocks) {
      let props: any = {};
      try { props = typeof b.props === "string" ? JSON.parse(b.props) : (b.props ?? {}); } catch { props = {}; }
      props.grouped = true;
      delete props.showCount; // queremos la lista completa
      await knex("blocks").where({ id: b.id }).update({ props: JSON.stringify(props) });
    }

    // Mejorar el SEO de la página (sin pisar si el cliente ya lo personalizó).
    let seo: any = {};
    try { seo = typeof estudios.seo === "string" ? JSON.parse(estudios.seo) : (estudios.seo ?? {}); } catch { seo = {}; }
    if (!seo.description || seo.description === estudios.title) {
      seo.title = seo.title || "Estudios y diagnósticos";
      seo.description =
        "Lista completa de estudios del Sanatorio Adventista de Asunción: laboratorio clínico y estudios por imágenes (ecografías, tomografía, resonancia, rayos X y más).";
      await knex("pages").where({ id: estudios.id }).update({ seo: JSON.stringify(seo) });
    }
  }

  // Mover "Estudios" del header al footer.
  const header = await knex("menus").where({ location: "header" }).first();
  const footer = await knex("menus").where({ location: "footer" }).first();
  const parse = (v: any): any[] => {
    try { return typeof v === "string" ? JSON.parse(v) : (v ?? []); } catch { return []; }
  };

  if (header) {
    const items = parse(header.items);
    const next = items.filter((i: any) => i?.href !== "/estudios");
    if (next.length !== items.length) {
      await knex("menus").where({ location: "header" }).update({ items: JSON.stringify(next) });
    }
  }
  if (footer) {
    const items = parse(footer.items);
    if (!items.some((i: any) => i?.href === "/estudios")) {
      items.push({ label: "Estudios", href: "/estudios" });
      await knex("menus").where({ location: "footer" }).update({ items: JSON.stringify(items) });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCategory = await knex.schema.hasColumn("studies", "category");
  if (hasCategory) {
    await knex.schema.alterTable("studies", (t) => {
      t.dropColumn("category");
    });
  }
}
