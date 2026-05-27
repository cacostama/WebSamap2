import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface Props {
  initialName?: string;
  onClose: () => void;
  /** Llamado tras crear la especialidad. Recibe el objeto con id y name. */
  onCreated: (specialty: { id: number; name: string; slug: string }) => void;
}

export default function NewSpecialtyModal({ initialName, onClose, onCreated }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      const slug = slugify(name);
      const body = { name: name.trim(), slug, description: description.trim() || undefined };
      const { data } = await api.post("/admin/specialties", body);
      // El endpoint CRUD genérico devuelve el row completo
      return data as { id: number; name: string; slug: string };
    },
    onSuccess: (spec) => {
      toast.success("Especialidad creada");
      onCreated(spec);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.error ?? "Error al crear";
      toast.error(msg);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">Nueva especialidad</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Falta el nombre");
              return;
            }
            create.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">Nombre</label>
            <input
              ref={nameRef}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Reumatología Pediátrica"
              required
              maxLength={120}
            />
            {name && (
              <p className="text-xs text-gray-500 mt-1">
                Slug: <code className="font-mono">{slugify(name) || "(vacío)"}</code>
              </p>
            )}
          </div>
          <div>
            <label className="label">Descripción <span className="text-gray-400">(opcional)</span></label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumen corto para el listado del sitio."
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={create.isPending || !name.trim()} className="btn-primary">
              {create.isPending ? "Guardando…" : "Crear y seleccionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
