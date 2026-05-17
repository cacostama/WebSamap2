/**
 * Parsea la Guía Médica de websamapAsu y produce:
 *   assets-extracted/data/doctors.json       [{name, specialties:[...]}]
 *   assets-extracted/data/specialties.json   ["Cardiología", ...]
 *
 * El seed de Knex consumirá estos JSON.
 *
 *   pnpm extract:doctors
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { load } from "cheerio";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const SRC_DIR = join(ROOT, "websamapAsu");
const OUT_DATA = join(ROOT, "assets-extracted", "data");

interface DoctorOut {
  name: string;
  specialties: string[];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  await mkdir(OUT_DATA, { recursive: true });

  const files = (await readdir(SRC_DIR)).filter((f) =>
    f.toLowerCase().includes("gu") && f.toLowerCase().endsWith(".html"),
  );

  if (files.length === 0) {
    console.warn("No se encontró archivo de Guía Médica en websamapAsu/");
    return;
  }

  const html = await readFile(join(SRC_DIR, files[0]), "utf8");
  const $ = load(html);

  const doctors: DoctorOut[] = [];
  const specialtySet = new Set<string>();

  // Heurística: las guías médicas suelen listar pares <especialidad / médico>
  // ya sea en <table> o en bloques con clases tipo "doctor" / "especialidad".
  // Recorremos texto plano buscando patrones "Dr. / Dra. <Nombre>".
  const text = $("body").text();
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  let currentSpec: string | null = null;
  const specHeading = /^(?:[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\-\s]{3,})$/;
  const drLine = /^(Dr\.?|Dra\.?|Lic\.?)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ.\s,]+)$/;

  for (const line of lines) {
    const drm = line.match(drLine);
    if (drm) {
      const name = `${drm[1]} ${drm[2].trim()}`.replace(/\s+/g, " ");
      if (currentSpec) specialtySet.add(currentSpec);
      const existing = doctors.find((d) => d.name === name);
      if (existing) {
        if (currentSpec && !existing.specialties.includes(currentSpec)) {
          existing.specialties.push(currentSpec);
        }
      } else {
        doctors.push({ name, specialties: currentSpec ? [currentSpec] : [] });
      }
    } else if (specHeading.test(line) && line.length < 60 && !/sanatorio/i.test(line)) {
      currentSpec = line.replace(/\s+/g, " ").trim();
    }
  }

  // Fallback si las heurísticas fallan: extraer al menos los nombres de doctores
  if (doctors.length === 0) {
    const matches = text.match(/(Dr\.?|Dra\.?)\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s.,]{3,60}/g);
    if (matches) {
      for (const m of matches) {
        const name = m.replace(/\s+/g, " ").trim();
        if (!doctors.find((d) => d.name === name)) {
          doctors.push({ name, specialties: [] });
        }
      }
    }
  }

  // Especialidades base por si la heurística falla
  const baseSpecialties = [
    "Cardiología",
    "Pediatría",
    "Ginecología y Obstetricia",
    "Traumatología",
    "Neurología",
    "Oftalmología",
    "Otorrinolaringología",
    "Urología",
    "Dermatología",
    "Endocrinología",
    "Gastroenterología",
    "Nefrología",
    "Neumología",
    "Oncología",
    "Psiquiatría",
    "Reumatología",
    "Cirugía General",
    "Medicina Interna",
    "Medicina Familiar",
    "Anestesiología",
  ];
  for (const s of baseSpecialties) specialtySet.add(s);

  const specialtiesArr = Array.from(specialtySet).map((name) => ({
    name,
    slug: slugify(name),
  }));

  await writeFile(
    join(OUT_DATA, "doctors.json"),
    JSON.stringify(doctors.map((d) => ({ ...d, slug: slugify(d.name) })), null, 2),
    "utf8",
  );
  await writeFile(
    join(OUT_DATA, "specialties.json"),
    JSON.stringify(specialtiesArr, null, 2),
    "utf8",
  );

  console.log(`✓ ${doctors.length} médicos extraídos`);
  console.log(`✓ ${specialtiesArr.length} especialidades`);
  console.log(`  → ${OUT_DATA}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
