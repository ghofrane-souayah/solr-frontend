import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./SolrCluster.css";

const API = "http://localhost:8081/api/solr/monitoring";

export default function SolrCluster() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | UP | DOWN
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement des serveurs Solr (backend down ? CORS ? URL ?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const servers = data?.nodes || [];

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

  const stats = useMemo(() => {
    const total = servers.length;
    const up = servers.filter((s) => s.status === "UP").length;
    const down = total - up;
    return { total, up, down };
  }, [servers]);

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
          <div className="solrSubtitle">Monitoring & Management Dashboard</div>
        </div>

        <div className="solrHeaderRight">
          <div className="pill">
            API: <span className="mono">{API}</span>
          </div>
          <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ PRO LAYOUT: sidebar + main */}
      <div className="layout">
        {/* LEFT: OVERVIEW (petit) */}
        <aside className="side">
          <div className="card cardCompact">
            <div className="cardTitle">Cluster Overview</div>

            <div className="overviewGrid">
              <div className="kpi">
                <div className="kpiLabel">TOTAL</div>
                <div className="kpiValue">{stats.total}</div>
              </div>

              <div className="kpi good">
                <div className="kpiLabel">UP</div>
                <div className="kpiValue">{stats.up}</div>
              </div>

              <div className="kpi bad">
                <div className="kpiLabel">DOWN</div>
                <div className="kpiValue">{stats.down}</div>
              </div>
            </div>

            {data?.generatedAt && (
              <div className="muted generatedAt">
                generatedAt: <span className="mono">{data.generatedAt}</span>
              </div>
            )}

            {error && <div className="notice error">❌ {error}</div>}
          </div>
        </aside>

        {/* RIGHT: SERVERS */}
        <section className="main">
          <div className="card">
            <div className="cardRow">
              <div className="cardTitle">Solr Servers</div>

              <div className="toolbar">
                <div className="seg">
                  <button
                    className={`segBtn ${filter === "ALL" ? "active" : ""}`}
                    onClick={() => setFilter("ALL")}
                  >
                    ALL
                  </button>
                  <button
                    className={`segBtn ${filter === "UP" ? "active" : ""}`}
                    onClick={() => setFilter("UP")}
                  >
                    UP
                  </button>
                  <button
                    className={`segBtn ${filter === "DOWN" ? "active" : ""}`}
                    onClick={() => setFilter("DOWN")}
                  >
                    DOWN
                  </button>
                </div>

                <input
                  className="search"
                  placeholder="Search server (name / host / port)..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {!data && !error && <div className="notice">⏳ Chargement...</div>}

            {data && filteredServers.length === 0 && (
              <div className="notice">Aucun serveur ne correspond au filtre.</div>
            )}

            <div className="serverList">
              {filteredServers.map((s) => (
                <div key={s.name} className="serverCard">
                  <div className="serverTop">
                    <div className="serverName">
                      {/* ✅ cliquable */}
                      <Link
                        to={`/solr/server/${s.name}`}
                        className="serverLink"
                        title={`Open ${s.name} details`}
                      >
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

                  <div className="coresBlock">
                    <div className="coresTitle">Cores</div>

                    {!Array.isArray(s.cores) || s.cores.length === 0 ? (
                      <div className="muted">Aucun core</div>
                    ) : (
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
                            {s.cores.map((c) => (
                              <tr key={c.name}>
                                <td className="mono">{c.name}</td>
                                <td>{c.numDocs ?? 0}</td>
                                <td>{c.deletedDocs ?? 0}</td>
                                <td>{formatBytes(c.sizeInBytes ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Utils */
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
