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

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useMemo(() => getRoles(), []);
  const user = useMemo(() => getUser(), []);

  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;

  const email =
    user?.email ||
    localStorage.getItem("username") ||
    "ghofrane@gmail.com";

  const username =
    user?.username ||
    localStorage.getItem("username") ||
    "User";

  const roleLabel = roles[0] || "ADMIN";
  const initial = (email?.[0] || username?.[0] || "U").toUpperCase();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) =>
    isActive ? "menuItem active" : "menuItem";

  const title = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/dashboard")) return "Account Management";
    if (p.startsWith("/users")) return "Users";
    if (p.startsWith("/companies")) return "Companies";
    if (p.startsWith("/solr-cluster")) return "Solr Cluster";
    if (p.startsWith("/solr/server")) return "Nodes";
    if (p.startsWith("/solr-schema")) return "Solr Schema";
    if (p.startsWith("/profile")) return "Account";
    return "Solr Admin";
  }, [location.pathname]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div
          className="sidebarTop"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <div className="brand">
            <div className="brandIcon">
              <DatabaseIcon />
            </div>

            <div>
              <div className="brandTitle">Solr Admin</div>
              <div className="brandSubtitle">Monitoring Platform</div>
            </div>
          </div>
        </div>

        <div className="sidebarBody">
          <div className="menuSection">
            <div className="menuLabel">ADMINISTRATION</div>

            {isAdmin && (
              <NavLink to="/solr-cluster" className={navClass}>
                <span className="menuIcon">
                  <ClusterIcon />
                </span>
                <span>Cluster</span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/dashboard" className={navClass}>
                <span className="menuIcon">
                  <GridIcon />
                </span>
                <span>Account Management</span>
                <span className="menuArrow">
                  <ChevronRightIcon />
                </span>
              </NavLink>
            )}
          </div>

          <div className="menuSection">
            <div className="menuLabel">PERSONNEL</div>

            <NavLink to="/profile" className={navClass}>
              <span className="menuIcon">
                <UserIcon />
              </span>
              <span>Account</span>
            </NavLink>
          </div>
        </div>

        <div className="sidebarBottom">
          <div className="profileBox">
            <div className="avatar">{initial}</div>

            <div className="profileInfo">
              <div className="profileEmail">{email}</div>
              <div className="profileRole">{roleLabel}</div>
            </div>
          </div>

          <button className="logoutBtn" onClick={logout} type="button">
            <span className="logoutIcon">
              <LogoutIcon />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbarTitle">{title}</div>

          <div className="topbarRight">
            <div className="headerPill onlinePill">
              <span className="statusDot"></span>
              <span>Online</span>
            </div>

            <div className="headerPill adminPill">
              <ShieldIcon />
              <span>
                {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "User"}
              </span>
            </div>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9">
      <ellipse cx="12" cy="5" rx="7" ry="3.2" />
      <path d="M5 5v6c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V5" />
      <path d="M5 11v6c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-6" />
    </svg>
  );
}

function ClusterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="10" y="3" width="4" height="4" rx="1" />
      <rect x="4" y="16" width="4" height="4" rx="1" />
      <rect x="16" y="16" width="4" height="4" rx="1" />
      <path d="M12 7v4M12 11H6v5M12 11h6v5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
      <path d="M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}