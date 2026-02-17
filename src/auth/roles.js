export function getRoles() {
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

export function hasRole(...wanted) {
  const roles = getRoles();
  return wanted.some((r) => roles.includes(r));
}
