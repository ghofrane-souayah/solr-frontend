import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function roleBadge(role) {
  const r = String(role || "").toUpperCase();
  if (r.includes("SUPER")) return "badge badgePurple";
  if (r.includes("ADMIN")) return "badge badgeBlue";
  return "badge badgeGray";
}
function enabledBadge(enabled) {
  return enabled ? "badge badgeGreen" : "badge badgeRed";
}

export default function Users() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const companyIdRaw = params.get("companyId");
  const companyId = companyIdRaw && String(companyIdRaw).trim() !== "" ? String(companyIdRaw).trim() : null;

  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;
  const username = useMemo(() => localStorage.getItem("username") || "—", []);

  const headers = useMemo(() => getAuthHeaders(), []);

  // data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal
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
useEffect(() => {
  if (open) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
}, [open]);

  // ✅ enterprise table controls
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  // ✅ quick actions menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const buildListUrl = useCallback(() => {
    if (isSuperAdmin && companyId) return `${API}?companyId=${encodeURIComponent(companyId)}`;
    return API;
  }, [isSuperAdmin, companyId]);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setError("Accès refusé (admin requis) ou session expirée.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(buildListUrl(), { headers });
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e) {
      setUsers([]);
      setError(e?.message === "UNAUTHORIZED" ? "Session expirée." : "Erreur chargement users.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, buildListUrl, headers]);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const actives = users.filter((u) => u.enabled).length;
    const inactives = total - actives;
    return { total, actives, inactives };
  }, [users]);

  // ✅ filter + search
  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return users.filter((u) => {
      const enabled = !!u.enabled;
      const pass =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && enabled) ||
        (statusFilter === "INACTIVE" && !enabled);

      if (!pass) return false;
      if (!norm) return true;

      const roleStr = (u.role?.name || u.role || "").toString().toLowerCase();
      return (
        String(u.username || "").toLowerCase().includes(norm) ||
        String(u.email || "").toLowerCase().includes(norm) ||
        roleStr.includes(norm)
      );
    });
  }, [users, q, statusFilter]);

  // ✅ pagination
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / rowsPerPage)), [filtered.length, rowsPerPage]);
  const paged = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => setPage(1), [q, statusFilter, rowsPerPage]);

  const openAdd = () => {
    setMode("add");
    setForm({ id: null, username: "", email: "", role: "USER", enabled: true, password: "" });
    setOpen(true);
  };

  const openEdit = (u) => {
    const role = String(u.role?.name || u.role || "USER").replace("ROLE_", "").toUpperCase();
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
      const payload = {
        username: usernameV,
        email: emailV,
        password: form.password,
        role: form.role,
        enabled: form.enabled,
        ...(isSuperAdmin && companyId ? { companyId: Number(companyId) } : {}),
      };

      if (mode === "add") {
        const res = await fetch(API, { method: "POST", headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`POST ${res.status}`);
      } else {
        const res = await fetch(`${API}/${form.id}`, { method: "PUT", headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`PUT ${res.status}`);
      }

      setOpen(false);
      await load();
    } catch {
      setError("Erreur Add/Update.");
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
      const res = await fetch(`${API}/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`DELETE ${res.status}`);
      await load();
    } catch {
      setError("Erreur suppression.");
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (u) => {
    // ✅ simple: update enabled (reutilise PUT)
    setLoading(true);
    setError("");
    try {
      const payload = {
        username: u.username,
        email: u.email,
        role: String(u.role?.name || u.role || "USER").replace("ROLE_", "").toUpperCase(),
        enabled: !u.enabled,
        password: "",
        ...(isSuperAdmin && companyId ? { companyId: Number(companyId) } : {}),
      };

      const res = await fetch(`${API}/${u.id}`, { method: "PUT", headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      await load();
    } catch {
      setError("Erreur changement status.");
    } finally {
      setLoading(false);
      setOpenMenuId(null);
    }
  };

  const scopeLabel = isSuperAdmin ? (companyId ? `Company #${companyId}` : "Global") : "My company";

  return (
    <div className="usersWrap">
      {/* ✅ Corporate header */}
     <div className="usersTop">
  <div>
    <div className="usersCrumb">
      Home <span className="dot">•</span> Account Management <span className="dot">•</span>{" "}
      <span className="muted">{scopeLabel}</span>
    </div>
  </div>

  <div className="usersTopActions">
    <button className="btn ghost" onClick={load} disabled={loading || !isAdmin}>
      ⟳ Refresh
    </button>

    {isAdmin && (
      <button className="btn primary" onClick={openAdd} disabled={loading}>
        + Add user
      </button>
    )}
  </div>
</div>
      

     {error && <div className="alert danger">{error}</div>}
      {!error && loading && <div className="alert">Loading…</div>}

      {/* ✅ KPI */}
      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Total</div>
            <div className="kpiIcon">👥</div>
          </div>
          <div className="kpiValue">{kpis.total}</div>
          <div className="kpiHint">Users in this scope</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Active</div>
            <div className="kpiIcon">✅</div>
          </div>
          <div className="kpiValue">{kpis.actives}</div>
          <div className="kpiHint">Enabled accounts</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Inactive</div>
            <div className="kpiIcon">⛔</div>
          </div>
          <div className="kpiValue">{kpis.inactives}</div>
          <div className="kpiHint">Disabled accounts</div>
        </div>
      </div>

      {/* ✅ Toolbar */}
      <div className="panel">
        <div className="panelHead">
          <div>
            <div className="panelTitle">User directory</div>
            <div className="panelSub">Search, filter and manage access</div>
          </div>

          <div className="panelTools">
            <div className="search">
              <span className="sIcon">⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username, email, role…" />
            </div>

            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>

            <select className="select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
              <option value={8}>8 / page</option>
              <option value={12}>12 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>
        </div>

        {/* ✅ Table */}
        <div className="tableCard">
          <table className="eTable">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paged.map((u) => {
                const roleText = String(u.role?.name || u.role || "USER").replace("ROLE_", "").toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="uCell">
                        <div className="avatarSm">{(u.username || "U")[0]?.toUpperCase()}</div>
                        <div>
                          <div className="uName">{u.username}</div>
                          <div className="uMeta mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td>{u.email}</td>

                    <td>
                      <span className={roleBadge(roleText)}>{roleText}</span>
                    </td>

                    <td>
                      <span className={enabledBadge(u.enabled)}>{u.enabled ? "Enabled" : "Disabled"}</span>
                    </td>

                    <td className="right">
                      <div className="rowActions">
                        <button className="btn sm primary" onClick={() => openEdit(u)} disabled={loading}>
                          Edit
                        </button>

                        <div className="menuWrap" ref={openMenuId === u.id ? menuRef : null}>
                          <button
                            className="iconKebab"
                            onClick={() => setOpenMenuId((v) => (v === u.id ? null : u.id))}
                            title="Quick actions"
                          >
                            ⋯
                          </button>

                          {openMenuId === u.id && (
                            <div className="menu">
                              <button className="menuItem" onClick={() => toggleEnabled(u)}>
                                {u.enabled ? "Disable user" : "Enable user"}
                              </button>
                              <button className="menuItem" onClick={() => openEdit(u)}>
                                Edit details
                              </button>
                              <button className="menuItem danger" onClick={() => remove(u.id)}>
                                Delete user
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paged.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="emptyRow">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        <div className="panelFoot">
          <div className="muted">
            {filtered.length} result(s) • page {page}/{Math.max(1, Math.ceil(filtered.length / rowsPerPage))}
          </div>

          <div className="pager">
            <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(1)}>
              « First
            </button>
            <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Prev
            </button>

            <span className="pagePill">{page}</span>

            <button
              className="btn sm ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
            <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Modal (ton modal existant) */}
     {open && (
  <div className="modalOverlay" onMouseDown={() => setOpen(false)}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modalHead">
        <h3 className="modalTitle">{mode === "add" ? "Add user" : "Edit user"}</h3>

        <button
          type="button"
          className="modalClose"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="modalBody">
        <div className="modalField">
          <label className="label">Username</label>
          <input
            className="input"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="Enter username"
          />
        </div>

        <div className="modalField">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Enter email"
          />
        </div>

        <div className="modalField">
          <label className="label">Role</label>
          <select
            className="select"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
          </select>
        </div>

        <div className="modalField">
          <label className="label">Status</label>
          <select
            className="select"
            value={form.enabled ? "true" : "false"}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "true" }))}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div className="modalField">
          <label className="label">
            Password {mode === "edit" ? "(leave empty to keep)" : ""}
          </label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder={mode === "edit" ? "Leave empty to keep current password" : "Enter password"}
          />
        </div>
      </div>

      <div className="modalFoot">
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>

        <button type="button" className="btn primary" onClick={submit} disabled={loading}>
          {mode === "add" ? "Create" : "Save"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
