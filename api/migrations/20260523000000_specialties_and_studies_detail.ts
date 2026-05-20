import type { Knex } from "knex";

/**
 * 1) Inserta las especialidades faltantes (idempotente con onConflict.ignore).
 * 2) Enriquece las 3 páginas de Estudios con un bloque Cards listando los
 *    estudios particulares + un CTA con link de teléfono para reservas.
 *
 * Ambas cosas siguen siendo editables desde el admin (page builder + CRUD
 * de especialidades).
 */

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// 15 especialidades nuevas pedidas por el cliente. Las que ya estaban
// (Cardiología, Cirugía General, Dermatología, etc.) NO se duplican
// gracias al ON CONFLICT.IGNORE sobre el unique slug.
const NEW_SPECIALTIES: { name: string; description: string }[] = [
  { name: "Clínica médica", description: "Atención médica integral del adulto." },
  { name: "Coloproctología", description: "Diagnóstico y tratamiento de patologías del colon, recto y ano." },
  { name: "Diabetología", description: "Manejo integral de la diabetes y trastornos del metabolismo." },
  { name: "Hematología", description: "Diagnóstico y tratamiento de enfermedades de la sangre." },
  { name: "Infectología", description: "Atención especializada en enfermedades infecciosas." },
  { name: "Rehabilitación cardíaca", description: "Programa integral de recuperación cardiovascular." },
  { name: "Fisioterapia", description: "Rehabilitación física, kinesiología y terapia ocupacional." },
  { name: "Flebología", description: "Atención de patologías de las venas." },
  { name: "Geriatría", description: "Cuidado integral del adulto mayor." },
  { name: "Mastología", description: "Diagnóstico y tratamiento de patologías de la mama." },
  { name: "Odontología", description: "Atención odontológica general y especializada." },
  { name: "Nutrición", description: "Asesoramiento nutricional clínico y dietético." },
  { name: "Neonatología", description: "Cuidados al recién nacido sano y de riesgo." },
  { name: "Neurocirugía", description: "Cirugía del sistema nervioso central y periférico." },
  { name: "Psicología", description: "Atención psicológica integral para todas las edades." },
  // Ayuda espiritual no es una especialidad médica clásica, pero el cliente la pidió.
  { name: "Ayuda espiritual", description: "Acompañamiento espiritual y pastoral durante la atención médica." },
];

// Detalle de estudios por categoría. Slug de la página padre → cards.
const STUDIES_BY_PAGE: Record<string, { title: string; text: string }[]> = {
  "estudios-diagnostico-imagenes": [
    { title: "TAC", text: "Tomografía Axial Computada multicorte para diagnósticos de alta precisión." },
    { title: "Resonancia magnética", text: "Imágenes detalladas de tejidos blandos sin radiación ionizante." },
    { title: "Ecografía", text: "Estudios ecográficos generales abdominales, ginecológicos y de tiroides." },
    { title: "Ecografía 3D y 4D", text: "Ecografías obstétricas 3D y 4D para seguimiento del embarazo." },
    { title: "Mamografía", text: "Estudio mamográfico digital para diagnóstico precoz de cáncer de mama." },
    { title: "Rayos X (Radiología)", text: "Radiografías digitales generales y especializadas." },
    { title: "Densitometría", text: "Medición de la densidad ósea para diagnóstico de osteoporosis." },
  ],
  "estudios-laboratorio": [
    { title: "Análisis clínicos generales", text: "Hemogramas, bioquímica, perfiles hormonales y más." },
    { title: "Análisis bacteriológicos", text: "Cultivos, antibiogramas e identificación de microorganismos." },
    { title: "Biopsias (Anatomía patológica)", text: "Estudios histopatológicos con informes profesionales." },
  ],
  "estudios-cardiologicos": [
    { title: "Ecocardiograma Doppler", text: "Estudio ecográfico color del corazón." },
    { title: "Ecocardiografía transesofágica", text: "Estudio cardíaco de alta definición vía esófago." },
    { title: "Eco Doppler arterial y venoso periférico", text: "Estudio del flujo sanguíneo en miembros y vasos." },
    { title: "Ergometrías", text: "Prueba de esfuerzo en cinta o bicicleta." },
    { title: "Eco Estrés con ejercicio", text: "Eco realizada durante el esfuerzo físico." },
    { title: "Eco Estrés farmacológico", text: "Eco estrés con estímulo farmacológico." },
    { title: "MAPA", text: "Monitoreo Ambulatorio de Presión Arterial 24 horas." },
    { title: "Holter", text: "Monitoreo electrocardiográfico continuo de 24 horas." },
  ],
};

const RESERVA_CTA = {
  title: "Reservá tu turno",
  text: "Llamanos para coordinar la realización de tu estudio.",
  ctaLabel: "Llamar al +595 21 000 000",
  ctaHref: "tel:+59521000000",
};

export async function up(knex: Knex): Promise<void> {
  // ---- 1) Especialidades nuevas ----
  // Buscamos el order más alto existente para empujar las nuevas al final.
  const maxRow = await knex("specialties").max<{ max: number | null }[]>({ max: "order" });
  const startOrder = Number(maxRow?.[0]?.max ?? 0) + 1;

  for (let i = 0; i < NEW_SPECIALTIES.length; i++) {
    const sp = NEW_SPECIALTIES[i];
    await knex("specialties")
      .insert({
        slug: slug(sp.name),
        name: sp.name,
        description: sp.description,
        order: startOrder + i,
      })
      .onConflict("slug")
      .ignore();
  }

  // ---- 2) Enriquecer páginas de Estudios ----
  for (const [pageSlug, items] of Object.entries(STUDIES_BY_PAGE)) {
    const page = await knex("pages").where({ slug: pageSlug }).first("id");
    if (!page) continue;

    // ¿Ya hay un bloque Cards con título "Estudios disponibles"? Si sí, no
    // lo pisamos (idempotente para re-runs).
    const cardsBlocks = await knex("blocks").where({ page_id: page.id, type: "cards" });
    const alreadyHasDetail = cardsBlocks.some((b) => {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      return p?.heading === "Estudios disponibles";
    });

    const reservaBlocks = await knex("blocks").where({ page_id: page.id, type: "cta" });
    const alreadyHasReservaCta = reservaBlocks.some((b) => {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      return typeof p?.ctaHref === "string" && p.ctaHref.startsWith("tel:");
    });

    if (alreadyHasDetail && alreadyHasReservaCta) continue;

    // Tomamos el order más alto entre los bloques actuales y agregamos al final.
    const lastOrder = (await knex("blocks").where({ page_id: page.id }).max<{ max: number | null }[]>({ max: "order" }))[0]
      ?.max ?? 0;
    let nextOrder = Number(lastOrder) + 1;

    if (!alreadyHasDetail) {
      await knex("blocks").insert({
        page_id: page.id,
        type: "cards",
        order: nextOrder++,
        props: JSON.stringify({
          heading: "Estudios disponibles",
          columns: 3,
          items,
        }),
      });
    }

    if (!alreadyHasReservaCta) {
      await knex("blocks").insert({
        page_id: page.id,
        type: "cta",
        order: nextOrder++,
        props: JSON.stringify(RESERVA_CTA),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // 1) Borrar las especialidades creadas (si no tienen doctores asociados)
  const slugs = NEW_SPECIALTIES.map((s) => slug(s.name));
  await knex("specialties").whereIn("slug", slugs).del();

  // 2) Limpiar los bloques que agregamos a las páginas de Estudios
  for (const pageSlug of Object.keys(STUDIES_BY_PAGE)) {
    const page = await knex("pages").where({ slug: pageSlug }).first("id");
    if (!page) continue;
    const cards = await knex("blocks").where({ page_id: page.id, type: "cards" });
    for (const b of cards) {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      if (p?.heading === "Estudios disponibles") {
        await knex("blocks").where({ id: b.id }).del();
      }
    }
    const ctas = await knex("blocks").where({ page_id: page.id, type: "cta" });
    for (const b of ctas) {
      const p = typeof b.props === "string" ? JSON.parse(b.props) : b.props;
      if (typeof p?.ctaHref === "string" && p.ctaHref.startsWith("tel:")) {
        await knex("blocks").where({ id: b.id }).del();
      }
    }
  }
}
