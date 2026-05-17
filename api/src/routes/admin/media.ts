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
    if (metadata.width > 2400 || metadata.height > 2400) {
      const optimized = await sharp(filePath)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .toBuffer();
      await fs.promises.writeFile(filePath, optimized);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "imagen invalida" };
  }
}
