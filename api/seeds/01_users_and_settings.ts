import "dotenv/config";
import type { Knex } from "knex";
import bcrypt from "bcryptjs";

// Embed clásico de Google Maps que NO requiere API key — funciona con
// la URL legacy https://www.google.com/maps?q=...&output=embed
// El admin puede reemplazarlo desde /admin/settings con el iframe que da
// Google al hacer "Compartir → Insertar mapa" (formato /maps/embed?pb=...).
const SANATORIO_MAP_EMBED =
  '<iframe src="https://www.google.com/maps?q=Sanatorio+Adventista+Asunci%C3%B3n,Silvio+Pettirossi+380,Asunci%C3%B3n,Paraguay&hl=es&z=17&output=embed" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';

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
      // Lineamientos de marca Adventist Health
      primary: "#005587",   // Pantone 7462 C
      secondary: "#00B5DA", // Pantone 311 C
      accent: "#f5543f",
      bg: "#ffffff",
      text: "#1a1a1a",
      fontHeading: "Work Sans",
      fontBody: "Open Sans",
      radius: "0.5rem",
    },
    contact: {
      address: "Silvio Pettirossi 380 c/ Pai Pérez, Asunción, Paraguay",
      phones: ["+595 21 000 000"],
      email: "contacto@sanatorioadventista.com.py",
      whatsapp: "+595981000000",
      hours: "Lunes a Viernes 7:00 - 19:00 | Sábados 8:00 - 12:00",
      mapEmbed: SANATORIO_MAP_EMBED,
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
