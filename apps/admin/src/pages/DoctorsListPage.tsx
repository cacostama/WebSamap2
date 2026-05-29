import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";
import DataTable, { type DataTableColumn } from "../components/DataTable";
import { useConfirm } from "../components/ConfirmDialog";

interface Doctor {
  id: number;
  name: string;
  photoUrl?: string | null;
  photo_url?: string | null;
  specialties?: { name: string }[];
}

export default function DoctorsListPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["adm-doctors"], queryFn: async () => (await api.get("/admin/doctors")).data });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/doctors/${id}`),
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["adm-doctors"] }); },
    onError: () => toast.error("Error al eliminar"),
  });

  const specNames = (d: Doctor) => (d.specialties ?? []).map((s) => s.name).join(", ");

  const columns: DataTableColumn<Doctor>[] = [
    {
      key: "name",
      header: "Médico",
      sortable: true,
      accessor: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
            {(d.photoUrl ?? d.photo_url) ? <img src={(d.photoUrl ?? d.photo_url) as string} alt={d.name} className="w-full h-full object-cover" /> : null}
          </div>
          <span className="font-semibold">{d.name}</span>
        </div>
      ),
    },
    {
      key: "specialties",
      header: "Especialidades",
      accessor: (d) => specNames(d),
      render: (d) => <span className="text-sm text-gray-600">{specNames(d) || "Sin especialidades"}</span>,
    },
  ];

  async function askDelete(d: Doctor) {
    if (await confirm({ title: "Eliminar", message: `¿Eliminar a "${d.name}"? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true })) {
      del.mutate(d.id);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Médicos</h1>
        <Link to="/doctors/new" className="btn-primary">+ Nuevo</Link>
      </div>
      <DataTable<Doctor>
        columns={columns}
        rows={list.data ?? []}
        getRowId={(d) => d.id}
        loading={list.isLoading}
        searchPlaceholder="Buscar médico o especialidad…"
        searchKeys={["name", "specialties"]}
        actions={(d) => (
          <div className="flex gap-2 justify-end">
            <Link to={`/doctors/${d.id}`} className="btn-secondary">Editar</Link>
            <button onClick={() => askDelete(d)} className="btn-danger">Eliminar</button>
          </div>
        )}
      />
    </div>
  );
}
