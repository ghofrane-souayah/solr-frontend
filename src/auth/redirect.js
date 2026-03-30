
export function redirectAfterAuth(nav) {
  let roles = [];

  try {
    roles = JSON.parse(localStorage.getItem("roles") || "[]");
  } catch {
    roles = [];
  }

  const normalized = roles
    .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
    .filter(Boolean);

  const isSuperAdmin = normalized.includes("SUPER_ADMIN");
  const isAdmin = normalized.includes("ADMIN");
  const isUser = normalized.includes("USER");

  if (isSuperAdmin || isAdmin || isUser) {
    nav("/solr-cluster");
    return;
  }

  nav("/forbidden");
}