import type { Knex } from "knex";

/**
 * Crea páginas placeholder para los items del menú que todavía no tienen
 * contenido. Idempotente: usa onConflict.ignore() sobre el slug único.
 *
 * Las páginas se sirven en /:slug — usamos slugs flat (decisión del análisis):
 *   /samap, /samap-beneficios, /samap-asociate
 *   /estudios-diagnostico-imagenes, /estudios-laboratorio,
 *   /estudios-cardiologicos, /estudios-biopsias
 *   /convenios
 */

interface Placeholder {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
}

const PAGES: Placeholder[] = [
  {
    slug: "samap",
    title: "SAMAP",
    subtitle: "Sociedad Anónima de Medicina Adventista del Paraguay",
    intro:
      "<p>SAMAP es el sistema de medicina prepaga del Sanatorio Adventista de Asunción. Próximamente publicaremos información detallada sobre planes, coberturas y beneficios.</p>",
  },
  {
    slug: "samap-beneficios",
    title: "Beneficios SAMAP",
    subtitle: "Conocé las ventajas de ser asociado",
    intro:
      "<p>Listado completo de beneficios para nuestros asociados SAMAP: descuentos, atención prioritaria, planes familiares y más.</p><p><em>Contenido en preparación.</em></p>",
  },
  {
    slug: "samap-asociate",
    title: "Asociate a SAMAP",
    subtitle: "Sumate a nuestra comunidad de salud",
    intro:
      "<p>El proceso de afiliación es simple. Próximamente vas a poder iniciarlo en línea desde esta misma página.</p>",
  },
  {
    slug: "estudios-diagnostico-imagenes",
    title: "Diagnóstico por imágenes",
    subtitle: "Estudios de imagen médica de alta precisión",
    intro:
      "<p>Realizamos estudios de tomografía computada, resonancia magnética, ecografía y rayos X con equipamiento de última generación.</p>",
  },
  {
    slug: "estudios-laboratorio",
    title: "Laboratorio de análisis clínicos y bacteriológicos",
    subtitle: "Análisis clínicos con resultados confiables",
    intro:
      "<p>Nuestro laboratorio realiza estudios clínicos generales, bioquímicos, hematológicos y bacteriológicos, con resultados disponibles en tiempos óptimos.</p>",
  },
  {
    slug: "estudios-cardiologicos",
    title: "Estudios cardiológicos",
    subtitle: "Diagnóstico y seguimiento de la salud cardiovascular",
    intro:
      "<p>Electrocardiogramas, ergometrías, ecocardiogramas, holter de 24 hs y otros estudios cardiológicos especializados.</p>",
  },
  {
    slug: "estudios-biopsias",
    title: "Biopsias",
    subtitle: "Análisis histopatológico especializado",
    intro:
      "<p>Realizamos biopsias y análisis histopatológicos con informes profesionales en tiempos adecuados.</p>",
  },
  {
    slug: "convenios",
    title: "Convenios",
    subtitle: "Trabajamos con las principales obras sociales y empresas",
    intro:
      "<p>El Sanatorio Adventista de Asunción cuenta con convenios para brindar atención a afiliados de las principales aseguradoras y empresas del país.</p><p><em>Listado completo en preparación.</em></p>",
  },
];

export async function up(knex: Knex): Promise<void> {
  const baseOrder = 100; // muy alto para no interferir con las 9 páginas seed iniciales

  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];

    // Página (idempotente)
    await knex("pages")
      .insert({
        slug: p.slug,
        title: p.title,
        status: "published",
        seo: JSON.stringify({ title: p.title, description: p.subtitle }),
        order: baseOrder + i,
      })
      .onConflict("slug")
      .ignore();

    // Tomamos el id (existente o recién creado)
    const row = await knex("pages").where({ slug: p.slug }).first("id");
    if (!row) continue;

    // Si la página ya tenía bloques, no los pisamos (idempotencia)
    const existing = await knex("blocks").where({ page_id: row.id }).count<{ c: number }[]>("id as c");
    if (Number(existing[0]?.c ?? 0) > 0) continue;

    // Bloques placeholder: Hero + RichText + CTA al contacto
    await knex("blocks").insert([
      {
        page_id: row.id,
        type: "hero",
        order: 0,
        props: JSON.stringify({
          title: p.title,
          subtitle: p.subtitle,
          variant: "centered",
        }),
      },
      {
        page_id: row.id,
        type: "richText",
        order: 1,
        props: JSON.stringify({ html: p.intro }),
      },
      {
        page_id: row.id,
        type: "cta",
        order: 2,
        props: JSON.stringify({
          title: "¿Necesitás más información?",
          text: "Escribinos y un asesor se va a contactar con vos.",
          ctaLabel: "Contactanos",
          ctaHref: "/contacto",
        }),
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  const slugs = PAGES.map((p) => p.slug);
  // CASCADE elimina blocks por la FK
  await knex("pages").whereIn("slug", slugs).del();
}
