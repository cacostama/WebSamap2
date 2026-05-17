import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";

interface Item {
  label: string;
  href: string;
  children?: Item[];
}

function ItemRow({
  item,
  onChange,
  onRemove,
  depth = 0,
}: {
  item: Item;
  onChange: (next: Item) => void;
  onRemove: () => void;
  depth?: number;
}) {
  const children = item.children ?? [];
  const canNest = depth < 1;

  return (
    <div className={`border rounded p-3 ${depth > 0 ? "bg-gray-50" : "bg-white"}`}>
      <div className="flex gap-2 items-center">
        <input
          className="input flex-1"
          placeholder="Label"
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
        />
        <input
          className="input flex-1"
          placeholder="Href (ej. /servicios)"
          value={item.href}
          onChange={(e) => onChange({ ...item, href: e.target.value })}
        />
        {canNest && (
          <button
            type="button"
            onClick={() => onChange({ ...item, children: [...children, { label: "", href: "" }] })}
            className="btn-secondary text-xs"
            title="Agregar subitem"
          >
            + Sub
          </button>
        )}
        <button type="button" onClick={onRemove} className="btn-danger">×</button>
      </div>
      {children.length > 0 && (
        <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-200 pl-3">
          {children.map((c, i) => (
            <ItemRow
              key={i}
              item={c}
              depth={depth + 1}
              onChange={(next) => onChange({ ...item, children: children.map((x, j) => (j === i ? next : x)) })}
              onRemove={() => onChange({ ...item, children: children.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuEditor({ location }: { location: "header" | "footer" }) {
  const q = useQuery({ queryKey: ["adm-menus"], queryFn: async () => (await api.get("/admin/menus")).data });
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (q.data) {
      const m = q.data.find((x: any) => x.location === location);
      setItems((m?.items ?? []) as Item[]);
    }
  }, [q.data, location]);

  const save = useMutation({
    mutationFn: async () => api.put(`/admin/menus/${location}`, { items }),
    onSuccess: () => toast.success("Guardado"),
    onError: () => toast.error("Error al guardar"),
  });

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold capitalize">{location}</h2>
          <p className="text-xs text-gray-500">Soporta 1 nivel de submenú. Usá el botón <code>+ Sub</code> para agregar hijos.</p>
        </div>
        <button onClick={() => save.mutate()} className="btn-primary">Guardar</button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <ItemRow
            key={i}
            item={it}
            onChange={(next) => setItems(items.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setItems(items.filter((_, j) => j !== i))}
          />
        ))}
        <button onClick={() => setItems([...items, { label: "", href: "" }])} className="btn-secondary text-xs">
          + Agregar enlace
        </button>
      </div>
    </div>
  );
}

export default function MenusPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Menús</h1>
      <div className="space-y-6">
        <MenuEditor location="header" />
        <MenuEditor location="footer" />
      </div>
    </div>
  );
}
