import type { Knex } from "knex";

/**
 * Crea las 10 páginas placeholder del nuevo menú "Pacientes":
 *
 *   Pacientes
 *   ├── Atención al paciente
 *   ├── Info (sub-dropdown)
 *   │   ├── Horario visitas
 *   │   ├── Horario recepción
 *   │   ├── Horarios recepción de estudios
 *   │   ├── Reglamento para visitas
 *   │   ├── Reserva de turnos (linkea a /turnos existente)
 *   │   └── Preparación para estudios
 *   └── Portal del paciente (sub-dropdown, contenido futuro)
 *       ├── Resultados estudios diagnósticos
 *       ├── Resultados laboratorio
 *       ├── Presupuesto cirugías
 *       └── Facturación electrónica
 *
 * Idempotente: onConflict.ignore sobre slug; si la página ya tiene bloques no los pisa.
 */

interface Placeholder {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  /** Si está, agregamos un bloque de tipo dado al final del placeholder */
  extra?: "appointmentForm" | "contactForm" | "doctorList";
}

const PAGES: Placeholder[] = [
  {
    slug: "atencion-al-paciente",
    title: "Atención al paciente",
    subtitle: "Estamos para acompañarte en cada momento",
    intro:
      "<p>El equipo de Atención al Paciente está disponible para escucharte, orientarte y ayudarte a resolver cualquier consulta sobre tu estadía o atención en el Sanatorio Adventista de Asunción.</p>",
    extra: "contactForm",
  },
  {
    slug: "info-horario-visitas",
    title: "Horario de visitas",
    subtitle: "Horarios y normas para visitar pacientes",
    intro:
      "<p>Las visitas a pacientes internados se realizan en horarios pautados que respetan el descanso y la recuperación.</p><p><strong>Horario general:</strong> 14:00 - 19:00 hs.</p><p><em>Áreas críticas (UTI/UCO) tienen horarios especiales — consultar al ingreso.</em></p>",
  },
  {
    slug: "info-horario-recepcion",
    title: "Horario de recepción",
    subtitle: "Atención administrativa y consultas externas",
    intro:
      "<p><strong>Lunes a Viernes:</strong> 7:00 - 19:00 hs.</p><p><strong>Sábados:</strong> 8:00 - 12:00 hs.</p><p>Para emergencias, nuestra guardia atiende las 24 horas, los 365 días del año.</p>",
  },
  {
    slug: "info-horarios-estudios",
    title: "Horarios de recepción de estudios",
    subtitle: "Cuándo retirar resultados",
    intro:
      "<p>Los resultados de estudios pueden retirarse en recepción presentando el comprobante de orden.</p><p><strong>Retiros:</strong> Lunes a Viernes 8:00 - 18:00 hs · Sábados 8:00 - 12:00 hs.</p><p>Próximamente vas a poder descargarlos online desde el <em>Portal del paciente</em>.</p>",
  },
  {
    slug: "info-reglamento-visitas",
    title: "Reglamento para visitas",
    subtitle: "Normas para el bienestar de todos los pacientes",
    intro:
      "<ul><li>Máximo 2 visitas por paciente a la vez.</li><li>No se permite el ingreso de menores de 12 años a habitaciones, salvo autorización médica.</li><li>Mantener un tono de voz bajo, respetando el descanso de otros pacientes.</li><li>Está prohibido fumar dentro de las instalaciones.</li><li>No traer alimentos sin autorización del personal médico.</li></ul>",
  },
  {
    slug: "info-preparacion-estudios",
    title: "Preparación para estudios",
    subtitle: "Indicaciones previas según el estudio",
    intro:
      "<p>La correcta preparación es clave para obtener resultados confiables. Las indicaciones varían según el estudio: ayuno, hidratación, suspensión de medicación, etc.</p><p>Consultá con tu médico o con nuestro laboratorio antes de cada estudio. Próximamente vas a encontrar acá las indicaciones detalladas por tipo de estudio.</p>",
  },
  {
    slug: "portal-resultados-diagnostico",
    title: "Resultados de estudios diagnósticos",
    subtitle: "Próximamente — Portal del paciente",
    intro:
      "<p>Estamos desarrollando un portal donde vas a poder consultar y descargar los resultados de tus estudios diagnósticos (imágenes, electrocardiogramas, etc.) las 24 horas.</p><p><em>Esta funcionalidad estará disponible próximamente.</em></p>",
  },
  {
    slug: "portal-resultados-laboratorio",
    title: "Resultados de laboratorio",
    subtitle: "Próximamente — Portal del paciente",
    intro:
      "<p>Vas a poder acceder a tus análisis clínicos de forma segura desde cualquier dispositivo.</p><p><em>Esta funcionalidad estará disponible próximamente.</em></p>",
  },
  {
    slug: "portal-presupuestos-cirugia",
    title: "Presupuestos de cirugía",
    subtitle: "Próximamente — Portal del paciente",
    intro:
      "<p>Consultá presupuestos detallados de procedimientos quirúrgicos antes de tu internación.</p><p><em>Esta funcionalidad estará disponible próximamente.</em></p>",
  },
  {
    slug: "portal-facturacion-electronica",
    title: "Facturación electrónica",
    subtitle: "Próximamente — Portal del paciente",
    intro:
      "<p>Vas a poder consultar y descargar tus facturas electrónicas en formato PDF/XML.</p><p><em>Esta funcionalidad estará disponible próximamente.</em></p>",
  },
];

export async function up(knex: Knex): Promise<void> {
  const baseOrder = 200; // por encima de las anteriores

  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];

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

    const row = await knex("pages").where({ slug: p.slug }).first("id");
    if (!row) continue;

    const existing = await knex("blocks").where({ page_id: row.id }).count<{ c: number }[]>("id as c");
    if (Number(existing[0]?.c ?? 0) > 0) continue;

    const blocks: { type: string; order: number; props: any }[] = [
      {
        type: "hero",
        order: 0,
        props: { title: p.title, subtitle: p.subtitle, variant: "centered" },
      },
      {
        type: "richText",
        order: 1,
        props: { html: p.intro },
      },
    ];

    if (p.extra === "appointmentForm") {
      blocks.push({
        type: "appointmentForm",
        order: 2,
        props: { heading: "Solicitar turno" },
      });
    } else if (p.extra === "contactForm") {
      blocks.push({
        type: "contactForm",
        order: 2,
        props: { heading: "Contactanos", showPhone: true },
      });
    } else if (p.extra === "doctorList") {
      blocks.push({
        type: "doctorList",
        order: 2,
        props: { showSearch: false, limit: 12 },
      });
    } else {
      blocks.push({
        type: "cta",
        order: 2,
        props: {
          title: "¿Necesitás más información?",
          text: "Escribinos y un asesor se va a contactar con vos.",
          ctaLabel: "Contactanos",
          ctaHref: "/contacto",
        },
      });
    }

    await knex("blocks").insert(
      blocks.map((b) => ({
        page_id: row.id,
        type: b.type,
        order: b.order,
        props: JSON.stringify(b.props),
      })),
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex("pages").whereIn("slug", PAGES.map((p) => p.slug)).del();
}
