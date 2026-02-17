import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = "http://localhost:8081/api/solr";

export default function SolrSchema() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const serverName = sp.get("server") || "";
  const core = sp.get("core") || "";

  const [activeTab, setActiveTab] = useState("fields"); // fields | types | dynamic
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);

  const [search, setSearch] = useState("");
  const [showTable, setShowTable] = useState(true);

  // ✅ pagination (fields tab)
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.type || "").toLowerCase().includes(q)
    );
  }, [fields, search]);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => String(t || "").toLowerCase().includes(q));
  }, [types, search]);

  const filteredDynamic = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dynamicFields;
    return dynamicFields.filter((d) => String(d || "").toLowerCase().includes(q));
  }, [dynamicFields, search]);

  // ✅ pagination computations (fields only)
  const totalItems = filteredFields.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedFields = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredFields.slice(start, start + rowsPerPage);
  }, [filteredFields, safePage, rowsPerPage]);

  async function fetchAll(signal) {
    if (!serverName || !core) {
      setError("Route invalide: server/core manquants dans l'URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ⚠️ garde ton endpoint original
      const base = `${API_BASE}/servers/${encodeURIComponent(serverName)}/collections/${encodeURIComponent(core)}/schema`;

      const [fRes, tRes, dRes] = await Promise.all([
        fetch(`${base}/fields`, { signal, headers }),
        fetch(`${base}/fieldtypes`, { signal, headers }),
        fetch(`${base}/dynamicfields`, { signal, headers }),
      ]);

      if (fRes.status === 401 || tRes.status === 401 || dRes.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!fRes.ok) throw new Error(`Fields error: ${fRes.status}`);
      if (!tRes.ok) throw new Error(`Types error: ${tRes.status}`);
      if (!dRes.ok) throw new Error(`Dynamic error: ${dRes.status}`);

      const fData = await fRes.json();
      const tData = await tRes.json();
      const dData = await dRes.json();

      setFields(Array.isArray(fData) ? fData : []);
      setTypes(Array.isArray(tData) ? tData : []);
      setDynamicFields(Array.isArray(dData) ? dData : []);

      // reset paging when reload
      setPage(1);
    } catch (e) {
      if (e?.name === "AbortError") return;

      setError(
        e?.message === "UNAUTHORIZED"
          ? "Session expirée / accès refusé. Reconnecte-toi."
          : e.message || "Erreur lors du chargement du schema"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverName, core]);

  useEffect(() => {
    if (activeTab === "fields") setShowTable(true);
    setPage(1);
  }, [activeTab]);

  // reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.headerCard}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.breadcrumb}>
              <span style={styles.crumbMuted}>Solr Cluster</span>
              <span style={styles.sep}>/</span>
              <span style={styles.crumbStrong}>{serverName || "?"}</span>
              <span style={styles.sep}>/</span>
              <span style={styles.crumbStrong}>{core || "?"}</span>
            </div>

            <div style={styles.titleRow}>
              <h1 style={styles.h1}>Schema</h1>
              <span style={styles.contextPill}>
                Server: <b style={styles.contextB}>{serverName || "?"}</b> · Core:{" "}
                <b style={styles.contextB}>{core || "?"}</b>
              </span>
            </div>

            <div style={styles.sub}>
              Fields, Types & Dynamic fields — recherche, pagination, affichage corporate.
            </div>
          </div>

          <div style={styles.actions}>
            <button
              style={{ ...styles.btn, ...(loading ? styles.btnDisabled : null) }}
              onClick={() => fetchAll()}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button style={styles.btnGhost} onClick={() => nav(-1)}>
              ← Back
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            <Tab label={`Fields (${fields.length})`} active={activeTab === "fields"} onClick={() => setActiveTab("fields")} />
            <Tab label={`Types (${types.length})`} active={activeTab === "types"} onClick={() => setActiveTab("types")} />
            <Tab
              label={`Dynamic (${dynamicFields.length})`}
              active={activeTab === "dynamic"}
              onClick={() => setActiveTab("dynamic")}
            />
          </div>

          <div style={styles.rightTools}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                style={styles.search}
                placeholder={
                  activeTab === "fields"
                    ? "Search fields (name/type)…"
                    : activeTab === "types"
                    ? "Search types…"
                    : "Search dynamic fields…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeTab === "fields" && (
              <div style={styles.rowsWrap}>
                <span style={styles.rowsLabel}>Rows</span>
                <select
                  style={styles.select}
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value) || 10)}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      {/* BODY CARD */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.loading}>Loading…</div>
        ) : activeTab === "fields" ? (
          <div>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionTitle}>Fields</div>
                <div style={styles.sectionSub}>Liste des champs du schema</div>
              </div>

              <div style={styles.sectionActions}>
                <span style={styles.countPill}>
                  {totalItems} item{totalItems > 1 ? "s" : ""}
                </span>

                <button style={styles.toggleBtn} onClick={() => setShowTable((v) => !v)}>
                  {showTable ? "Hide table ▲" : "Show table ▼"}
                </button>
              </div>
            </div>

            {showTable ? (
              <>
                <FieldsTable data={pagedFields} />

                {/* pagination */}
                <div style={styles.pager}>
                  <div style={styles.pagerLeft}>
                    Page <b>{safePage}</b> / <b>{totalPages}</b>
                  </div>

                  <div style={styles.pagerBtns}>
                    <button
                      style={{ ...styles.pagerBtn, ...(safePage === 1 ? styles.pagerBtnDisabled : null) }}
                      disabled={safePage === 1}
                      onClick={() => setPage(1)}
                    >
                      « First
                    </button>
                    <button
                      style={{ ...styles.pagerBtn, ...(safePage === 1 ? styles.pagerBtnDisabled : null) }}
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ‹ Prev
                    </button>
                    <button
                      style={{ ...styles.pagerBtn, ...(safePage === totalPages ? styles.pagerBtnDisabled : null) }}
                      disabled={safePage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next ›
                    </button>
                    <button
                      style={{ ...styles.pagerBtn, ...(safePage === totalPages ? styles.pagerBtnDisabled : null) }}
                      disabled={safePage === totalPages}
                      onClick={() => setPage(totalPages)}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.loading}>Table hidden.</div>
            )}
          </div>
        ) : activeTab === "types" ? (
          <Pills title="Field Types" items={filteredTypes} />
        ) : (
          <Pills title="Dynamic Fields" items={filteredDynamic} />
        )}
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}>
      {label}
    </button>
  );
}

function FieldsTable({ data }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Type</th>
            <th style={styles.thCenter}>Stored</th>
            <th style={styles.thCenter}>Indexed</th>
            <th style={styles.thCenter}>MultiValued</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.name} style={styles.tr}>
              <td style={styles.tdMono}>{f.name}</td>
              <td style={styles.td}>
                <span style={styles.badge}>{f.type}</span>
              </td>
              <td style={styles.tdCenter}>{f.stored ? "✓" : "—"}</td>
              <td style={styles.tdCenter}>{f.indexed ? "✓" : "—"}</td>
              <td style={styles.tdCenter}>{f.multiValued ? "✓" : "—"}</td>
            </tr>
          ))}
          {data.length === 0 ? (
            <tr>
              <td style={styles.empty} colSpan={5}>
                Aucun champ trouvé.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Pills({ title, items }) {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.sectionTitle}>{title}</div>
          <div style={styles.sectionSub}>Liste filtrée selon la recherche</div>
        </div>
        <span style={styles.countPill}>
          {items.length} item{items.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={styles.pills}>
        {items.map((x) => (
          <span key={x} style={styles.pill}>
            {x}
          </span>
        ))}
        {items.length === 0 ? <div style={styles.loading}>Aucun élément.</div> : null}
      </div>
    </div>
  );
}

/* ✅ Corporate styles (toujours dark/blue, spacing pro, header + toolbar clean) */
const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 800px at 20% 10%, rgba(59,130,246,.18), transparent 55%), linear-gradient(180deg, #0b1220 0%, #060a12 100%)",
    color: "#e8eefc",
    padding: 22,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },

  headerCard: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 18px 55px rgba(0,0,0,.35)",
    marginBottom: 14,
  },

  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },

  breadcrumb: { opacity: 0.85, fontSize: 13, marginBottom: 8 },
  crumbMuted: { color: "rgba(232,238,252,.72)" },
  crumbStrong: { color: "#e8eefc", fontWeight: 800 },
  sep: { margin: "0 8px", opacity: 0.5 },

  titleRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 40, letterSpacing: -0.6, lineHeight: 1.05 },

  contextPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(232,238,252,.9)",
    fontSize: 13,
  },
  contextB: { fontWeight: 900 },

  sub: { opacity: 0.8, marginTop: 6, fontSize: 13 },

  actions: { display: "flex", gap: 10, alignItems: "center" },

  btn: {
    background: "linear-gradient(180deg, rgba(37,99,235,.92), rgba(29,78,216,.92))",
    border: "1px solid rgba(99,102,241,.40)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },

  btnGhost: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },

  toolbar: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  tabs: { display: "flex", gap: 10, flexWrap: "wrap" },
  tab: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  tabActive: {
    background: "rgba(37,99,235,.28)",
    borderColor: "rgba(99,102,241,.55)",
  },

  rightTools: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    minWidth: 280,
  },
  searchIcon: { opacity: 0.7 },
  search: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "white",
    outline: "none",
    fontSize: 14,
  },

  rowsWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
  },
  rowsLabel: { opacity: 0.8, fontSize: 13, fontWeight: 800 },
  select: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(10,16,30,.55)",
    color: "white",
    padding: "8px 10px",
    outline: "none",
    cursor: "pointer",
    fontWeight: 800,
  },

  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 18px 55px rgba(0,0,0,.35)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sectionTitle: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.2 },
  sectionSub: { marginTop: 4, opacity: 0.75, fontSize: 13 },

  sectionActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  countPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 13,
    fontWeight: 900,
  },

  toggleBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  tableWrap: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.12)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 12,
    opacity: 0.82,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  thCenter: {
    textAlign: "center",
    padding: 12,
    fontSize: 12,
    opacity: 0.82,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  tr: { transition: "background .15s ease" },

  td: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  tdMono: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 800,
  },
  tdCenter: {
    padding: 12,
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    fontWeight: 900,
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(37,99,235,.16)",
    border: "1px solid rgba(99,102,241,.35)",
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },

  pills: { display: "flex", flexWrap: "wrap", gap: 10 },
  pill: {
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 800,
  },

  pager: {
    marginTop: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  pagerLeft: { opacity: 0.85, fontSize: 13 },
  pagerBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
  pagerBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
  },
  pagerBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },

  error: {
    padding: 12,
    borderRadius: 12,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fecaca",
    marginBottom: 14,
  },

  loading: { opacity: 0.85, padding: 10 },

  empty: { padding: 16, opacity: 0.7 },
};
