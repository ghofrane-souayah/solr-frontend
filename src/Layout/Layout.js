import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("username");
    navigate("/login", { replace: true });
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">Solr Admin</div>

        <nav className="nav">
          <NavLink to="/solr-cluster" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Cluster
          </NavLink>

          

          <NavLink to="/users" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Users
          </NavLink>
        </nav>

        <button className="logoutBtn" onClick={logout}>Logout</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="title">Dashboard</div>
          <div className="userBadge">{localStorage.getItem("username") || "User"}</div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
