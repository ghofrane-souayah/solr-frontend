import { useEffect, useMemo, useState } from "react";
import "./Users.css"; // tu peux réutiliser le style

const API = "http://localhost:8081/api/companies";

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

export default function Companies() {
  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(API, { headers });
      if (res.status === 401 || res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setErr(e.message === "FORBIDDEN" ? "Accès réservé au SUPER_ADMIN." : "Erreur chargement companies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      setErr("Accès réservé au SUPER_ADMIN.");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!isSuperAdmin) return;
    const n = name.trim();
    if (!n) return;

    setLoading(true);
    setErr("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setName("");
      await load();
    } catch (e) {
      setErr("Erreur création (nom existe déjà ?).");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Supprimer cette company ?")) return;

    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE", headers });
      if (res.status === 409) throw new Error("HAS_USERS");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setErr(e.message === "HAS_USERS" ? "Impossible: company contient des users." : "Erreur suppression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usersPage">
      <div className="usersHeader">
        <div>
          <div className="usersTitle">Companies</div>
          <div className="usersSub">SUPER_ADMIN uniquement</div>
        </div>

        <div className="usersActions">
          <button className="btn" onClick={load} disabled={loading || !isSuperAdmin}>Refresh</button>
        </div>
      </div>

      {err && <div className="alert danger">{err}</div>}

      {isSuperAdmin && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Nom company (ex: Company A)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn primary" onClick={create} disabled={loading}>+ Create</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>NAME</th>
              <th>CODE</th>
              <th className="right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td><b>{c.code}</b></td>
                <td className="right">
                  <button className="btn sm danger" onClick={() => remove(c.id)} disabled={loading}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="emptyRow">Aucune company.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="alert">Chargement…</div>}
    </div>
  );
}
