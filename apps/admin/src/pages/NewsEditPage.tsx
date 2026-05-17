import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import RichEditor from "../components/RichEditor";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function NewsEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === "new";

  const existing = useQuery({
    enabled: !isNew,
    queryKey: ["adm-news-detail", id],
    queryFn: async () => (await api.get(`/admin/news/${id}`)).data,
  });

  const [f, setF] = useState<any>({
    title: "", slug: "", excerpt: "", body: "<p></p>", coverUrl: "", publishedAt: "", status: "draft",
  });

  useEffect(() => {
    if (existing.data) setF({
      title: existing.data.title,
      slug: existing.data.slug,
      excerpt: existing.data.excerpt ?? "",
      body: existing.data.body,
      coverUrl: existing.data.cover_url ?? "",
      publishedAt: existing.data.published_at ? new Date(existing.data.published_at).toISOString().slice(0, 16) : "",
      status: existing.data.status,
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...f,
        slug: f.slug || slugify(f.title),
        publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : null,
      };
      if (isNew) return (await api.post("/admin/news", payload)).data;
      return (await api.put(`/admin/news/${id}`, payload)).data;
    },
    onSuccess: () => { toast.success("Guardado"); nav("/news"); },
    onError: () => toast.error("Error"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isNew ? "Nueva noticia" : "Editar noticia"}</h1>
      <div className="card p-5 grid gap-4 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">Título</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="label">Slug</label><input className="input" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder={slugify(f.title)} /></div>
        </div>
        <div><label className="label">Resumen</label><textarea className="input" rows={2} value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} /></div>
        <div><label className="label">Imagen de portada (URL)</label><input className="input" value={f.coverUrl} onChange={(e) => setF({ ...f, coverUrl: e.target.value })} /></div>
        <div><label className="label">Contenido</label><RichEditor value={f.body} onChange={(v) => setF({ ...f, body: v })} /></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">Fecha de publicación</label><input type="datetime-local" className="input" value={f.publishedAt} onChange={(e) => setF({ ...f, publishedAt: e.target.value })} /></div>
          <div><label className="label">Estado</label>
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="draft">Borrador</option><option value="published">Publicada</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => nav("/news")} className="btn-secondary">Cancelar</button>
          <button onClick={() => save.mutate()} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  );
}
