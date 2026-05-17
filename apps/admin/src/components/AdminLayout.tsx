import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/", label: "Inicio", icon: "🏠", end: true },
  { to: "/settings", label: "Branding y settings", icon: "🎨" },
  { to: "/pages", label: "Páginas", icon: "📄" },
  { to: "/menus", label: "Menús", icon: "🧭" },
  { to: "/doctors", label: "Médicos", icon: "👨‍⚕️" },
  { to: "/specialties", label: "Especialidades", icon: "🩺" },
  { to: "/services", label: "Servicios", icon: "🏥" },
  { to: "/studies", label: "Estudios", icon: "🔬" },
  { to: "/news", label: "Noticias", icon: "📰" },
  { to: "/appointments", label: "Turnos", icon: "📅" },
  { to: "/messages", label: "Mensajes", icon: "✉️" },
  { to: "/media", label: "Multimedia", icon: "🖼️" },
  { to: "/users", label: "Usuarios", icon: "👥" },
];

export default function AdminLayout() {
  const nav = useNavigate();
  function logout() {
    localStorage.removeItem("token");
    nav("/login");
  }
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-brand text-white flex flex-col">
        <div className="px-4 py-4 border-b border-white/20">
          <div className="font-bold">Sanatorio Adventista</div>
          <div className="text-xs opacity-75">Panel de administración</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm ${isActive ? "bg-white/15 font-semibold" : "hover:bg-white/10"}`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="m-3 text-sm bg-white/10 hover:bg-white/20 rounded py-2">
          Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
