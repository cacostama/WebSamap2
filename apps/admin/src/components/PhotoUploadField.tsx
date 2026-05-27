import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";

const MAX_MB = 10;

interface Props {
  /** URL actual de la foto (puede venir vacío) */
  value: string;
  /** Llamado cuando se selecciona/sube una nueva foto, o se borra. */
  onChange: (url: string) => void;
  /** Aspect ratio sugerido: "square" (1:1, médicos) o "wide" (16:9, banners). */
  aspect?: "square" | "wide";
  /** Lado recomendado mínimo en píxeles (advierte si es menor). */
  recommendedMin?: number;
  /** Lado recomendado máximo (informativo). */
  recommendedMax?: number;
  /** Etiqueta corta arriba del slot. */
  label?: string;
}

interface Preflight {
  ok: boolean;
  width?: number;
  height?: number;
  size: number;
  warnings: string[];
  errors: string[];
  previewUrl: string;
}

async function preflight(file: File, recommendedMin: number, recommendedMax: number, aspect: "square" | "wide"): Promise<Preflight> {
  const result: Preflight = { ok: true, size: file.size, warnings: [], errors: [], previewUrl: "" };
  if (file.size > MAX_MB * 1024 * 1024) {
    result.errors.push(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB (máximo ${MAX_MB} MB).`);
    result.ok = false;
  }
  if (!file.type.startsWith("image/")) {
    result.errors.push("Tipo de archivo no permitido. Usá JPG, PNG o WebP.");
    result.ok = false;
    return result;
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    result.previewUrl = url;
    const img = new Image();
    img.onload = () => {
      result.width = img.width;
      result.height = img.height;
      if (img.width < 200 || img.height < 200) {
        result.errors.push(`Imagen demasiado pequeña (${img.width}×${img.height}). Mínimo 200×200.`);
        result.ok = false;
      } else if (img.width < recommendedMin || img.height < recommendedMin) {
        result.warnings.push(`Tamaño chico (${img.width}×${img.height}). Recomendado mín ${recommendedMin}×${recommendedMin}.`);
      }
      // Aspect ratio check
      const ratio = img.width / img.height;
      if (aspect === "square" && Math.abs(ratio - 1) > 0.2) {
        result.warnings.push(`La imagen no es cuadrada (${img.width}×${img.height}). Se va a recortar al centro.`);
      } else if (aspect === "wide" && Math.abs(ratio - 16 / 9) > 0.3) {
        result.warnings.push(`La imagen no es 16:9 (${img.width}×${img.height}). Podría verse recortada.`);
      }
      if (img.width > recommendedMax * 2 || img.height > recommendedMax * 2) {
        result.warnings.push(`Imagen muy grande (${img.width}×${img.height}). Se va a redimensionar en el servidor.`);
      }
      resolve(result);
    };
    img.onerror = () => {
      result.errors.push("No pude leer el archivo como imagen.");
      result.ok = false;
      resolve(result);
    };
    img.src = url;
  });
}

export default function PhotoUploadField({
  value,
  onChange,
  aspect = "square",
  recommendedMin = 600,
  recommendedMax = 1600,
  label,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: File; check: Preflight } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function handleFile(file: File) {
    const check = await preflight(file, recommendedMin, recommendedMax, aspect);
    if (!check.ok) {
      check.errors.forEach((e) => toast.error(e));
      return;
    }
    setPending({ file, check });
  }

  async function confirmUpload() {
    if (!pending) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pending.file);
      const { data } = await api.post("/admin/media", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Foto subida y optimizada");
      URL.revokeObjectURL(pending.check.previewUrl);
      setPending(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function cancelPending() {
    if (pending?.check.previewUrl) URL.revokeObjectURL(pending.check.previewUrl);
    setPending(null);
  }

  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";
  const recommend =
    aspect === "square"
      ? `Cuadrada (1:1), mínimo ${recommendedMin}×${recommendedMin} px.`
      : `Horizontal 16:9, mínimo ${recommendedMin * 16 / 9 | 0}×${recommendedMin} px.`;

  return (
    <div className="space-y-2">
      {label && <label className="label">{label}</label>}

      {/* Preview + acciones */}
      <div className="flex items-start gap-4">
        <div className={`${aspectClass} w-32 rounded border bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center`}>
          {value ? (
            <img src={value} alt="Foto actual" className="w-full h-full object-cover" />
          ) : (
            <div className="text-3xl text-gray-300">📷</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary text-xs">
              {value ? "Cambiar foto" : "Subir desde mi PC"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="btn-secondary text-xs text-red-600">
                Quitar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="btn-secondary text-xs"
            >
              {showUrlInput ? "Cerrar URL manual" : "Pegar URL…"}
            </button>
          </div>

          {showUrlInput && (
            <input
              className="input text-xs"
              placeholder="/uploads/doctors/dra-maria-gonzalez.jpg o https://..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          )}

          <p className="text-xs text-gray-500">
            <strong>{recommend}</strong> JPG/PNG/WebP, máx {MAX_MB} MB. El servidor optimiza a {recommendedMax} px y JPG q85.
          </p>
        </div>
      </div>

      {/* Confirmación pre-upload */}
      {pending && (
        <div className="card p-4 border-2 border-brand">
          <h3 className="font-semibold text-sm mb-3">Confirmar subida</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <img
                src={pending.check.previewUrl}
                alt="Vista previa"
                className={`${aspectClass} w-full object-cover rounded border`}
              />
            </div>
            <div className="md:col-span-2 text-sm space-y-2">
              <div><strong>Archivo:</strong> {pending.file.name}</div>
              <div><strong>Peso:</strong> {(pending.file.size / 1024).toFixed(0)} KB</div>
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
                  type="button"
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Subiendo…" : "Confirmar y subir"}
                </button>
                <button type="button" onClick={cancelPending} className="btn-secondary" disabled={uploading}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
