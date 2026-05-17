import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

export default function UsersPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-users"], queryFn: async () => (await api.get("/admin/users")).data });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (p: any) => p.id ? api.put(`/admin/users/${p.id}`, p) : api.post("/admin/users", p),
    onSuccess: () => { toast.success("Guardado"); setEditing(null); qc.invalidateQueries({ queryKey: ["adm-users"] }); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "Error"),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-users"] }); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button onClick={() => setEditing({ role: "editor" })} className="btn-primary">+ Nuevo</button>
      </div>
      {editing && (
        <div className="card p-4 mb-4 grid md:grid-cols-2 gap-3">
          <div><label className="label">Email</label><input className="input" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
          <div><label className="label">Nombre</label><input className="input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div><label className="label">Rol</label>
            <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
              <option value="editor">Editor</option><option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div><label className="label">Contraseña {editing.id ? "(dejar vacío para no cambiar)" : ""}</label><input className="input" type="password" value={editing.password ?? ""} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate(editing)} className="btn-primary">Guardar</button>
          </div>
        </div>
      )}
      <div className="card divide-y">
        {(list.data ?? []).map((u: any) => (
          <div key={u.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{u.name}</div>
              <div className="text-xs text-gray-500">{u.email} · {u.role}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(u)} className="btn-secondary">Editar</button>
              <button onClick={() => confirm("¿Eliminar?") && del.mutate(u.id)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
