import EntityManager from "../components/EntityManager";

export default function SpecialtiesPage() {
  return (
    <EntityManager
      title="Especialidades"
      endpoint="/admin/specialties"
      cacheKey="adm-specialties"
      reorderable
      fields={[
        { key: "name", label: "Nombre" },
        { key: "icon", label: "Icono", kind: "icon" },
        { key: "description", label: "Descripción", kind: "textarea" },
      ]}
    />
  );
}
