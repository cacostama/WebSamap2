import NewsGrid from "../blocks/NewsGrid";

export default function NewsListPage() {
  return (
    <>
      <section className="bg-primary text-white py-12">
        <div className="container-x"><h1 className="text-3xl md:text-4xl font-bold">Noticias</h1></div>
      </section>
      <NewsGrid limit={50} columns={3} />
    </>
  );
}
