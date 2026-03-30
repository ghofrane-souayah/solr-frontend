import { Navigate, Outlet, useLocation } from "react-router-dom";

function normalizeRoles(rawRoles) {
  return (Array.isArray(rawRoles) ? rawRoles : [])
    .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
    .filter(Boolean);
}

export default function RequireAuth({ allow, children }) {
  const location = useLocation();

  const token = localStorage.getItem("token");

  let roles = [];
  try {
    roles = normalizeRoles(JSON.parse(localStorage.getItem("roles") || "[]"));
  } catch {
    roles = [];
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && allow.length > 0) {
    const allowed = allow.map((r) => String(r).toUpperCase());
    const ok = roles.some((r) => allowed.includes(r));

    if (!ok) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children ? children : <Outlet />;
}