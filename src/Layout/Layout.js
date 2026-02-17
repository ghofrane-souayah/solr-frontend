import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import "./Layout.css";

function getRoles() {
  try {
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");
    return (Array.isArray(roles) ? roles : [])
      .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) => (isActive ? "navItem active" : "navItem");

  // ✅ titre dynamique (optionnel mais pro)
  const title = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/dashboard")) return "Dashboard";
    if (p.startsWith("/users")) return "Users";
    if (p.startsWith("/companies")) return "Companies";
    if (p.startsWith("/solr-cluster")) return "Solr Cluster";
    if (p.startsWith("/solr/server")) return "Solr Server";
    if (p.startsWith("/solr-schema")) return "Solr Schema";
    return "Solr Admin";
  }, [location.pathname]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
          Solr Admin
        </div>
 {isAdmin && (
            <NavLink to="/solr-cluster" className={navClass}>
              Cluster
            </NavLink>
          )}

        <nav className="nav">
          {isAdmin && (
            <NavLink to="/dashboard" className={navClass}>
            Account management
            </NavLink>
          )}

         
          <NavLink to="/profile" className={navClass}>
  Account
</NavLink>

        </nav>

        <button className="logoutBtn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="title">{title}</div>
          <div className="userBadge">
            {localStorage.getItem("username") || "User"}{" "}
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              ({roles.join(", ") || "—"})
            </span>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
