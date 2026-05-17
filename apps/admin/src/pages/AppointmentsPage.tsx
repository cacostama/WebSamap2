import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-apt"], queryFn: async () => (await api.get("/admin/appointments")).data });

  const change = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.put(`/admin/appointments/${id}`, { status }),
    onSuccess: () => { toast.success("Actualizado"); qc.invalidateQueries({ queryKey: ["adm-apt"] }); },
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/appointments/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-apt"] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Turnos solicitados</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Paciente</th><th className="text-left p-3">Contacto</th><th className="text-left p-3">Preferido</th><th className="text-left p-3">Estado</th><th></th></tr>
          </thead>
          <tbody className="divide-y">
            {(list.data ?? []).map((a: any) => (
              <tr key={a.id}>
                <td className="p-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                <td className="p-3">{a.name}</td>
                <td className="p-3 text-xs"><div>{a.phone}</div><div className="text-gray-500">{a.email}</div></td>
                <td className="p-3 text-xs">{a.preferred_at ? new Date(a.preferred_at).toLocaleString() : "—"}</td>
                <td className="p-3">
                  <select value={a.status} onChange={(e) => change.mutate({ id: a.id, status: e.target.value })} className="input">
                    <option value="pendiente">Pendiente</option><option value="confirmado">Confirmado</option><option value="cancelado">Cancelado</option>
                  </select>
                </td>
                <td className="p-3"><button onClick={() => confirm("¿Eliminar?") && del.mutate(a.id)} className="text-red-600 text-xs">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!list.data || list.data.length === 0) && <p className="p-4 text-sm text-gray-500">Sin turnos.</p>}
      </div>
    </div>
  );
}
