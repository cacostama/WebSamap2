import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import SpecialtyMultiSelect from "../components/SpecialtyMultiSelect";
import NewSpecialtyModal from "../components/NewSpecialtyModal";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function DoctorEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === "new";

  const specs = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => (await api.get("/admin/specialties")).data as { id: number; name: string; slug: string }[],
  });
  const existing = useQuery({
    enabled: !isNew,
    queryKey: ["adm-doctor", id],
    queryFn: async () => (await api.get(`/admin/doctors/${id}`)).data,
  });

  const [f, setF] = useState<any>({ name: "", slug: "", photoUrl: "", bio: "", specialtyIds: [] as number[] });
  const [newSpecOpen, setNewSpecOpen] = useState<{ initial?: string } | null>(null);

  useEffect(() => {
    if (existing.data) setF({
      name: existing.data.name,
      slug: existing.data.slug,
      photoUrl: existing.data.photo_url ?? "",
      bio: existing.data.bio ?? "",
      specialtyIds: (existing.data.specialties ?? []).map((s: any) => s.id),
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, slug: f.slug || slugify(f.name) };
      if (isNew) return (await api.post("/admin/doctors", payload)).data;
      return (await api.put(`/admin/doctors/${id}`, payload)).data;
    },
    onSuccess: () => { toast.success("Guardado"); nav("/doctors"); },
    onError: () => toast.error("Error al guardar"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isNew ? "Nuevo médico" : "Editar médico"}</h1>
      <div className="card p-5 grid gap-4 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Ej. Dra. María González"
            />
          </div>
          <div>
            <label className="label">Slug</label>
            <input
              className="input"
              value={f.slug}
              onChange={(e) => setF({ ...f, slug: e.target.value })}
              placeholder={slugify(f.name) || "se autogenera"}
            />
          </div>
        </div>
        <div>
          <label className="label">Foto URL</label>
          <input
            className="input"
            value={f.photoUrl}
            onChange={(e) => setF({ ...f, photoUrl: e.target.value })}
            placeholder="/uploads/doctors/dra-maria-gonzalez.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">Subí la foto desde Multimedia y pegá la URL acá.</p>
        </div>
        <div>
          <label className="label">Bio (HTML)</label>
          <textarea
            className="input"
            rows={5}
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            placeholder="<p>Formación, áreas de interés, idiomas…</p>"
          />
        </div>

        <div>
          <label className="label">Especialidades</label>
          <SpecialtyMultiSelect
            options={specs.data ?? []}
            value={f.specialtyIds}
            onChange={(ids) => setF({ ...f, specialtyIds: ids })}
            onCreateNew={(initial) => setNewSpecOpen({ initial })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Buscá o seleccioná de la lista ordenada. Si no aparece, escribí el nombre y usá <em>“Crear nueva especialidad”</em>.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => nav("/doctors")} className="btn-secondary">Cancelar</button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !f.name.trim()}
            className="btn-primary"
          >
            {save.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {newSpecOpen && (
        <NewSpecialtyModal
          initialName={newSpecOpen.initial}
          onClose={() => setNewSpecOpen(null)}
          onCreated={(spec) => {
            // Refrescar lista y seleccionar la recién creada
            qc.invalidateQueries({ queryKey: ["specialties"] });
            setF((prev: any) => ({ ...prev, specialtyIds: [...prev.specialtyIds, spec.id] }));
            setNewSpecOpen(null);
          }}
        />
      )}
    </div>
  );
}
