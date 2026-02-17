import { Navigate, useLocation } from "react-router-dom";

function getRoles() {
  try {
    const raw = localStorage.getItem("roles");
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr : [])
      .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function RequireAuth({ children, allow = [] }) {
  const token = localStorage.getItem("token");
  const roles = getRoles();
  const loc = useLocation();

  // 1) Pas de token => login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // 2) Si allow est fourni => vérifier rôle
  if (allow.length > 0) {
    const ok = roles.some((r) => allow.includes(r));
    if (!ok) return <Navigate to="/forbidden" replace />;
  }

  return children;
}
