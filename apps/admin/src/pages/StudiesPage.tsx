import SimpleCrud from "../components/SimpleCrud";

export default function StudiesPage() {
  return (
    <SimpleCrud
      title="Estudios"
      endpoint="/admin/studies"
      cacheKey="adm-studies"
      fields={[
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción", kind: "textarea" },
        { key: "body", label: "Cuerpo (HTML)", kind: "textarea" },
      ]}
    />
  );
}
