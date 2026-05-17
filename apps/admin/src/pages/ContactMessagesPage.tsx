import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

export default function ContactMessagesPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-msg"], queryFn: async () => (await api.get("/admin/contact-messages")).data });

  const change = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.put(`/admin/contact-messages/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-msg"] }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-msg"] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mensajes de contacto</h1>
      <div className="space-y-3">
        {(list.data ?? []).map((m: any) => (
          <div key={m.id} className="card p-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{new Date(m.created_at).toLocaleString()}</span>
              <select value={m.status} onChange={(e) => change.mutate({ id: m.id, status: e.target.value })} className="input max-w-[140px]">
                <option value="nuevo">Nuevo</option><option value="leido">Leído</option><option value="respondido">Respondido</option>
              </select>
            </div>
            <div className="font-semibold mt-1">{m.name}</div>
            <div className="text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
            <button onClick={() => confirm("¿Eliminar?") && del.mutate(m.id)} className="text-red-600 text-xs mt-2">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
