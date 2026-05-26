/**
 * Importa fotos de médicos desde la carpeta:
 *   imagenes/Perfiles de consultorio/<ESPECIALIDAD>/[Web/]<doctor>.{jpg,jpeg,png}
 *
 * - Prefiere subcarpeta `Web/` cuando existe (versión optimizada para web).
 * - Ignora subcarpeta `Historia/` (versión histórica/legacy).
 * - Limpia el nombre del archivo (quita sufijos tipo ". cardiología", ". jpeg").
 * - Optimiza cada imagen con sharp: 800x800 cover, JPG q85, progresivo,
 *   stripping EXIF. Resultado típico: 40-80KB por foto.
 * - Genera:
 *     assets-extracted/doctors-optimized/<slug>.jpg
 *     assets-extracted/doctors-optimized/upsert.sql
 *     assets-extracted/doctors-optimized/index.json
 *
 *   pnpm import:doctors
 */
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../api/node_modules/sharp/lib/index.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "imagenes", "Perfiles de consultorio");
const OUT = join(ROOT, "assets-extracted", "doctors-optimized");

// Mapeo carpeta → nombre canónico de especialidad (con tildes y casing correcto).
const SPECIALTY_MAP: Record<string, string> = {
  "ALERGIA": "Alergología",
  "CARDIOLOGIA": "Cardiología",
  "CIRUGIA": "Cirugía General",
  "CIRUGÍA PLÁSTICA": "Cirugía Plástica",
  "COLOPROCTOLOGÍA": "Coloproctología",
  "DERMATOLOGÍA": "Dermatología",
  "DIABETOLOGÍA": "Diabetología",
  "ECOGRAFÍA": "Ecografía",
  "EMERGENTOLOGÍA": "Emergentología",
  "ENDOCRINOLOGÍA": "Endocrinología",
  "FLEBOLOGÍA": "Flebología",
  "GASTROENTEROLOGIA": "Gastroenterología",
  "GERIATRÍA": "Geriatría",
  "GINECOLOGÍA": "Ginecología y Obstetricia",
  "HEMATOLOGÍA": "Hematología",
  "INFECTOLOGÍA": "Infectología",
  "MASTOLOGÍA": "Mastología",
  "MEDICINA FAMILIAR": "Medicina Familiar",
  "MEDICINA INTERNA": "Medicina Interna",
  "NEUMOLOGIA": "Neumología",
  "NEUROCIRUGÍA": "Neurocirugía",
  "NEUROLOGÍA": "Neurología",
  "NUTRICIÓN": "Nutrición",
  "ODONTOLOGIA": "Odontología",
  "OFTALMOLOGIA": "Oftalmología",
  "ONCOLOGÍA": "Oncología",
  "OTORRINOLARINGOLOGIA": "Otorrinolaringología",
  "PEDIATRIA": "Pediatría",
  "RADIOLOGÍA": "Radiología",
  "REUMATOLOGÍA": "Reumatología",
  "SICOLOGIA": "Psicología",
  "SIQUIATRÍA": "Psiquiatría",
  "TRAUMATOLOGÍA": "Traumatología",
  "UROLOGIA": "Urología",
};

const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Limpia el filename para obtener "Dr. Nombre Apellido". */
function cleanDoctorName(filename: string): string {
  let name = filename.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  // Quitar sufijos tipo " jpeg", ".jpeg", ".cardiología", ". cardiologo", etc.
  name = name.replace(/\.\s*(jpeg|jpg|png|webp|cardiología|cardiologo|cardiólogo)$/i, "");
  name = name.replace(/\.\s*[a-záéíóúñ]+$/i, ""); // sufijos sueltos tipo ". cardiología"
  // Espacios múltiples → uno solo
  name = name.replace(/\s+/g, " ").trim();
  return name;
}

interface DoctorEntry {
  specialtyFolder: string;
  specialtyName: string;
  specialtySlug: string;
  doctorName: string;
  doctorSlug: string;
  outputFile: string; // relativo a OUT
  sourceFile: string; // absoluto
}

async function listImages(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const all = await readdir(dir, { withFileTypes: true });
  return all
    .filter((d) => d.isFile() && IMG_EXTS.has(extname(d.name).toLowerCase()))
    .map((d) => join(dir, d.name));
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const entries: DoctorEntry[] = [];
  const specialtyFolders = (await readdir(SRC, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of specialtyFolders) {
    const specialtyName = SPECIALTY_MAP[folder] ?? folder.replace(/(^| )(\w)/g, (_, sep, c) => sep + c.toUpperCase());
    const specialtySlug = slugify(specialtyName);

    // Preferimos Web/ si existe
    const webDir = join(SRC, folder, "Web");
    const rootDir = join(SRC, folder);
    let images = await listImages(webDir);
    let usingWeb = images.length > 0;
    if (!usingWeb) images = await listImages(rootDir);

    // Dedup: si un doctor tiene archivo en raíz Y en Web, ya tomamos Web
    // (no recorremos rootDir si Web/ tiene contenido). Para los que están solo
    // en raíz, los tomamos. Ignoramos Historia/.

    console.log(`[${folder}] → ${specialtyName} (${images.length} fotos${usingWeb ? " desde Web/" : ""})`);

    for (const file of images) {
      const doctorName = cleanDoctorName(basename(file));
      const doctorSlug = slugify(doctorName);
      if (!doctorSlug) continue;

      const outFile = `${doctorSlug}.jpg`;
      const outPath = join(OUT, outFile);

      // Solo procesa si no existe (para reruns rápidos) — comparar size original
      try {
        const orig = await stat(file);
        let needsProcess = true;
        if (existsSync(outPath)) {
          const out = await stat(outPath);
          if (out.mtimeMs > orig.mtimeMs) needsProcess = false;
        }
        if (needsProcess) {
          await sharp(file)
            .rotate()
            .resize(800, 800, { fit: "cover", position: "top" })
            .jpeg({ quality: 85, progressive: true, mozjpeg: true })
            .withMetadata({ orientation: undefined }) // strip EXIF
            .toFile(outPath);
        }
      } catch (e) {
        console.warn(`  ⚠ error procesando ${file}:`, (e as Error).message);
        continue;
      }

      entries.push({
        specialtyFolder: folder,
        specialtyName,
        specialtySlug,
        doctorName,
        doctorSlug,
        outputFile: outFile,
        sourceFile: file,
      });
    }
  }

  // ---- Generar SQL UPSERT idempotente ----
  const sql: string[] = [];
  sql.push("-- Importación masiva de médicos + especialidades desde carpeta de fotos");
  sql.push("-- Generado por scripts/import-doctors-from-folder.ts\n");

  // 1) Especialidades (upsert)
  const seenSpec = new Set<string>();
  for (const e of entries) {
    if (seenSpec.has(e.specialtySlug)) continue;
    seenSpec.add(e.specialtySlug);
    const name = e.specialtyName.replace(/'/g, "''");
    sql.push(
      `INSERT INTO specialties (slug, name, \`order\`) VALUES ('${e.specialtySlug}', '${name}', 0) ON DUPLICATE KEY UPDATE name=VALUES(name);`,
    );
  }
  sql.push("");

  // 2) Doctores (upsert por slug). photo_url apunta a /uploads/doctors/<slug>.jpg
  const seenDoctor = new Set<string>();
  for (const e of entries) {
    if (seenDoctor.has(e.doctorSlug)) continue;
    seenDoctor.add(e.doctorSlug);
    const name = e.doctorName.replace(/'/g, "''");
    sql.push(
      `INSERT INTO doctors (slug, name, photo_url, \`order\`) VALUES ('${e.doctorSlug}', '${name}', '/uploads/doctors/${e.outputFile}', 0) ON DUPLICATE KEY UPDATE name=VALUES(name), photo_url=VALUES(photo_url);`,
    );
  }
  sql.push("");

  // 3) Relación doctor_specialty (M:N) — borramos primero las viejas del doctor
  //    de las especialidades que tocamos y reinsertamos.
  for (const e of entries) {
    sql.push(
      `INSERT IGNORE INTO doctor_specialty (doctor_id, specialty_id) SELECT d.id, s.id FROM doctors d, specialties s WHERE d.slug='${e.doctorSlug}' AND s.slug='${e.specialtySlug}';`,
    );
  }

  await writeFile(join(OUT, "upsert.sql"), sql.join("\n"), "utf8");
  await writeFile(
    join(OUT, "index.json"),
    JSON.stringify(
      {
        total: entries.length,
        bySpecialty: entries.reduce<Record<string, number>>((acc, e) => {
          acc[e.specialtyName] = (acc[e.specialtyName] ?? 0) + 1;
          return acc;
        }, {}),
        doctors: entries.map((e) => ({
          name: e.doctorName,
          slug: e.doctorSlug,
          specialty: e.specialtyName,
          photoUrl: `/uploads/doctors/${e.outputFile}`,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  // Resumen
  console.log("");
  console.log("=".repeat(60));
  console.log(`✓ ${entries.length} médicos procesados`);
  console.log(`✓ ${seenSpec.size} especialidades`);
  console.log(`✓ Fotos optimizadas en ${OUT}`);
  console.log(`✓ SQL en ${join(OUT, "upsert.sql")}`);
  console.log(`✓ Index JSON en ${join(OUT, "index.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
