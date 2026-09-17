import { NavLink, Outlet } from "react-router-dom";
import logo from "../assets/logo-maisfarda.jpg";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const navItems = [
  { to: "/admin/produtos", label: "Produtos" },
  { to: "/admin/cores", label: "Cores" },
  { to: "/admin/malhas", label: "Malhas" },
  { to: "/admin/calculadora", label: "Calculadora" },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/configuracoes", label: "Configurações" },
];

export function Layout() {
  return (
    <div className="admin-shell">
      <nav className="nav">
        <img src={logo} alt="Mais Farda" style={{ height: 32, width: "auto", objectFit: "contain" }} />
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
        <a href="/" style={{ marginLeft: "auto" }}>
          Ver catálogo público ↗
        </a>
      </nav>

      {!isSupabaseConfigured && (
        <div className="config-warning">
          <strong>Supabase não configurado.</strong> Crie um arquivo <code>.env</code> com{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja{" "}
          <code>.env.example</code>). As telas carregam, mas as chamadas à API vão falhar até isso
          ser configurado.
        </div>
      )}

      <div className="wrap">
        <Outlet />
      </div>
    </div>
  );
}
