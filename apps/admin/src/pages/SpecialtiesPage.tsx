import SimpleCrud from "../components/SimpleCrud";

export default function SpecialtiesPage() {
  return (
    <SimpleCrud
      title="Especialidades"
      endpoint="/admin/specialties"
      cacheKey="adm-specialties"
      fields={[
        { key: "name", label: "Nombre" },
        { key: "icon", label: "Icono (emoji o nombre)" },
        { key: "description", label: "Descripción", kind: "textarea" },
      ]}
    />
  );
}
