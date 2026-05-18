import "dotenv/config";
import type { Knex } from "knex";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  await knex("users").del();
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@sanatorio.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador";
  const hash = await bcrypt.hash(password, 10);
  await knex("users").insert({ email, password_hash: hash, name, role: "superadmin" });

  await knex("settings").del();
  const settings: Record<string, unknown> = {
    brand: {
      name: "Sanatorio Adventista de Asunción",
      tagline: "Cuidamos tu salud con vocación de servicio",
      logoUrl: "",
      faviconUrl: "",
    },
    theme: {
      primary: "#004884",
      secondary: "#00bcd1",
      accent: "#f5543f",
      bg: "#ffffff",
      text: "#1a1a1a",
      fontHeading: "Open Sans",
      fontBody: "Open Sans",
      radius: "0.5rem",
    },
    contact: {
      address: "Asunción, Paraguay",
      phones: ["+595 21 000 000"],
      email: "contacto@sanatorioadventista.com.py",
      whatsapp: "+595981000000",
      hours: "Lunes a Viernes 7:00 - 19:00 | Sábados 8:00 - 12:00",
      mapEmbed:
        '<iframe src="https://www.google.com/maps/embed?pb=" width="100%" height="400" style="border:0;" allowfullscreen loading="lazy"></iframe>',
    },
    social: {
      facebook: "https://facebook.com/",
      instagram: "https://instagram.com/",
      youtube: "",
      linkedin: "",
    },
    seo: {
      title: "Sanatorio Adventista de Asunción",
      description:
        "Sanatorio Adventista de Asunción — atención médica integral con valores cristianos.",
      ogImage: "",
    },
    scripts: { head: "", bodyEnd: "" },
  };
  for (const [key, value] of Object.entries(settings)) {
    await knex("settings").insert({ key, value: JSON.stringify(value) });
  }

  await knex("menus").del();
  await knex("menus").insert([
    {
      location: "header",
      items: JSON.stringify([
        { label: "Inicio", href: "/" },
        { label: "Institucional", href: "/institucional" },
        { label: "Especialidades", href: "/especialidades" },
        { label: "Profesionales", href: "/profesionales" },
        { label: "Servicios", href: "/servicios" },
        { label: "Estudios", href: "/estudios" },
        { label: "Noticias", href: "/noticias" },
        { label: "Contacto", href: "/contacto" },
      ]),
    },
    {
      location: "footer",
      items: JSON.stringify([
        { label: "Solicitar turno", href: "/turnos" },
        { label: "Trabajá con nosotros", href: "/contacto" },
        { label: "Política de privacidad", href: "/privacidad" },
      ]),
    },
  ]);
}
