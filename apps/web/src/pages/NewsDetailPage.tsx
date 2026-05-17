import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export default function NewsDetailPage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["news-detail", slug],
    queryFn: async () => (await api.get(`/public/news/${slug}`)).data,
  });
  if (isLoading) return <div className="container-x py-12">Cargando…</div>;
  if (!data) return <div className="container-x py-12">No encontrada.</div>;
  return (
    <article className="container-x py-12 max-w-3xl">
      {data.cover_url && <img src={data.cover_url} alt={data.title} className="w-full rounded mb-6" />}
      <h1 className="text-3xl md:text-4xl font-bold text-primary">{data.title}</h1>
      {data.published_at && <p className="text-sm text-gray-500 mt-1">{new Date(data.published_at).toLocaleDateString("es-PY")}</p>}
      <div className="prose max-w-none mt-6" dangerouslySetInnerHTML={{ __html: data.body }} />
    </article>
  );
}
