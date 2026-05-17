import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function DoctorEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === "new";

  const specs = useQuery({ queryKey: ["specialties"], queryFn: async () => (await api.get("/admin/specialties")).data });
  const existing = useQuery({
    enabled: !isNew,
    queryKey: ["adm-doctor", id],
    queryFn: async () => (await api.get(`/admin/doctors/${id}`)).data,
  });

  const [f, setF] = useState<any>({ name: "", slug: "", photoUrl: "", bio: "", specialtyIds: [] });
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
          <div><label className="label">Nombre</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Slug</label><input className="input" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder={slugify(f.name)} /></div>
        </div>
        <div><label className="label">Foto URL</label><input className="input" value={f.photoUrl} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} /></div>
        <div><label className="label">Bio (HTML)</label><textarea className="input" rows={5} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <div>
          <label className="label">Especialidades</label>
          <div className="flex flex-wrap gap-2">
            {(specs.data ?? []).map((s: any) => (
              <label key={s.id} className={`px-3 py-1 rounded border cursor-pointer text-sm ${f.specialtyIds.includes(s.id) ? "bg-brand text-white" : "bg-white"}`}>
                <input type="checkbox" className="hidden" checked={f.specialtyIds.includes(s.id)} onChange={() => setF({ ...f, specialtyIds: f.specialtyIds.includes(s.id) ? f.specialtyIds.filter((x: number) => x !== s.id) : [...f.specialtyIds, s.id] })} />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => nav("/doctors")} className="btn-secondary">Cancelar</button>
          <button onClick={() => save.mutate()} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  );
}
