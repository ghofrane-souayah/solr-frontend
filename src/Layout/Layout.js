import { Outlet, NavLink, useNavigate } from "react-router-dom";
import "./Layout.css";

export default function Layout() {

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
const isAdmin = user?.role === "ADMIN";
  const logout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Solr Admin</div>

        <nav className="nav">
          <NavLink to="/solr-cluster">Dashboard</NavLink>
          {isAdmin && <NavLink to="/users">Gestion Comptes</NavLink>}
        </nav>

        <div className="footer">
          <div className="userbox">
            <div className="email">{user?.email}</div>
            <div className="role">{user?.role}</div>
          </div>
          <button className="logout" onClick={logout}>Logout</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="title">Monitoring & Management</div>
          <div className="subtitle" style={{ margin: 0 }}>
            {user?.email}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}