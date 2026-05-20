import type { Knex } from "knex";

/**
 * Placeholder pages for service details that need client-specific photos,
 * staff information, schedules and phone numbers.
 *
 * Idempotent: pages are inserted with onConflict.ignore; blocks are only
 * created when the target page has no blocks, so admin-edited content is kept.
 */

interface ServiceDetailPage {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
  galleryLabel: string;
}

const PAGES: ServiceDetailPage[] = [
  {
    slug: "internacion",
    title: "Internación adultos y niños",
    subtitle: "Habitaciones y acompañamiento durante la estadía",
    html:
      "<p>Área destinada a la internación de pacientes adultos y pediátricos, con atención coordinada por el equipo médico y de enfermería.</p><p><strong>Contenido a completar por el cliente:</strong> fotos reales de habitaciones, amenities disponibles, normas para acompañantes, horarios de visita y recomendaciones para el ingreso.</p>",
    galleryLabel: "Fotos de habitaciones",
  },
  {
    slug: "uti",
    title: "Unidad de Terapia Intensiva",
    subtitle: "Cuidados críticos con monitoreo permanente",
    html:
      "<p>Unidad preparada para la atención de pacientes críticos que requieren monitoreo continuo y cuidados especializados.</p><p><strong>Contenido a completar por el cliente:</strong> staff responsable, horarios de visita para familiares, normas de ingreso, equipamiento disponible y canales de consulta.</p>",
    galleryLabel: "Fotos del área y staff de UTI",
  },
  {
    slug: "banco-de-sangre",
    title: "Banco de sangre",
    subtitle: "Donación, hemoterapia y procesamiento de hemocomponentes",
    html:
      "<p>Servicio orientado a la donación, conservación y uso seguro de sangre y hemocomponentes para pacientes que lo requieran.</p><p><strong>Contenido a completar por el cliente:</strong> staff del servicio, requisitos para donantes, horario de atención, teléfono dedicado y pasos para coordinar donaciones.</p>",
    galleryLabel: "Fotos del Banco de sangre y equipo",
  },
  {
    slug: "emergencias",
    title: "Emergencias 24hs",
    subtitle: "Guardia activa todos los días del año",
    html:
      "<p>Servicio de urgencias y emergencias disponible las 24 horas para la atención inicial de pacientes que requieren respuesta inmediata.</p><p><strong>Contenido a completar por el cliente:</strong> fotos del acceso de emergencias, equipo de guardia, indicaciones de ingreso, teléfono directo y cobertura horaria por especialidad.</p>",
    galleryLabel: "Fotos del acceso y equipo de emergencias",
  },
];

export async function up(knex: Knex): Promise<void> {
  const baseOrder = 300;

  for (let i = 0; i < PAGES.length; i++) {
    const page = PAGES[i];

    await knex("pages")
      .insert({
        slug: page.slug,
        title: page.title,
        status: "published",
        seo: JSON.stringify({ title: page.title, description: page.subtitle }),
        order: baseOrder + i,
      })
      .onConflict("slug")
      .ignore();

    const row = await knex("pages").where({ slug: page.slug }).first("id");
    if (!row) continue;

    const existing = await knex("blocks").where({ page_id: row.id }).count<{ c: number }[]>("id as c");
    if (Number(existing[0]?.c ?? 0) > 0) continue;

    await knex("blocks").insert([
      {
        page_id: row.id,
        type: "hero",
        order: 0,
        props: JSON.stringify({
          title: page.title,
          subtitle: page.subtitle,
          variant: "centered",
          imageUrl: "",
          overlay: 35,
        }),
      },
      {
        page_id: row.id,
        type: "richText",
        order: 1,
        props: JSON.stringify({ html: page.html }),
      },
      {
        page_id: row.id,
        type: "gallery",
        order: 2,
        props: JSON.stringify({
          columns: 3,
          images: [],
        }),
      },
      {
        page_id: row.id,
        type: "richText",
        order: 3,
        props: JSON.stringify({
          html: `<p><em>${page.galleryLabel}: cargar imágenes desde /admin/media y agregarlas a esta galería desde el editor de páginas.</em></p>`,
        }),
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex("pages").whereIn("slug", PAGES.map((p) => p.slug)).del();
}
