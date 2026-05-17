/**
 * Extrae todas las imágenes (data:image base64) embebidas en los HTML de
 * referencia y las vuelca a assets-extracted/images/.
 *
 * Genera assets-extracted/data/assets-index.json con el mapa { hash → metadata }
 * para que el seed luego pueda referenciar los archivos.
 *
 *   pnpm extract:assets
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, basename, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const OUT_DIR = join(ROOT, "assets-extracted", "images");
const OUT_DATA = join(ROOT, "assets-extracted", "data");

const SOURCES = ["WebArgentina", "WebHoenau", "websamapAsu"];

interface AssetMeta {
  filename: string;
  mime: string;
  size: number;
  source: string;
  sourceFile: string;
}

const dataUrlRe = /data:(image\/(?:png|jpeg|jpg|gif|svg\+xml|webp));base64,([A-Za-z0-9+/=]+)/g;

const mimeToExt: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(OUT_DATA, { recursive: true });

  const index: Record<string, AssetMeta> = {};
  let totalFound = 0;

  for (const src of SOURCES) {
    const srcDir = join(ROOT, src);
    let files: string[] = [];
    try {
      files = (await readdir(srcDir)).filter((f) => f.toLowerCase().endsWith(".html"));
    } catch {
      console.warn(`[skip] no se puede leer ${srcDir}`);
      continue;
    }
    for (const f of files) {
      const fp = join(srcDir, f);
      console.log(`→ ${src}/${f}`);
      const html = await readFile(fp, "utf8");
      let m: RegExpExecArray | null;
      let countInFile = 0;
      while ((m = dataUrlRe.exec(html)) !== null) {
        const mime = m[1];
        const b64 = m[2];
        const ext = mimeToExt[mime] ?? "bin";
        const buf = Buffer.from(b64, "base64");
        if (buf.length < 200) continue; // descartar inline icons triviales
        const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
        const filename = `${hash}.${ext}`;
        if (!index[hash]) {
          await writeFile(join(OUT_DIR, filename), buf);
          index[hash] = {
            filename,
            mime,
            size: buf.length,
            source: src,
            sourceFile: f,
          };
          totalFound++;
        }
        countInFile++;
      }
      console.log(`   ${countInFile} matches (${Object.keys(index).length} únicos acumulados)`);
    }
  }

  await writeFile(
    join(OUT_DATA, "assets-index.json"),
    JSON.stringify(index, null, 2),
    "utf8",
  );

  console.log(`\n✓ Extraídos ${totalFound} archivos únicos en ${OUT_DIR}`);
  console.log(`✓ Índice en ${join(OUT_DATA, "assets-index.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
