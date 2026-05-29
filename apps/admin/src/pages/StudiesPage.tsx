import EntityManager from "../components/EntityManager";

export default function StudiesPage() {
  return (
    <EntityManager
      title="Estudios"
      endpoint="/admin/studies"
      cacheKey="adm-studies"
      reorderable
      fields={[
        { key: "name", label: "Nombre" },
        { key: "category", label: "Categoría", kind: "select", options: [
          { value: "laboratorio", label: "Laboratorio" },
          { value: "imagenes", label: "Estudios por imágenes" },
        ] },
        { key: "description", label: "Descripción", kind: "textarea" },
        { key: "body", label: "Cuerpo (HTML)", kind: "textarea" },
      ]}
    />
  );
}
