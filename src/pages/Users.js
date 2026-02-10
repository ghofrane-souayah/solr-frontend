import { useEffect, useMemo, useState } from "react";
import "./Users.css";

const API = "http://localhost:8081/api/users";

export default function Users() {
  const me = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const isAdmin = (me?.role === "ADMIN") || (me?.role === "ROLE_ADMIN");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add"); // add | edit
  const [form, setForm] = useState({
    id: null,
    username: "",
    email: "",
    role: "USER",
    enabled: true,
    password: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement des utilisateurs.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    setMode("edit");
    setForm({
      id: u.id,
      username: u.username || "",
      email: u.email || "",
      role: (u.role?.name ? u.role.name : u.role) || "USER", // ✅ Role enum ou string
      enabled: !!u.enabled,
      password: "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!isAdmin) return;

    const username = form.username.trim();
    const email = form.email.trim();

    if (!username || !email) {
      setError("Username et Email sont obligatoires.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "add") {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password: form.password,
            role: form.role,      // "ADMIN" | "USER"
            enabled: form.enabled // boolean
          }),
        });
        if (!res.ok) throw new Error(`POST HTTP ${res.status}`);
      } else {
        const res = await fetch(`${API}/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password: form.password, // optionnel
            role: form.role,
            enabled: form.enabled
          }),
        });
        if (!res.ok) throw new Error(`PUT HTTP ${res.status}`);
      }

      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur Add/Update. Vérifie les endpoints backend.");
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
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE HTTP ${res.status}`);
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur suppression.");
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
            Connecté : <b>{me?.email || me?.username || "—"}</b> ({me?.role || "—"})
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
              <th>ROLE</th>
              <th>ENABLED</th>
              <th className="right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = u.role?.name ? u.role.name : u.role; // enum ou string
              return (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{role}</td>
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
              <button className="iconBtn" onClick={() => setOpen(false)}>✕</button>
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
              <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
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
