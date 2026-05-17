import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("services").del();
  await knex("services").insert([
    { slug: "internacion", name: "Internación", icon: "bed", description: "Habitaciones individuales con confort hotelero.", order: 0 },
    { slug: "emergencias", name: "Emergencias 24hs", icon: "ambulance", description: "Guardia activa las 24 horas.", order: 1 },
    { slug: "cirugia", name: "Cirugía", icon: "stethoscope", description: "Quirófanos equipados con tecnología de última generación.", order: 2 },
    { slug: "consultorios", name: "Consultorios externos", icon: "clipboard", description: "Atención ambulatoria multidisciplinaria.", order: 3 },
    { slug: "maternidad", name: "Maternidad", icon: "baby", description: "Atención integral a la madre y al recién nacido.", order: 4 },
    { slug: "uti", name: "Terapia Intensiva", icon: "heart-pulse", description: "Unidad de cuidados intensivos adultos y pediátricos.", order: 5 },
  ]);

  await knex("studies").del();
  await knex("studies").insert([
    { slug: "laboratorio", name: "Laboratorio clínico", description: "Análisis clínicos y bioquímicos.", order: 0 },
    { slug: "ecografias", name: "Ecografías", description: "Estudios ecográficos generales y especializados.", order: 1 },
    { slug: "tomografia", name: "Tomografía", description: "Tomografía computada multicorte.", order: 2 },
    { slug: "resonancia", name: "Resonancia magnética", description: "Estudios de RM de alta definición.", order: 3 },
    { slug: "rayos-x", name: "Rayos X", description: "Radiografías digitales.", order: 4 },
    { slug: "endoscopia", name: "Endoscopía", description: "Estudios endoscópicos digestivos.", order: 5 },
  ]);

  await knex("blocks").del();
  await knex("pages").del();

  const insertPage = async (
    slug: string,
    title: string,
    blocks: { type: string; props: unknown }[],
    order = 0,
  ) => {
    const [pageId] = await knex("pages").insert({
      slug,
      title,
      status: "published",
      seo: JSON.stringify({ title, description: title }),
      order,
    });
    for (let i = 0; i < blocks.length; i++) {
      await knex("blocks").insert({
        page_id: pageId,
        type: blocks[i].type,
        props: JSON.stringify(blocks[i].props),
        order: i,
      });
    }
  };

  await insertPage("home", "Inicio", [
    {
      type: "hero",
      props: {
        title: "Sanatorio Adventista de Asunción",
        subtitle: "Atención médica integral con vocación de servicio",
        variant: "centered",
        ctaLabel: "Solicitar turno",
        ctaHref: "/turnos",
      },
    },
    { type: "specialtyGrid", props: { columns: 4, showCount: 8 } },
    { type: "serviceGrid", props: { columns: 3, showCount: 6 } },
    {
      type: "cta",
      props: {
        title: "Emergencias 24hs",
        text: "Estamos para vos las 24 horas, los 365 días del año.",
        ctaLabel: "Ver contacto",
        ctaHref: "/contacto",
      },
    },
    { type: "newsGrid", props: { limit: 3, columns: 3 } },
  ], 0);

  await insertPage("institucional", "Institucional", [
    { type: "hero", props: { title: "Nosotros", subtitle: "Una institución al servicio de la salud", variant: "left" } },
    { type: "richText", props: { html: "<p>El Sanatorio Adventista de Asunción brinda atención médica integral con valores cristianos desde hace décadas.</p>" } },
    { type: "stats", props: { items: [{ value: "50+", label: "Años de servicio" }, { value: "90+", label: "Profesionales" }, { value: "24/7", label: "Emergencias" }] } },
  ], 1);

  await insertPage("especialidades", "Especialidades", [
    { type: "hero", props: { title: "Especialidades médicas", variant: "centered" } },
    { type: "specialtyGrid", props: { columns: 4 } },
  ], 2);

  await insertPage("profesionales", "Profesionales", [
    { type: "hero", props: { title: "Guía médica", subtitle: "Encontrá a tu profesional", variant: "centered" } },
    { type: "doctorList", props: { showSearch: true } },
  ], 3);

  await insertPage("servicios", "Servicios", [
    { type: "hero", props: { title: "Servicios", variant: "centered" } },
    { type: "serviceGrid", props: { columns: 3 } },
  ], 4);

  await insertPage("estudios", "Estudios", [
    { type: "hero", props: { title: "Estudios y diagnósticos", variant: "centered" } },
    { type: "studyGrid", props: { columns: 3 } },
  ], 5);

  await insertPage("noticias", "Noticias", [
    { type: "hero", props: { title: "Noticias", variant: "centered" } },
    { type: "newsGrid", props: { limit: 12, columns: 3 } },
  ], 6);

  await insertPage("contacto", "Contacto", [
    { type: "hero", props: { title: "Contacto", variant: "centered" } },
    { type: "contactForm", props: { heading: "Escribinos", showPhone: true } },
    { type: "mapEmbed", props: { embedHtml: "", height: 400 } },
  ], 7);

  await insertPage("turnos", "Solicitar turno", [
    { type: "hero", props: { title: "Solicitar turno", variant: "centered" } },
    { type: "appointmentForm", props: { heading: "Reservá tu turno" } },
  ], 8);
}
