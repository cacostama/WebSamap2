import EntityManager from "../components/EntityManager";

export default function ServicesPage() {
  return (
    <EntityManager
      title="Servicios"
      endpoint="/admin/services"
      cacheKey="adm-services"
      reorderable
      fields={[
        { key: "name", label: "Nombre" },
        { key: "icon", label: "Icono", kind: "icon" },
        { key: "description", label: "Descripción", kind: "textarea" },
        { key: "body", label: "Cuerpo (HTML)", kind: "textarea" },
      ]}
    />
  );
}
