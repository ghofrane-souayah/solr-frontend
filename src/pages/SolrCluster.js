import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./SolrCluster.css";

const API = "http://localhost:8081/api/solr/monitoring";

export default function SolrCluster() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | UP | DOWN
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // Accordion state: { [serverName]: boolean }
  const [openCores, setOpenCores] = useState({});
  const toggleCores = (serverName) =>
    setOpenCores((prev) => ({ ...prev, [serverName]: !prev[serverName] }));

  // ✅ évite double interval en dev (StrictMode)
  const startedRef = useRef(false);

  const load = async () => {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(API, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setError(
        e?.message === "UNAUTHORIZED"
          ? "Accès refusé / session expirée. Reconnecte-toi."
          : `Erreur chargement: ${e?.message || "unknown"}`
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Supporte plusieurs formats backend: {nodes:[]}, {servers:[]}, ou []
  const servers = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.nodes)) return data.nodes;
    if (Array.isArray(data.servers)) return data.servers;
    return [];
  }, [data]);

  const stats = useMemo(() => {
    const total = servers.length;
    const up = servers.filter((s) => s.status === "UP").length;
    const down = total - up;
    return { total, up, down };
  }, [servers]);

  const filteredServers = useMemo(() => {
    const query = q.trim().toLowerCase();

    return servers.filter((s) => {
      if (filter === "UP" && s.status !== "UP") return false;
      if (filter === "DOWN" && s.status !== "DOWN") return false;

      if (!query) return true;

      const hay = `${s.name} ${s.host} ${s.port}`.toLowerCase();
      return hay.includes(query);
    });
  }, [servers, filter, q]);

  const pctColor = (v) => {
    const n = Number(v) || 0;
    if (n >= 80) return "bad";
    if (n >= 50) return "warn";
    return "good";
  };

  return (
    <div className="solrPage">
      {/* HEADER */}
      <div className="solrHeader">
        <div>
          <h1 className="solrTitle">Solr Cluster</h1>
          <div className="solrSubtitle">Monitoring & Management Console</div>
        </div>

        <div className="solrHeaderRight">
          <div className="metaPill" title={API}>
            Monitoring API
          </div>

          <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* OVERVIEW PANEL */}
      <div className="panel">
        <div className="panelTop">
          <div>
            <div className="panelTitle">Cluster overview</div>
            <div className="panelSub">Health snapshot of nodes</div>
          </div>

          {data?.generatedAt && (
            <div className="metaPill">
              Last sync: <span className="mono">{data.generatedAt}</span>
            </div>
          )}
        </div>

        {error && <div className="notice error">❌ {error}</div>}

        <div className="kpiGrid">
          <div className="kpiCard">
            <div className="kpiLabel">Total</div>
            <div className="kpiValue">{stats.total}</div>
            <div className="kpiHint">Nodes discovered</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Up</div>
            <div className="kpiValue">{stats.up}</div>
            <div className="kpiHint">Healthy nodes</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Down</div>
            <div className="kpiValue">{stats.down}</div>
            <div className="kpiHint">Unreachable nodes</div>
          </div>
        </div>

        {!data && !error && <div className="notice">⏳ Chargement...</div>}
      </div>

      {/* SERVERS PANEL */}
      <div className="panel">
        <div className="panelTop">
          <div>
            <div className="panelTitle">Solr servers</div>
            <div className="panelSub">Browse nodes and inspect metrics</div>
          </div>

          <div className="tools">
            <div className="seg">
              <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>
                All
              </button>
              <button className={filter === "UP" ? "active" : ""} onClick={() => setFilter("UP")}>
                Up
              </button>
              <button className={filter === "DOWN" ? "active" : ""} onClick={() => setFilter("DOWN")}>
                Down
              </button>
            </div>

            <div className="searchBox">
              <span>⌕</span>
              <input
                placeholder="Search name / host / port…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {data && !loading && filteredServers.length === 0 && (
          <div className="notice">Aucun serveur ne correspond au filtre.</div>
        )}

        <div className="serverList">
          {filteredServers.map((s) => {
            const cores = Array.isArray(s.cores) ? s.cores : [];
            const hasCores = cores.length > 0;
            const isOpen = !!openCores[s.name];
            const safeId = String(s.name).replace(/[^a-zA-Z0-9_-]/g, "_");
            const panelId = `cores-panel-${safeId}`;

            return (
              <div key={`${s.name}-${s.host}-${s.port}`} className="serverCard">
                <div className="serverTop">
                  <div className="serverName">
                    <Link to={`/solr/server/${s.name}`} className="serverLink" title={`Open ${s.name} details`}>
                      {s.name}
                    </Link>{" "}
                    —{" "}
                    <span className={`status ${s.status === "UP" ? "up" : "down"}`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="serverAddr mono">
                    {s.host}:{s.port}
                  </div>
                </div>

                <div className="metricsRow">
                  <div className={`metric ${pctColor(s.cpu)}`}>
                    <div className="metricLabel">CPU</div>
                    <div className="metricValue">{Number(s.cpu) || 0}%</div>
                  </div>

                  <div className={`metric ${pctColor(s.memory)}`}>
                    <div className="metricLabel">Memory</div>
                    <div className="metricValue">{Number(s.memory) || 0}%</div>
                  </div>

                  <div className="metric">
                    <div className="metricLabel">Total docs</div>
                    <div className="metricValue">{s.totalDocs ?? 0}</div>
                  </div>

                  <div className="metric">
                    <div className="metricLabel">Total size</div>
                    <div className="metricValue">{formatBytes(s.totalSizeInBytes ?? 0)}</div>
                  </div>
                </div>

                {Array.isArray(s.alerts) && s.alerts.length > 0 && (
                  <div className="notice warn">⚠️ Alerts: {s.alerts.join(", ")}</div>
                )}
                {s.error && <div className="notice error">❌ {s.error}</div>}

                {/* CORES */}
                <div className="coresBlock">
                  <button
                    type="button"
                    className={`coresHeaderBtn ${isOpen ? "open" : ""}`}
                    onClick={() => (hasCores ? toggleCores(s.name) : null)}
                    disabled={!hasCores}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    title={!hasCores ? "Aucun core" : "Afficher / masquer"}
                  >
                    <div className="coresHeaderLeft">
                      <span className="coresTitle">Cores</span>
                      <span className="coresBadge">{cores.length}</span>
                      {!hasCores ? <span className="coresHintInline">Aucun core</span> : null}
                    </div>

                    <span className={`chev ${isOpen ? "rot" : ""}`}>▾</span>
                  </button>

                  <div id={panelId} className={`collapse ${isOpen ? "open" : ""}`}>
                    <div className="collapseInner">
                      <div className="coresTableWrap">
                        <table className="coresTable">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Docs</th>
                              <th>Deleted</th>
                              <th>Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cores.map((c) => (
                              <tr key={c.name}>
                                <td className="mono">{c.name}</td>
                                <td>{c.numDocs ?? 0}</td>
                                <td>{c.deletedDocs ?? 0}</td>
                                <td>{formatBytes(c.sizeInBytes ?? 0)}</td>
                              </tr>
                            ))}

                            {cores.length === 0 && (
                              <tr>
                                <td colSpan={4} className="muted" style={{ padding: 12 }}>
                                  Aucun core.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                {/* END CORES */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
