import SimpleCrud from "../components/SimpleCrud";

export default function ServicesPage() {
  return (
    <SimpleCrud
      title="Servicios"
      endpoint="/admin/services"
      cacheKey="adm-services"
      fields={[
        { key: "name", label: "Nombre" },
        { key: "icon", label: "Icono" },
        { key: "description", label: "Descripción", kind: "textarea" },
        { key: "body", label: "Cuerpo (HTML)", kind: "textarea" },
      ]}
    />
  );
}
