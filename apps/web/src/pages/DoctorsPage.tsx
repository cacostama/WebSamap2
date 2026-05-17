import DoctorList from "../blocks/DoctorList";

export default function DoctorsPage() {
  return (
    <>
      <section className="bg-primary text-white py-12">
        <div className="container-x">
          <h1 className="text-3xl md:text-4xl font-bold">Guía Médica</h1>
          <p className="opacity-90 mt-1">Encontrá a tu profesional por nombre o especialidad.</p>
        </div>
      </section>
      <DoctorList showSearch />
    </>
  );
}
