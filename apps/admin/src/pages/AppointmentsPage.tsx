import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { useConfirm } from "../components/ConfirmDialog";
import { downloadCsv } from "../lib/csv";

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["adm-apt"], queryFn: async () => (await api.get("/admin/appointments")).data });

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const change = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.put(`/admin/appointments/${id}`, { status }),
    onSuccess: () => { toast.success("Actualizado"); qc.invalidateQueries({ queryKey: ["adm-apt"] }); },
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/appointments/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-apt"] }); },
  });

  const rows = useMemo(() => {
    return ((list.data ?? []) as any[]).filter((a) => {
      if (status && a.status !== status) return false;
      const d = new Date(a.created_at);
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [list.data, status, from, to]);

  async function remove(id: number) {
    if (await confirm({ title: "Eliminar turno", message: "¿Eliminar este turno?", confirmLabel: "Eliminar", danger: true })) del.mutate(id);
  }

  function exportCsv() {
    downloadCsv(
      "turnos.csv",
      rows.map((a) => ({
        created_at: new Date(a.created_at).toLocaleString(),
        name: a.name,
        phone: a.phone,
        email: a.email,
        preferred_at: a.preferred_at ? new Date(a.preferred_at).toLocaleString() : "",
        status: a.status,
        message: a.message ?? "",
      })),
      [
        { key: "created_at", header: "Fecha" },
        { key: "name", header: "Paciente" },
        { key: "phone", header: "Teléfono" },
        { key: "email", header: "Email" },
        { key: "preferred_at", header: "Preferido" },
        { key: "status", header: "Estado" },
        { key: "message", header: "Mensaje" },
      ],
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Turnos solicitados</h1>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="label">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
        <button onClick={exportCsv} className="btn-secondary">Exportar CSV</button>
        <span className="text-sm text-gray-500 ml-auto">{rows.length} turnos</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Paciente</th><th className="text-left p-3">Contacto</th><th className="text-left p-3">Preferido</th><th className="text-left p-3">Estado</th><th></th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((a: any) => (
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
                <td className="p-3"><button onClick={() => remove(a.id)} className="text-red-600 text-xs">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-gray-500">Sin turnos.</p>}
      </div>
    </div>
  );
}
