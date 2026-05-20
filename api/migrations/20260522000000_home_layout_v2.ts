import type { Knex } from "knex";

/**
 * Ajustes al home y al footer pedidos por el cliente:
 *
 *  1. CTA "Emergencias 24hs" ya no apunta a /contacto → ahora "Cómo llegar"
 *     con link a Google Maps del Sanatorio Adventista de Asunción.
 *  2. Quitar el bloque newsGrid del home (sección "Noticias" molesta).
 *  3. Agregar un bloque cards con campañas: Octubre Rosa, Noviembre Azul,
 *     Promociones.
 *  4. Tagline de marca: "Honrando la vida".
 *
 * Idempotente: chequea estado actual antes de modificar.
 */

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Sanatorio+Adventista+Asunci%C3%B3n+Paraguay";

const CAMPAIGNS = {
  type: "cards",
  props: {
    heading: "Campañas y promociones",
    columns: 3,
    items: [
      {
        title: "Octubre Rosa",
        text: "Mes de concientización sobre el cáncer de mama. Estudios y controles a precios especiales durante todo octubre.",
        href: "/estudios-diagnostico-imagenes",
      },
      {
        title: "Noviembre Azul",
        text: "Mes de la salud del hombre. Chequeos preventivos y estudios urológicos con descuentos especiales.",
        href: "/estudios-laboratorio",
      },
      {
        title: "Promociones",
        text: "Conocé todas las promociones vigentes en nuestros estudios y servicios médicos.",
        href: "/contacto",
      },
    ],
  },
};

export async function up(knex: Knex): Promise<void> {
  // ---- 1 + 2 + 3: ajustes a los bloques del home -----------------------
  const home = await knex("pages").where({ slug: "home" }).first("id");
  if (home) {
    const blocks = await knex("blocks").where({ page_id: home.id }).orderBy("order");

    // 1. Actualizar el CTA "Emergencias 24hs" → "Cómo llegar"
    const cta = blocks.find((b) => b.type === "cta");
    if (cta) {
      const props = typeof cta.props === "string" ? JSON.parse(cta.props) : cta.props;
      const updated = {
        ...props,
        title: "Emergencias 24hs",
        text: "Estamos para vos las 24 horas, los 365 días del año.",
        ctaLabel: "Cómo llegar",
        ctaHref: MAPS_URL,
      };
      await knex("blocks").where({ id: cta.id }).update({ props: JSON.stringify(updated) });
    }

    // 2. Eliminar el bloque newsGrid
    await knex("blocks").where({ page_id: home.id, type: "newsGrid" }).del();

    // 3. Agregar Cards con campañas si no existe ya
    const hasCampaigns = (
      await knex("blocks").where({ page_id: home.id, type: "cards" })
    ).some((b) => {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      return p?.heading === CAMPAIGNS.props.heading;
    });
    if (!hasCampaigns) {
      // Lo insertamos justo después del CTA (o al final si no hay CTA)
      const all = await knex("blocks").where({ page_id: home.id }).orderBy("order");
      const ctaIdx = all.findIndex((b) => b.type === "cta");
      const insertAfter = ctaIdx >= 0 ? all[ctaIdx].order : (all[all.length - 1]?.order ?? 0);

      // Empujar los bloques posteriores +1
      await knex("blocks")
        .where({ page_id: home.id })
        .andWhere("order", ">", insertAfter)
        .increment("order", 1);

      await knex("blocks").insert({
        page_id: home.id,
        type: CAMPAIGNS.type,
        order: insertAfter + 1,
        props: JSON.stringify(CAMPAIGNS.props),
      });
    }
  }

  // ---- 4: tagline "Honrando la vida" -----------------------------------
  const brandRow = await knex("settings").where({ key: "brand" }).first();
  if (brandRow) {
    const current = typeof brandRow.value === "string" ? JSON.parse(brandRow.value) : brandRow.value;
    const next = { ...current, tagline: "Honrando la vida" };
    await knex("settings")
      .where({ key: "brand" })
      .update({ value: JSON.stringify(next), updated_at: knex.fn.now() });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revertir tagline
  const brandRow = await knex("settings").where({ key: "brand" }).first();
  if (brandRow) {
    const current = typeof brandRow.value === "string" ? JSON.parse(brandRow.value) : brandRow.value;
    const next = { ...current, tagline: "Cuidamos tu salud con vocación de servicio" };
    await knex("settings")
      .where({ key: "brand" })
      .update({ value: JSON.stringify(next), updated_at: knex.fn.now() });
  }

  // Revertir CTA del home
  const home = await knex("pages").where({ slug: "home" }).first("id");
  if (home) {
    const cta = await knex("blocks").where({ page_id: home.id, type: "cta" }).first();
    if (cta) {
      const props = typeof cta.props === "string" ? JSON.parse(cta.props) : cta.props;
      const reverted = {
        ...props,
        title: "Emergencias 24hs",
        text: "Estamos para vos las 24 horas, los 365 días del año.",
        ctaLabel: "Ver contacto",
        ctaHref: "/contacto",
      };
      await knex("blocks").where({ id: cta.id }).update({ props: JSON.stringify(reverted) });
    }

    // Borrar el bloque de campañas que insertamos
    const cards = await knex("blocks").where({ page_id: home.id, type: "cards" });
    for (const b of cards) {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      if (p?.heading === CAMPAIGNS.props.heading) {
        await knex("blocks").where({ id: b.id }).del();
      }
    }
  }
}
