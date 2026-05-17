import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { AppointmentFormProps } from "@sa/shared/blocks";

export default function AppointmentForm({ heading = "Solicitar turno", defaultSpecialtyId }: AppointmentFormProps) {
  const specs = useQuery({ queryKey: ["specialties"], queryFn: async () => (await api.get("/public/specialties")).data });
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    specialtyId: defaultSpecialtyId ?? "",
    preferredAt: "",
    message: "",
  });
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      await api.post("/public/appointments", {
        ...form,
        specialtyId: form.specialtyId ? Number(form.specialtyId) : undefined,
        preferredAt: form.preferredAt || undefined,
      });
      setState("ok");
      setForm({ name: "", phone: "", email: "", specialtyId: "", preferredAt: "", message: "" });
    } catch {
      setState("error");
    }
  }

  return (
    <section className="container-x py-12">
      <h2 className="text-2xl font-bold mb-6 text-primary">{heading}</h2>
      <form onSubmit={submit} className="grid gap-4 max-w-2xl">
        <div>
          <label htmlFor="appt-name" className="block text-sm font-medium mb-1">Nombre completo</label>
          <input id="appt-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2 w-full" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="appt-phone" className="block text-sm font-medium mb-1">Teléfono</label>
            <input id="appt-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label htmlFor="appt-email" className="block text-sm font-medium mb-1">Email</label>
            <input id="appt-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded px-3 py-2 w-full" />
          </div>
        </div>
        <div>
          <label htmlFor="appt-specialty" className="block text-sm font-medium mb-1">Especialidad (opcional)</label>
          <select id="appt-specialty" value={form.specialtyId} onChange={(e) => setForm({ ...form, specialtyId: e.target.value })} className="border rounded px-3 py-2 w-full">
            <option value="">Seleccionar especialidad</option>
            {(specs.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="appt-datetime" className="block text-sm font-medium mb-1">Fecha y hora preferidas</label>
          <input id="appt-datetime" type="datetime-local" value={form.preferredAt} onChange={(e) => setForm({ ...form, preferredAt: e.target.value })} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label htmlFor="appt-message" className="block text-sm font-medium mb-1">Mensaje / detalles</label>
          <textarea id="appt-message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="border rounded px-3 py-2 w-full" />
        </div>
        <button disabled={state === "loading"} className="btn-primary self-start">
          {state === "loading" ? "Enviando…" : "Solicitar turno"}
        </button>
        {state === "ok" && <p className="text-green-700">¡Solicitud recibida! Te contactaremos para confirmar el turno.</p>}
        {state === "error" && <p className="text-red-700">Error al enviar. Intentá nuevamente.</p>}
      </form>
    </section>
  );
}
