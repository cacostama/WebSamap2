import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";

export default function DoctorsListPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["adm-doctors"], queryFn: async () => (await api.get("/admin/doctors")).data });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/doctors/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-doctors"] }); },
  });
  const filtered = (list.data ?? []).filter((d: any) => !q || d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Médicos</h1>
        <Link to="/doctors/new" className="btn-primary">+ Nuevo</Link>
      </div>
      <input className="input mb-4" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card divide-y">
        {filtered.map((d: any) => (
          <div key={d.id} className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
              {d.photo_url ? <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{d.name}</div>
              <div className="text-xs text-gray-500">{(d.specialties ?? []).map((s: any) => s.name).join(", ") || "Sin especialidades"}</div>
            </div>
            <Link to={`/doctors/${d.id}`} className="btn-secondary">Editar</Link>
            <button onClick={() => confirm("¿Eliminar?") && del.mutate(d.id)} className="btn-danger">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
