import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

const MAX_MB = 10;
const RECOMMENDED_MIN = 600; // px
const RECOMMENDED_MAX = 2400; // px

interface PreflightResult {
  ok: boolean;
  width?: number;
  height?: number;
  size?: number;
  warnings: string[];
  errors: string[];
}

/** Lee la imagen en el browser para validar antes de subir. */
function preflight(file: File): Promise<PreflightResult> {
  return new Promise((resolve) => {
    const result: PreflightResult = { ok: true, warnings: [], errors: [], size: file.size };
    if (file.size > MAX_MB * 1024 * 1024) {
      result.errors.push(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB (máximo ${MAX_MB} MB).`);
      result.ok = false;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      result.errors.push("Tipo de archivo no permitido. Usá JPG, PNG, WebP, GIF o PDF.");
      result.ok = false;
    }
    if (!file.type.startsWith("image/")) {
      return resolve(result);
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      result.width = img.width;
      result.height = img.height;
      if (img.width < 200 || img.height < 200) {
        result.errors.push(`Imagen demasiado pequeña (${img.width}×${img.height} px). Mínimo 200×200.`);
        result.ok = false;
      } else if (img.width < RECOMMENDED_MIN || img.height < RECOMMENDED_MIN) {
        result.warnings.push(`Tamaño chico (${img.width}×${img.height}). Recomendado mín ${RECOMMENDED_MIN}×${RECOMMENDED_MIN}.`);
      }
      if (img.width > RECOMMENDED_MAX * 2 || img.height > RECOMMENDED_MAX * 2) {
        result.warnings.push(`Imagen muy grande (${img.width}×${img.height}). Se va a redimensionar a ${RECOMMENDED_MAX} px máximo en el servidor.`);
      }
      resolve(result);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      result.errors.push("No pude leer el archivo como imagen.");
      result.ok = false;
      resolve(result);
    };
    img.src = url;
  });
}

export default function MediaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: File; check: PreflightResult } | null>(null);
  const list = useQuery({ queryKey: ["adm-media"], queryFn: async () => (await api.get("/admin/media")).data });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return (await api.post("/admin/media", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: () => {
      toast.success("Subido y optimizado");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["adm-media"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "Error al subir"),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-media"] }),
  });

  async function handleFile(file: File) {
    const check = await preflight(file);
    if (!check.ok) {
      check.errors.forEach((e) => toast.error(e));
      setPending(null);
      return;
    }
    setPending({ file, check });
  }

  return (
    <div>
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Multimedia</h1>
          <p className="text-xs text-gray-500 mt-1">
            Logos, fotos de médicos, banners e imágenes para los bloques del sitio.
          </p>
        </div>
        <div className="flex-shrink-0">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button onClick={() => fileRef.current?.click()} className="btn-primary">Subir archivo</button>
        </div>
      </div>

      {/* Guía de calidad */}
      <div className="card p-4 mb-6 bg-blue-50 border-blue-200 text-sm">
        <h2 className="font-semibold text-brand mb-2">Recomendaciones de calidad</h2>
        <ul className="space-y-1 text-gray-700">
          <li>• <strong>Fotos de médicos</strong>: cuadrada (1:1), mínimo {RECOMMENDED_MIN}×{RECOMMENDED_MIN} px. Encuadre rostro+hombros.</li>
          <li>• <strong>Banners / hero</strong>: 1600×900 px o más (horizontal 16:9).</li>
          <li>• <strong>Logos</strong>: PNG con fondo transparente o SVG si es posible.</li>
          <li>• <strong>Formatos aceptados</strong>: JPG, PNG, WebP, GIF, PDF.</li>
          <li>• <strong>Peso máximo</strong>: {MAX_MB} MB. El servidor optimiza a {RECOMMENDED_MAX} px máx, JPG progresivo, sin EXIF.</li>
        </ul>
      </div>

      {/* Confirmación pre-upload con preview + warnings */}
      {pending && (
        <div className="card p-4 mb-6 border-2 border-brand">
          <h2 className="font-semibold mb-3">Confirmar subida</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              {pending.file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(pending.file)}
                  alt="preview"
                  className="aspect-square w-full object-cover rounded border"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-100 rounded text-4xl border">📄</div>
              )}
            </div>
            <div className="md:col-span-2 text-sm space-y-2">
              <div><strong>Archivo:</strong> {pending.file.name}</div>
              <div><strong>Tamaño:</strong> {(pending.file.size / 1024).toFixed(0)} KB</div>
              {pending.check.width && (
                <div><strong>Dimensiones:</strong> {pending.check.width}×{pending.check.height} px</div>
              )}
              {pending.check.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                  {pending.check.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => upload.mutate(pending.file)}
                  disabled={upload.isPending}
                  className="btn-primary"
                >
                  {upload.isPending ? "Subiendo…" : "Confirmar y subir"}
                </button>
                <button onClick={() => setPending(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de archivos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(list.data ?? []).map((m: any) => (
          <div key={m.id} className="card p-2">
            {m.mime.startsWith("image/") ? (
              <img src={m.url} alt={m.alt ?? ""} loading="lazy" decoding="async" className="aspect-square w-full object-cover rounded" />
            ) : (
              <div className="aspect-square flex items-center justify-center bg-gray-100 rounded text-3xl">📄</div>
            )}
            <div className="text-xs text-gray-600 mt-1 break-all">{m.url}</div>
            <div className="text-xs text-gray-400">{(m.size / 1024).toFixed(0)} KB</div>
            <div className="flex justify-between mt-1">
              <button onClick={() => navigator.clipboard.writeText(m.url)} className="text-xs text-brand">Copiar URL</button>
              <button onClick={() => confirm("¿Eliminar?") && del.mutate(m.id)} className="text-xs text-red-600">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
