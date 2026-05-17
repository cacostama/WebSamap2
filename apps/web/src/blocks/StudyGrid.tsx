import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { StudyGridProps } from "@sa/shared/blocks";

export default function StudyGrid({ columns = 3, showCount }: StudyGridProps) {
  const { data } = useQuery({
    queryKey: ["studies"],
    queryFn: async () => (await api.get("/public/studies")).data,
  });
  const items = showCount ? (data ?? []).slice(0, showCount) : data ?? [];
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[columns];
  return (
    <section className="container-x py-12">
      <div className={`grid grid-cols-1 ${cols} gap-5`}>
        {items.map((s: any) => (
          <div key={s.id} className="bg-white border rounded p-5 hover:shadow transition">
            <h3 className="font-semibold text-primary">{s.name}</h3>
            {s.description && <p className="text-sm text-gray-600 mt-2">{s.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
