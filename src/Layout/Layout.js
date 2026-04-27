import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;
  const isUser = roles.includes("USER") && !isAdmin;

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

  const openLogoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const closeLogoutConfirm = () => {
    setShowLogoutConfirm(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    setShowLogoutConfirm(false);
    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) =>
    isActive ? "menuItem active" : "menuItem";

  const title = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/dashboard")) return "Dashboard";
    if (p.startsWith("/users")) return "Gestion Des Utilisateurs";
    if (p.startsWith("/companies")) return "Gestion Des Compagnies";
    if (p.startsWith("/reports")) return "Gestion Des Rapports";
    if (p.startsWith("/solr-cluster")) return "Solr Cluster";
    if (p.startsWith("/solr/server")) return "Détails du serveur";
    if (p.startsWith("/solr-schema")) return "Schema";
    if (p.startsWith("/profile")) return "Profil";
    if (p.startsWith("/alerts")) return "Alertes & Notifications";
    return "Solr Admin";
  }, [location.pathname]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
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

            {(isAdmin || isUser) && (
              <NavLink to="/solr-cluster" className={navClass}>
                <span className="menuIcon">
                  <ClusterIcon />
                </span>
                <span>CLUSTERS</span>
              </NavLink>
            )}

            {isSuperAdmin && (
              <NavLink to="/companies" className={navClass}>
                <span className="menuIcon">
                  <BuildingIcon />
                </span>
                <span>GESTION DES COMPAGNIES</span>
                <span className="menuArrow">
                  <ChevronRightIcon />
                </span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/users" className={navClass}>
                <span className="menuIcon">
                  <UsersIcon />
                </span>
                <span>GESTION DES UTILISATEURS</span>
                <span className="menuArrow">
                  <ChevronRightIcon />
                </span>
              </NavLink>
            )}

            {(isAdmin || isUser) && (
              <NavLink to="/reports" className={navClass}>
                <span className="menuIcon">
                  <ReportIcon />
                </span>
                <span>GESTION DES RAPPORTS</span>
                <span className="menuArrow">
                  <ChevronRightIcon />
                </span>
              </NavLink>
            )}

            {(isAdmin || isUser) && (
              <NavLink to="/alerts" className={navClass}>
                <span className="menuIcon">
                  <BellIcon />
                </span>
                <span>ALERTES</span>
                <span className="menuArrow">
                  <ChevronRightIcon />
                </span>
              </NavLink>
            )}
          </div>

          <div className="menuSection">
            <div className="menuLabel">PROFIL</div>

            <NavLink
              to="/profile#personal"
              className={() =>
                location.pathname === "/profile" &&
                (location.hash === "" || location.hash === "#personal")
                  ? "menuItem active"
                  : "menuItem"
              }
            >
              <span className="menuIcon">
                <UserIcon />
              </span>
              <span>INFORMATIONS PERSONNELLES</span>
            </NavLink>

            <NavLink
              to="/profile#security"
              className={() =>
                location.pathname === "/profile" && location.hash === "#security"
                  ? "menuItem active"
                  : "menuItem"
              }
            >
              <span className="menuIcon">
                <ShieldIcon />
              </span>
              <span>SÉCURITÉ</span>
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

          <button className="logoutBtn" onClick={openLogoutConfirm} type="button">
            <span className="logoutIcon">
              <LogoutIcon />
            </span>
            <span>Déconnecter</span>
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

      {showLogoutConfirm && (
        <div className="logoutModalOverlay" onClick={closeLogoutConfirm}>
          <div
            className="logoutModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logoutModalTitle">Confirmation</div>
            <div className="logoutModalText">
              Voulez-vous vraiment vous déconnecter ?
            </div>

            <div className="logoutModalActions">
              <button
                type="button"
                className="modalBtn ghost"
                onClick={closeLogoutConfirm}
              >
                Annuler
              </button>

              <button
                type="button"
                className="modalBtn danger"
                onClick={logout}
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
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

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14" />
      <path d="M16 20v-8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8" />
      <path d="M8 9h.01M12 9h.01M8 13h.01M12 13h.01" />
      <path d="M10 20v-3h2v3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M4 19c1.4-2.8 3.5-4.2 6-4.2s4.6 1.4 6 4.2" />
      <path d="M15 18c.8-1.7 2.2-2.8 4-3.2" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h2" />
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 17h12" />
      <path d="M8 17V10a4 4 0 1 1 8 0v7" />
      <path d="M10 20a2 2 0 0 0 4 0" />
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