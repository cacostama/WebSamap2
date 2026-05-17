import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

export default function MediaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useQuery({ queryKey: ["adm-media"], queryFn: async () => (await api.get("/admin/media")).data });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return (await api.post("/admin/media", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: () => { toast.success("Subido"); qc.invalidateQueries({ queryKey: ["adm-media"] }); },
    onError: () => toast.error("Error al subir"),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-media"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Multimedia</h1>
        <div>
          <input ref={fileRef} type="file" hidden accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} className="btn-primary">Subir archivo</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(list.data ?? []).map((m: any) => (
          <div key={m.id} className="card p-2">
            {m.mime.startsWith("image/") ? <img src={m.url} alt={m.alt ?? ""} className="aspect-square w-full object-cover rounded" /> : <div className="aspect-square flex items-center justify-center bg-gray-100 rounded text-3xl">📄</div>}
            <div className="text-xs text-gray-600 mt-1 break-all">{m.url}</div>
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
