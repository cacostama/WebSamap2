import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="container-x py-20 text-center">
      <h1 className="text-5xl font-bold text-primary">404</h1>
      <p className="mt-2">La página que buscás no existe.</p>
      <Link to="/" className="btn-primary mt-6 inline-block">Ir al inicio</Link>
    </section>
  );
}
