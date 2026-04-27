// src/pages/SolrSchemaPage.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SolrSchemaPage.css";

const API_BASE = "http://localhost:8081/api/solr/servers";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeInt(v, def = 10) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export default function SolrSchemaPage() {
  const nav = useNavigate();
  const qp = useQuery();

  const serverIdParam = qp.get("serverId") || "";
  const coreParam = qp.get("core") || "";

  const [serverId, setServerId] = useState(serverIdParam);
  const [core, setCore] = useState(coreParam);

  const [activeTab, setActiveTab] = useState("fields"); // fields | types
  const [query, setQuery] = useState("");

  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);

  useEffect(() => {
    setServerId(serverIdParam);
    setCore(coreParam);
    setPage(1);
  }, [serverIdParam, coreParam]);

  const canLoad = !!serverId && !!core;

  const schemaUrls = useMemo(() => {
    if (!canLoad) return null;
    return {
      fields: `${API_BASE}/${encodeURIComponent(serverId)}/cores/${encodeURIComponent(
        core
      )}/schema/fields`,
      types: `${API_BASE}/${encodeURIComponent(serverId)}/cores/${encodeURIComponent(
        core
      )}/schema/types`,
    };
  }, [serverId, core, canLoad]);

  const loadSchema = useCallback(async () => {
    if (!canLoad || !schemaUrls) {
      setError("Route invalide: serverId/core manquants dans l’URL.");
      setFields([]);
      setTypes([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = getAuthHeaders();

      const [resF, resT] = await Promise.all([
        fetch(schemaUrls.fields, { headers }),
        fetch(schemaUrls.types, { headers }),
      ]);

      if (resF.status === 401 || resT.status === 401) throw new Error("UNAUTHORIZED");
      if (resF.status === 403 || resT.status === 403) throw new Error("FORBIDDEN");

      if (!resF.ok) throw new Error(`Fields HTTP ${resF.status}`);
      if (!resT.ok) throw new Error(`Types HTTP ${resT.status}`);

      const [fj, tj] = await Promise.all([resF.json(), resT.json()]);

      // ton backend: { fields: [...] } / { types: [...] } ou { fieldTypes: [...] }
      const fArr = Array.isArray(fj) ? fj : Array.isArray(fj?.fields) ? fj.fields : [];
      const tArr = Array.isArray(tj)
        ? tj
        : Array.isArray(tj?.types)
        ? tj.types
        : Array.isArray(tj?.fieldTypes)
        ? tj.fieldTypes
        : [];

      setFields(fArr);
      setTypes(tArr);
    } catch (e) {
      console.error(e);

      if (e?.message === "UNAUTHORIZED") {
        setError("Session expirée. Reconnecte-toi.");
        localStorage.removeItem("token");
        nav("/login", { replace: true });
      } else if (e?.message === "FORBIDDEN") {
        setError("Accès refusé (403).");
      } else {
        setError("Impossible de charger le schema.");
      }

      setFields([]);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [canLoad, schemaUrls, nav]);

  useEffect(() => {
    if (!serverId || !core) return;
    loadSchema();
  }, [serverId, core, loadSchema]);

  // --------- Filtering ----------
  const filteredFields = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;

    return fields.filter((f) => {
      const name = String(f?.name ?? "").toLowerCase();
      const type = String(f?.type ?? "").toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [fields, query]);

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;

    return types.filter((t) => {
      const name = String(t?.name ?? t ?? "").toLowerCase();
      const clazz = String(t?.className ?? t?.class ?? "").toLowerCase();
      return name.includes(q) || clazz.includes(q);
    });
  }, [types, query]);

  // --------- Pagination ----------
  const rowsPerPage = useMemo(() => safeInt(rows, 10), [rows]);

  const currentList = activeTab === "fields" ? filteredFields : filteredTypes;

  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return currentList.slice(start, start + rowsPerPage);
  }, [currentList, page, rowsPerPage]);

  const onChangeRows = (e) => {
    const v = safeInt(e.target.value, 10);
    setRows(v);
    setPage(1);
  };

  return (
    <div className="schemaPage">
      {error && <div className="notice error">❌ {error}</div>}
      {!error && loading && <div className="notice">⏳ Chargement…</div>}

      {/* Toolbar */}
      <div className="schemaCard">
        <div className="schemaCardTop">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "fields" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("fields");
                setPage(1);
              }}
            >
              Fields <span className="pill">{filteredFields.length}</span>
            </button>

            <button
              className={`tab ${activeTab === "types" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("types");
                setPage(1);
              }}
            >
              Types <span className="pill">{filteredTypes.length}</span>
            </button>
          </div>

          <div className="tools">
            <div className="searchBox">
              <span className="searchIcon">⌕</span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  activeTab === "fields" ? "Search fields (name/type)..." : "Search types..."
                }
              />
            </div>

            <div className="rowsSelect">
              <span className="muted">Lignes</span>
              <select value={rows} onChange={onChangeRows}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="tableWrap">
          {totalItems === 0 ? (
            <div className="empty">Aucun résultat.</div>
          ) : activeTab === "fields" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>NOM</th>
                  <th>TYPE</th>
                  <th className="center">STOCKÉ</th>
                  <th className="center">INDEXÉE</th>
                  <th className="center">MULTIVALUÉ</th>
                  <th className="center">REQUIS</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((f) => (
                  <tr key={f.name}>
                    <td className="mono">{f.name}</td>
                    <td>
                      <span className="tag">{f.type}</span>
                    </td>
                    <td className="center">{f.stored ? "✓" : "—"}</td>
                    <td className="center">{f.indexed ? "✓" : "—"}</td>
                    <td className="center">{f.multiValued ? "✓" : "—"}</td>
                    <td className="center">{f.required ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>NOM</th>
                  <th>CLASSE</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t, idx) => (
                  <tr key={(t?.name ?? "type") + "-" + idx}>
                    <td className="mono">{t?.name ?? String(t)}</td>
                    <td className="muted mono">{t?.className ?? t?.class ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="pager">
          <div className="pagerLeft muted">
            {totalItems === 0 ? (
              "0 item"
            ) : (
              <>
                Page <b>{page}</b> / <b>{totalPages}</b> —{" "}
                <span className="mono">{totalItems}</span> item(s)
              </>
            )}
          </div>

          <div className="pagerRight">
            <button className="btn sm ghost" onClick={() => setPage(1)} disabled={page <= 1}>
              « Premier
            </button>
            <button
              className="btn sm ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Précedent
            </button>
            <button
              className="btn sm ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant ›
            </button>
            <button
              className="btn sm ghost"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              Dérnier »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}