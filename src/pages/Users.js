import { useEffect, useMemo, useState } from "react";
import "./Users.css";

const API = "http://localhost:8081/api/users";

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

export default function Users() {
  const roles = useMemo(() => getRoles(), []);
  const isAdmin = roles.includes("ADMIN");
  const username = useMemo(() => localStorage.getItem("username") || "—", []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({
    id: null,
    username: "",
    email: "",
    role: "USER",
    enabled: true,
    password: "",
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API, { headers: authHeaders });
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
      setError(
        e?.message === "UNAUTHORIZED"
          ? "Accès refusé (admin requis) ou session expirée."
          : "Erreur lors du chargement des utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setMode("add");
    setForm({
      id: null,
      username: "",
      email: "",
      role: "USER",
      enabled: true,
      password: "",
    });
    setOpen(true);
  };

  const openEdit = (u) => {
    const role =
      Array.isArray(u.roles) && u.roles.length
        ? String(u.roles[0]).replace("ROLE_", "").toUpperCase()
        : String(u.role?.name || u.role || "USER").replace("ROLE_", "").toUpperCase();

    setMode("edit");
    setForm({
      id: u.id,
      username: u.username || "",
      email: u.email || "",
      role,
      enabled: u.enabled ?? true,
      password: "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!isAdmin) return;

    const usernameV = form.username.trim();
    const emailV = form.email.trim();

    if (!usernameV || !emailV) {
      setError("Username et Email sont obligatoires.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "add") {
        const res = await fetch(API, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            username: usernameV,
            email: emailV,
            password: form.password,
            role: form.role,
            enabled: form.enabled,
          }),
        });
        if (!res.ok) throw new Error(`POST HTTP ${res.status}`);
      } else {
        const res = await fetch(`${API}/${form.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            username: usernameV,
            email: emailV,
            password: form.password,
            role: form.role,
            enabled: form.enabled,
          }),
        });
        if (!res.ok) throw new Error(`PUT HTTP ${res.status}`);
      }

      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur Add/Update. Vérifie endpoints backend (POST/PUT /api/users).");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Supprimer cet utilisateur ?")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error(`DELETE HTTP ${res.status}`);
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur suppression. Vérifie endpoint DELETE /api/users/{id}.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usersPage">
      <div className="usersHeader">
        <div>
          <div className="usersTitle">Gestion Des Comptes</div>
          <div className="usersSub">
            Connecté : <b>{username}</b> (roles: <b>{roles.join(", ") || "—"}</b>)
          </div>
        </div>

        <div className="usersActions">
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>

          {isAdmin && (
            <button className="btn primary" onClick={openAdd} disabled={loading}>
              + Add
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}
      {!error && loading && <div className="alert">Chargement…</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>USERNAME</th>
              <th>EMAIL</th>
              <th>ROLE(S)</th>
              <th>ENABLED</th>
              <th className="right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const rolesDisplay = Array.isArray(u.roles)
                ? u.roles.join(", ")
                : (u.role?.name || u.role || "—");

              return (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{rolesDisplay}</td>
                  <td>{u.enabled ? "Yes" : "No"}</td>
                  <td className="right">
                    {isAdmin ? (
                      <>
                        <button className="btn sm" onClick={() => openEdit(u)} disabled={loading}>
                          Edit
                        </button>{" "}
                        <button className="btn sm danger" onClick={() => remove(u.id)} disabled={loading}>
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="emptyRow">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modalOverlay" onMouseDown={() => setOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">{mode === "add" ? "Ajouter" : "Modifier"} un utilisateur</div>
              <button className="iconBtn" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modalBody">
              <label className="label">
                Username
                <input
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                />
              </label>

              <label className="label">
                Email
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <label className="label">
                Role
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </label>

              <label className="label">
                Enabled
                <select
                  className="input"
                  value={form.enabled ? "true" : "false"}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "true" }))}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label className="label">
                Password {mode === "edit" ? "(laisser vide = ne change pas)" : ""}
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </label>
            </div>

            <div className="modalFoot">
              <button className="btn ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={submit} disabled={loading}>
                {mode === "add" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
