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

  async function fetchAll(signal) {
    if (!serverName || !core) {
      setError("Route invalide: server/core manquants dans l'URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ⚠️ garde ton endpoint original (collections). Si ton backend utilise cores, on change après.
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
  }, [activeTab]);

  return (
    <div style={styles.page}>
      <div style={styles.top}>
        <div>
          <div style={styles.breadcrumb}>
            Solr Cluster / {serverName || "?"} / <b>{core || "?"}</b>
          </div>
          <h1 style={styles.h1}>Schema</h1>
          <div style={styles.sub}>
            Server: <b>{serverName || "?"}</b> — Core: <b>{core || "?"}</b>
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.btn} onClick={() => fetchAll()} disabled={loading}>
            Refresh
          </button>
          <button style={styles.btnGhost} onClick={() => nav(-1)}>
            ← Back
          </button>
        </div>
      </div>

      <div style={styles.tabsRow}>
        <div style={styles.tabs}>
          <Tab label={`Fields (${fields.length})`} active={activeTab === "fields"} onClick={() => setActiveTab("fields")} />
          <Tab label={`Types (${types.length})`} active={activeTab === "types"} onClick={() => setActiveTab("types")} />
          <Tab
            label={`Dynamic (${dynamicFields.length})`}
            active={activeTab === "dynamic"}
            onClick={() => setActiveTab("dynamic")}
          />
        </div>

        <input style={styles.search} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : activeTab === "fields" ? (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Fields</h2>

              <button style={styles.toggleBtn} onClick={() => setShowTable((v) => !v)}>
                {showTable ? "Hide table ▲" : "Show table ▼"}
              </button>
            </div>

            {showTable ? <FieldsTable data={filteredFields} /> : <div style={styles.loading}>Table hidden.</div>}
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
            <tr key={f.name}>
              <td style={styles.td}>{f.name}</td>
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
      <h2 style={styles.sectionTitle}>{title}</h2>
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

// styles: identique à ton code (je garde comme tu l’avais)
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0b1220 0%, #060a12 100%)",
    color: "#e8eefc",
    padding: 24,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
  },
  breadcrumb: { opacity: 0.8, fontSize: 14, marginBottom: 8 },
  h1: { margin: 0, fontSize: 44, letterSpacing: -0.5 },
  sub: { opacity: 0.8, marginTop: 6 },
  actions: { display: "flex", gap: 10 },
  btn: {
    background: "#1d4ed8",
    border: "1px solid #2b5cff",
    color: "white",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  tabsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  tabs: { display: "flex", gap: 10 },
  tab: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
  },
  tabActive: { background: "#1d4ed8", borderColor: "#2b5cff" },
  search: {
    width: 320,
    maxWidth: "55vw",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    outline: "none",
  },
  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "6px 0 12px 0",
  },
  sectionTitle: { margin: 0, fontSize: 20 },
  toggleBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 13,
    opacity: 0.85,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },
  thCenter: {
    textAlign: "center",
    padding: 12,
    fontSize: 13,
    opacity: 0.85,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },
  td: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  tdCenter: {
    padding: 12,
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 800,
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: 12,
  },
  pills: { display: "flex", flexWrap: "wrap", gap: 10 },
  pill: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
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
