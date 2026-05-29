import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import { useConfirm } from "../components/ConfirmDialog";
import { downloadCsv } from "../lib/csv";

export default function ContactMessagesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["adm-msg"], queryFn: async () => (await api.get("/admin/contact-messages")).data });

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const change = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.put(`/admin/contact-messages/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-msg"] }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-msg"] }); },
  });

  const rows = useMemo(() => {
    return ((list.data ?? []) as any[]).filter((m) => {
      if (status && m.status !== status) return false;
      const d = new Date(m.created_at);
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [list.data, status, from, to]);

  async function remove(id: number) {
    if (await confirm({ title: "Eliminar mensaje", message: "¿Eliminar este mensaje?", confirmLabel: "Eliminar", danger: true })) del.mutate(id);
  }

  function exportCsv() {
    downloadCsv(
      "mensajes.csv",
      rows.map((m) => ({
        created_at: new Date(m.created_at).toLocaleString(),
        name: m.name,
        email: m.email,
        phone: m.phone ?? "",
        status: m.status,
        message: m.message ?? "",
      })),
      [
        { key: "created_at", header: "Fecha" },
        { key: "name", header: "Nombre" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Teléfono" },
        { key: "status", header: "Estado" },
        { key: "message", header: "Mensaje" },
      ],
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mensajes de contacto</h1>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">Todos</option>
            <option value="nuevo">Nuevo</option>
            <option value="leido">Leído</option>
            <option value="respondido">Respondido</option>
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
        <span className="text-sm text-gray-500 ml-auto">{rows.length} mensajes</span>
      </div>
      <div className="space-y-3">
        {rows.map((m: any) => (
          <div key={m.id} className={`card p-4 ${m.status === "nuevo" ? "border-l-4 border-brand" : ""}`}>
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-2">
                {new Date(m.created_at).toLocaleString()}
                {m.status === "nuevo" && <span className="bg-brand text-white rounded-full px-2 py-0.5 text-[10px]">Nuevo</span>}
              </span>
              <select value={m.status} onChange={(e) => change.mutate({ id: m.id, status: e.target.value })} className="input max-w-[140px]">
                <option value="nuevo">Nuevo</option><option value="leido">Leído</option><option value="respondido">Respondido</option>
              </select>
            </div>
            <div className="font-semibold mt-1">{m.name}</div>
            <div className="text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
            <div className="flex gap-3 mt-2">
              {m.status === "nuevo" && <button onClick={() => change.mutate({ id: m.id, status: "leido" })} className="text-brand text-xs">Marcar leído</button>}
              <button onClick={() => remove(m.id)} className="text-red-600 text-xs">Eliminar</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="card p-4 text-sm text-gray-500">Sin mensajes.</p>}
      </div>
    </div>
  );
}
