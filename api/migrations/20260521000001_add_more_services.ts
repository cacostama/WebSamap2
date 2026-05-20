import type { Knex } from "knex";

/**
 * Agrega 6 servicios nuevos a la grilla del home/servicios:
 *   Fisioterapia, Diagnóstico por imágenes, Laboratorio, Banco de sangre,
 *   Comedor ovo lacto vegetariano, Seguro médico SAMAP.
 *
 * Idempotente: onConflict.ignore sobre el slug único.
 */

const SERVICES = [
  {
    slug: "fisioterapia",
    name: "Fisioterapia",
    icon: "activity",
    description: "Rehabilitación física, kinesiología y terapia ocupacional.",
  },
  {
    slug: "diagnostico-por-imagenes",
    name: "Diagnóstico por imágenes",
    icon: "scan",
    description: "Tomografía, resonancia magnética, ecografías y radiografías.",
  },
  {
    slug: "laboratorio",
    name: "Laboratorio",
    icon: "flask",
    description: "Análisis clínicos generales y especializados.",
  },
  {
    slug: "banco-de-sangre",
    name: "Banco de sangre",
    icon: "droplet",
    description: "Donación, hemoterapia y procesamiento de hemocomponentes.",
  },
  {
    slug: "comedor-ovo-lacto-vegetariano",
    name: "Comedor ovo lacto vegetariano",
    icon: "leaf",
    description:
      "Alimentación saludable basada en principios adventistas, abierta a pacientes, familiares y comunidad.",
  },
  {
    slug: "seguro-medico-samap",
    name: "Seguro médico SAMAP",
    icon: "shield",
    description:
      "Sistema de medicina prepaga propio del Sanatorio Adventista del Paraguay.",
  },
];

export async function up(knex: Knex): Promise<void> {
  // Empezamos en order=10 para quedar después de los 6 servicios seed (order 0-5)
  const baseOrder = 10;
  await knex("services")
    .insert(
      SERVICES.map((s, i) => ({
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        description: s.description,
        order: baseOrder + i,
      })),
    )
    .onConflict("slug")
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex("services").whereIn("slug", SERVICES.map((s) => s.slug)).del();
}
