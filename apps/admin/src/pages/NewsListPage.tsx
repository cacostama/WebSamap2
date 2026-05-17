import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";

export default function NewsListPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-news"], queryFn: async () => (await api.get("/admin/news")).data });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/news/${id}`),
    onSuccess: () => { toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["adm-news"] }); },
  });
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Noticias</h1>
        <Link to="/news/new" className="btn-primary">+ Nueva</Link>
      </div>
      <div className="card divide-y">
        {(list.data ?? []).map((n: any) => (
          <div key={n.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{n.title}</div>
              <div className="text-xs text-gray-500">/{n.slug} · <span className={n.status === "published" ? "text-green-700" : "text-gray-500"}>{n.status}</span>{n.published_at ? ` · ${new Date(n.published_at).toLocaleDateString()}` : ""}</div>
            </div>
            <div className="flex gap-2">
              <Link to={`/news/${n.id}`} className="btn-secondary">Editar</Link>
              <button onClick={() => confirm("¿Eliminar?") && del.mutate(n.id)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
