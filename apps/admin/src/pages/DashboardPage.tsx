import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function DashboardPage() {
  const q = useQuery({
    queryKey: ["dash"],
    queryFn: async () => {
      const [apt, msg, doc] = await Promise.all([
        api.get("/admin/appointments"),
        api.get("/admin/contact-messages"),
        api.get("/admin/doctors"),
      ]);
      return {
        appointmentsPending: apt.data.filter((a: any) => a.status === "pendiente").length,
        appointmentsTotal: apt.data.length,
        messagesNew: msg.data.filter((m: any) => m.status === "nuevo").length,
        doctorsTotal: doc.data.length,
      };
    },
  });
  const d = q.data;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inicio</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/appointments" className="card p-5 hover:shadow">
          <div className="text-xs text-gray-500">Turnos pendientes</div>
          <div className="text-3xl font-bold text-brand">{d?.appointmentsPending ?? "—"}</div>
          <div className="text-xs text-gray-400 mt-1">de {d?.appointmentsTotal ?? 0} totales</div>
        </Link>
        <Link to="/messages" className="card p-5 hover:shadow">
          <div className="text-xs text-gray-500">Mensajes nuevos</div>
          <div className="text-3xl font-bold text-brand">{d?.messagesNew ?? "—"}</div>
        </Link>
        <Link to="/doctors" className="card p-5 hover:shadow">
          <div className="text-xs text-gray-500">Médicos</div>
          <div className="text-3xl font-bold text-brand">{d?.doctorsTotal ?? "—"}</div>
        </Link>
        <a
          href={(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? window.location.origin}
          target="_blank"
          rel="noreferrer"
          className="card p-5 hover:shadow flex flex-col justify-center"
        >
          <div className="text-sm font-semibold">Ver sitio público →</div>
        </a>
      </div>
    </div>
  );
}
