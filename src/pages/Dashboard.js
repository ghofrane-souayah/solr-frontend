import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_COMPANIES = "http://localhost:8081/api/companies";
const API_USERS = "http://localhost:8081/api/users";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ KPI stats (scope حسب الدور)
  const [stats, setStats] = useState({ total: 0, actives: 0, inactives: 0 });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const [companyStatus, setCompanyStatus] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // ✅ Add company modal
  const [openAddCompany, setOpenAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", code: "" });
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  // ✅ load companies: SUPER_ADMIN -> /api/companies | ADMIN -> /api/companies/me
  const loadCompanies = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setErr("");

    try {
      const url = isSuperAdmin ? API_COMPANIES : `${API_COMPANIES}/me`;

      const res = await fetch(url, { headers: authHeaders });
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // normalize to array
      const list = Array.isArray(data) ? data : data ? [data] : [];

      setCompanies(list);
      setPage(1);
    } catch (e) {
      setCompanies([]);
      setErr(e?.message === "UNAUTHORIZED" ? "Session expirée." : "Erreur chargement companies.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ load stats: SUPER_ADMIN -> global users | ADMIN -> users of his company only
  const loadStats = async () => {
    try {
      // if ADMIN: need company id first
      let url = API_USERS;

      if (!isSuperAdmin) {
        // get my company to filter users
        const cRes = await fetch(`${API_COMPANIES}/me`, { headers: authHeaders });
        if (!cRes.ok) return;
        const c = await cRes.json();
        if (!c?.id) return;
        url = `${API_USERS}?companyId=${encodeURIComponent(c.id)}`;
      }

      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) return;

      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      const total = arr.length;
      const actives = arr.filter((u) => u.enabled).length;
      const inactives = total - actives;
      setStats({ total, actives, inactives });
    } catch {}
  };

  const loadCompanyStatuses = async (list) => {
    // ✅ SUPER_ADMIN -> calc status pour كل الشركات
    // ✅ ADMIN -> calc status للشركة الوحيدة
    if (!isAdmin) return;

    try {
      const entries = await Promise.all(
        list.map(async (c) => {
          try {
            const res = await fetch(`${API_USERS}?companyId=${encodeURIComponent(c.id)}`, {
              headers: authHeaders,
            });
            if (!res.ok) return [c.id, { totalUsers: 0, activeUsers: 0, status: "INACTIVE" }];

            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            const totalUsers = arr.length;
            const activeUsers = arr.filter((u) => u.enabled).length;
            const status = activeUsers > 0 ? "ACTIVE" : "INACTIVE";
            return [c.id, { totalUsers, activeUsers, status }];
          } catch {
            return [c.id, { totalUsers: 0, activeUsers: 0, status: "INACTIVE" }];
          }
        })
      );

      const map = {};
      for (const [id, v] of entries) map[id] = v;
      setCompanyStatus(map);
    } catch {}
  };

  const refreshAll = async () => {
    await loadStats();
    await loadCompanies();
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (companies.length) loadCompanyStatuses(companies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, rowsPerPage]);

  const username = localStorage.getItem("username") || "—";

  const filteredRows = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return companies.filter((c) => {
      const st = companyStatus?.[c.id]?.status || "INACTIVE";
      const passStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && st === "ACTIVE") ||
        (statusFilter === "INACTIVE" && st === "INACTIVE");

      if (!passStatus) return false;

      if (!norm) return true;
      return (
        String(c.id).includes(norm) ||
        String(c.name || "").toLowerCase().includes(norm) ||
        String(c.code || "").toLowerCase().includes(norm)
      );
    });
  }, [companies, q, statusFilter, companyStatus]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  }, [filteredRows.length, rowsPerPage]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const StatusBadge = ({ companyId }) => {
    const s = companyStatus?.[companyId];
    const st = s?.status || "INACTIVE";
    const cls = st === "ACTIVE" ? "badge badgeGreen" : "badge badgeRed";
    const label = st === "ACTIVE" ? "Active" : "Inactive";
    return (
      <div className="statusCell">
        <span className={cls}>{label}</span>
        <span className="statusMeta">{s ? `${s.activeUsers}/${s.totalUsers} enabled` : "…"}</span>
      </div>
    );
  };

  // ✅ POST add company (SUPER_ADMIN only)
  const addCompany = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const name = (newCompany.name || "").trim();
    const code = (newCompany.code || "").trim();

    if (!name) {
      setAddErr("Name is required.");
      return;
    }

    setAdding(true);
    setAddErr("");

    try {
      const res = await fetch(API_COMPANIES, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name,
          code: code || null,
          // ✅ si ton backend attend status, décommente:
          // status: "ACTIVE",
        }),
      });

      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      setOpenAddCompany(false);
      setNewCompany({ name: "", code: "" });
      await loadCompanies();
    } catch (e2) {
      setAddErr(
        e2?.message === "UNAUTHORIZED"
          ? "Session expirée."
          : e2?.message || "Erreur ajout company."
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="dashWrap">
      <div className="dashTop">
        <div>
          <div className="dashCrumb">
            Home <span className="dot">•</span> Account Management
          </div>
        </div>

        
          <button className="btn ghost" onClick={refreshAll} disabled={loading}>
            ⟳ Refresh
          </button>
        </div>
      

      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Total users</div>
            <div className="kpiIcon">👥</div>
          </div>
          <div className="kpiValue">{stats.total}</div>
          <div className="kpiHint">All users in current scope</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Active</div>
            <div className="kpiIcon">✅</div>
          </div>
          <div className="kpiValue">{stats.actives}</div>
          <div className="kpiHint">Enabled accounts</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Inactive</div>
            <div className="kpiIcon">⛔</div>
          </div>
          <div className="kpiValue">{stats.inactives}</div>
          <div className="kpiHint">Disabled accounts</div>
        </div>
      </div>

      {/* ✅ Companies panel: SUPER_ADMIN + ADMIN */}
      {isAdmin && (
        <div className="panel">
          <div className="panelHead">
            <div>
              <div className="panelTitle">
                Companies {isSuperAdmin ? "" : <span className="muted">(my company)</span>}
              </div>
              <div className="panelSub"></div>
            </div>

            <div className="panelTools">
              <div className="search">
                <span className="sIcon">⌕</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by id, name, code…"
                />
              </div>

              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All</option>
                <option value="ACTIVE">Active only</option>
                <option value="INACTIVE">Inactive only</option>
              </select>

              <select className="select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>

              {/* ✅ ADD button (SUPER_ADMIN) */}
              {isSuperAdmin && (
                <button className="btn primary" onClick={() => { setAddErr(""); setOpenAddCompany(true); }}>
                  + Add company
                </button>
              )}

              
            </div>
          </div>

          {err && <div className="alert danger">{err}</div>}
          {!err && loading && <div className="alert">Loading…</div>}

          <div className="tableCard">
            <table className="eTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>

                    <td>
                      <button className="link" onClick={() => navigate(`/users?companyId=${c.id}`)}>
                        {c.name}
                      </button>
                      <div className="subRow">Users, roles & access policies</div>
                    </td>

                    <td className="mono">{c.code}</td>

                    <td>
                      <StatusBadge companyId={c.id} />
                    </td>

                    <td className="right">
                      <div className="rowActions">
                        <button className="btn sm primary" onClick={() => navigate(`/users?companyId=${c.id}`)}>
                          View users →
                        </button>

                        {isSuperAdmin && (
                          <div className="menuWrap" ref={openMenuId === c.id ? menuRef : null}>
                            <button
                              className="iconKebab"
                              onClick={() => setOpenMenuId((v) => (v === c.id ? null : c.id))}
                              title="Quick actions"
                            >
                              ⋯
                            </button>

                            {openMenuId === c.id && (
                              <div className="menu">
                                
                              
                                <button
                                  className="menuItem danger"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    alert("Action placeholder: disable company (backend endpoint later)");
                                  }}
                                >
                                  Disable company 
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {pagedRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="emptyRow">
                      No companies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panelFoot">
            <div className="muted">
              {filteredRows.length} result(s) • page {page}/{totalPages}
            </div>

            <div className="pager">
              <button className="btn sm ghost" disabled={!canPrev} onClick={() => setPage(1)}>
                « First
              </button>
              <button className="btn sm ghost" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
                ‹ Prev
              </button>

              <span className="pagePill">{page}</span>

              <button className="btn sm ghost" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next ›
              </button>
              <button className="btn sm ghost" disabled={!canNext} onClick={() => setPage(totalPages)}>
                Last »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Add Company Modal (SUPER_ADMIN only) */}
      {isSuperAdmin && openAddCompany && (
        <div className="modalOverlay" onClick={() => setOpenAddCompany(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">Add new company</div>
              <button className="iconKebab" onClick={() => setOpenAddCompany(false)} title="Close">
                ✕
              </button>
            </div>

            {addErr && <div className="alert danger">{addErr}</div>}

            <form onSubmit={addCompany} className="modalForm">
              <label className="label">Name *</label>
              <input
                className="input"
                value={newCompany.name}
                onChange={(e) => setNewCompany((p) => ({ ...p, name: e.target.value }))}
                placeholder=""
              />

              <label className="label">Code (optional)</label>
              <input
                className="input"
                value={newCompany.code}
                onChange={(e) => setNewCompany((p) => ({ ...p, code: e.target.value }))}
                placeholder=""
              />

              <div className="modalActions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setOpenAddCompany(false)}
                  disabled={adding}
                >
                  Cancel
                </button>
                <button className="btn primary" disabled={adding}>
                  {adding ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}