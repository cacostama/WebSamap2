import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";

export default function PagesListPage() {
  const qc = useQueryClient();
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
  });

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
              <Link to={`/pages/${p.id}`} className="btn-secondary">Editar bloques</Link>
              <button onClick={() => confirm("¿Eliminar página?") && del.mutate(p.id)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
