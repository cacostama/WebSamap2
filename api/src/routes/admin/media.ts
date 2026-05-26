import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { db } from "../../db.js";

export const mediaRouter = Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const maxMB = Number(process.env.MAX_UPLOAD_MB ?? 10);
const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"]);
const upload = multer({
  storage,
  limits: { fileSize: maxMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(ext)) return cb(new Error("extension de archivo no permitida"));
    if (!/^image\//.test(file.mimetype) && file.mimetype !== "application/pdf") {
      return cb(new Error("tipo de archivo no permitido"));
    }
    cb(null, true);
  },
});

mediaRouter.get("/", async (_req, res) => {
  res.json(await db("media").orderBy("created_at", "desc"));
});

mediaRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "archivo requerido" });
  const valid = await validateAndOptimizeUpload(req.file.path, req.file.mimetype);
  if (!valid.ok) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: valid.error });
  }
  const stat = await fs.promises.stat(req.file.path);
  const url = `/uploads/${req.file.filename}`;
  const [id] = await db("media").insert({
    url,
    mime: req.file.mimetype,
    size: stat.size,
    alt: typeof req.body.alt === "string" ? req.body.alt.slice(0, 255) : null,
    uploaded_by: req.user?.id ?? null,
  });
  const row = await db("media").where({ id }).first();
  res.status(201).json(row);
});

mediaRouter.delete("/:id", async (req, res) => {
  const row = await db("media").where({ id: req.params.id }).first();
  if (row) {
    const fp = path.join(UPLOAD_DIR, path.basename(row.url));
    fs.promises.unlink(fp).catch(() => {});
    await db("media").where({ id: row.id }).del();
  }
  res.status(204).end();
});

async function validateAndOptimizeUpload(filePath: string, mime: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mime === "application/pdf") {
    const fd = await fs.promises.open(filePath, "r");
    try {
      const buffer = Buffer.alloc(4);
      await fd.read(buffer, 0, 4, 0);
      return buffer.toString("utf8") === "%PDF" ? { ok: true } : { ok: false, error: "pdf invalido" };
    } finally {
      await fd.close();
    }
  }

  try {
    const image = sharp(filePath, { failOn: "warning" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) return { ok: false, error: "imagen invalida" };

    // Rechazar imágenes demasiado chicas (mala calidad)
    if (metadata.width < 200 || metadata.height < 200) {
      return { ok: false, error: "imagen demasiado pequeña (mínimo 200x200 px)" };
    }

    // Optimización agresiva: max 1600px, JPG progresivo q85, strip EXIF.
    // Si el original ya es chico, igual aplicamos compresión (mozjpeg) para
    // bajar el peso sin perder calidad notable.
    const pipeline = sharp(filePath).rotate();
    if (metadata.width > 1600 || metadata.height > 1600) {
      pipeline.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    }
    if (mime === "image/png" && metadata.hasAlpha) {
      // Preservamos transparencia: PNG comprimido
      const out = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
      await fs.promises.writeFile(filePath, out);
    } else {
      // JPG/JPEG progresivo con mozjpeg para mejor compresión
      const out = await pipeline.jpeg({ quality: 85, progressive: true, mozjpeg: true }).toBuffer();
      await fs.promises.writeFile(filePath, out);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "imagen invalida" };
  }
}
