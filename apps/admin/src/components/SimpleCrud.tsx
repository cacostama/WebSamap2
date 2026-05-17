import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

interface FieldDef { key: string; label: string; kind?: "text" | "textarea"; }

interface Props {
  title: string;
  endpoint: string;
  cacheKey: string;
  fields: FieldDef[];
  slugFrom?: string;
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function SimpleCrud({ title, endpoint, cacheKey, fields, slugFrom = "name" }: Props) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: [cacheKey], queryFn: async () => (await api.get(endpoint)).data });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (payload: any) => {
      const body = { ...payload, slug: payload.slug || slugify(payload[slugFrom] ?? "") };
      if (payload.id) return (await api.put(`${endpoint}/${payload.id}`, body)).data;
      return (await api.post(endpoint, body)).data;
    },
    onSuccess: () => { toast.success("Guardado"); setEditing(null); qc.invalidateQueries({ queryKey: [cacheKey] }); },
    onError: () => toast.error("Error"),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: [cacheKey] }); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button onClick={() => setEditing({})} className="btn-primary">+ Nuevo</button>
      </div>
      {editing && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">{editing.id ? "Editar" : "Nuevo"}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className={f.kind === "textarea" ? "md:col-span-2" : ""}>
                <label className="label">{f.label}</label>
                {f.kind === "textarea"
                  ? <textarea className="input" rows={3} value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  : <input className="input" value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />}
              </div>
            ))}
            <div>
              <label className="label">Slug</label>
              <input className="input" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder={slugify(editing[slugFrom] ?? "")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate(editing)} className="btn-primary">Guardar</button>
          </div>
        </div>
      )}
      <div className="card divide-y">
        {(list.data ?? []).map((row: any) => (
          <div key={row.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{row.name}</div>
              <div className="text-xs text-gray-500">/{row.slug}{row.description ? ` · ${row.description.slice(0, 80)}` : ""}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(row)} className="btn-secondary">Editar</button>
              <button onClick={() => confirm("¿Eliminar?") && del.mutate(row.id)} className="btn-danger">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
