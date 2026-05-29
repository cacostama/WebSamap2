import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";
import { useConfirm } from "../components/ConfirmDialog";

export default function PagesListPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["adm-pages"], queryFn: async () => (await api.get("/admin/pages")).data });
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: async () => (await api.post("/admin/pages", { slug, title, status: "draft" })).data,
    onSuccess: () => { toast.success("Creada"); setSlug(""); setTitle(""); setCreating(false); qc.invalidateQueries({ queryKey: ["adm-pages"] }); },
    onError: () => toast.error("Error al crear"),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/pages/${id}`),
    onSuccess: () => { toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["adm-pages"] }); },
    onError: () => toast.error("Error al eliminar"),
  });
  const toggleStatus = useMutation({
    mutationFn: async (p: any) => (await api.put(`/admin/pages/${p.id}`, { status: p.status === "published" ? "draft" : "published" })).data,
    onSuccess: (_d, p: any) => { toast.success(p.status === "published" ? "Despublicada" : "Publicada"); qc.invalidateQueries({ queryKey: ["adm-pages"] }); },
    onError: () => toast.error("Error al cambiar estado"),
  });

  async function askDelete(p: any) {
    if (await confirm({ title: "Eliminar página", message: `¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true })) {
      del.mutate(p.id);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Páginas</h1>
        <button onClick={() => setCreating(!creating)} className="btn-primary">+ Nueva página</button>
      </div>
      {creating && (
        <div className="card p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1"><label className="label">Título</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="flex-1"><label className="label">Slug</label><input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ej. nuestros-valores" /></div>
          <button onClick={() => create.mutate()} disabled={!slug || !title} className="btn-primary">Crear</button>
        </div>
      )}
      <div className="card divide-y">
        {(q.data ?? []).map((p: any) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-gray-500">/{p.slug} · <span className={p.status === "published" ? "text-green-700" : "text-gray-500"}>{p.status}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleStatus.mutate(p)} className="btn-secondary" title="Cambiar estado">
                {p.status === "published" ? "Despublicar" : "Publicar"}
              </button>
              <Link to={`/pages/${p.id}`} className="btn-secondary">Editar bloques</Link>
              <button onClick={() => askDelete(p)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
