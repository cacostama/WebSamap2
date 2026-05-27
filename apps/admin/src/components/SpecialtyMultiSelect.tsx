import { useEffect, useMemo, useRef, useState } from "react";

export interface SpecialtyOption {
  id: number;
  name: string;
  slug?: string;
}

interface Props {
  options: SpecialtyOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  onCreateNew?: (initialName?: string) => void;
  placeholder?: string;
}

/** Combobox con búsqueda + chips. Ordena las opciones alfabéticamente. */
export default function SpecialtyMultiSelect({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Buscar o agregar especialidad…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click afuera cierra el dropdown
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [options],
  );
  const byId = useMemo(() => new Map(sorted.map((s) => [s.id, s])), [sorted]);
  const selected = value.map((id) => byId.get(id)).filter(Boolean) as SpecialtyOption[];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.filter((s) => !value.includes(s.id));
    return sorted.filter(
      (s) =>
        !value.includes(s.id) &&
        (s.name.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q)),
    );
  }, [sorted, value, query]);

  function add(id: number) {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  }
  function remove(id: number) {
    onChange(value.filter((x) => x !== id));
  }

  const exactMatch = filtered.find((s) => s.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = onCreateNew && query.trim().length >= 2 && !exactMatch;

  return (
    <div ref={wrapRef} className="relative">
      {/* Chips de seleccionadas */}
      <div
        className={`min-h-[44px] w-full border rounded px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text ${open ? "ring-2 ring-brand/30" : ""}`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 bg-brand text-white text-xs rounded-full px-2.5 py-1"
          >
            {s.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(s.id);
              }}
              className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
              aria-label={`Quitar ${s.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && selected.length) {
              remove(selected[selected.length - 1].id);
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) add(filtered[0].id);
              else if (canCreate) onCreateNew?.(query.trim());
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={selected.length ? "" : placeholder}
          className="flex-1 min-w-[120px] outline-none text-sm py-1"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-xs text-gray-500">
              {query ? "Sin resultados" : "No hay más especialidades para agregar"}
            </div>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => add(s.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 hover:text-brand"
            >
              {s.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                onCreateNew?.(query.trim());
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 text-sm border-t bg-blue-50 hover:bg-blue-100 text-brand font-medium"
            >
              + Crear nueva especialidad: <strong>“{query.trim()}”</strong>
            </button>
          )}
          {!canCreate && onCreateNew && (
            <button
              type="button"
              onClick={() => onCreateNew?.()}
              className="w-full text-left px-3 py-2 text-sm border-t text-brand hover:bg-gray-50"
            >
              + Agregar otra especialidad…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
