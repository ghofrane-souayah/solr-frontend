import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8081/api/solr/monitoring";

function formatBytes(bytes) {
  const b = Number(bytes ?? 0);
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function badgeStyle(status) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: status === "UP" ? "rgba(0,200,120,0.15)" : "rgba(255,80,80,0.18)",
    color: status === "UP" ? "#b7ffdd" : "#ffb3b3",
  };
}

function pctStyle(p) {
  const v = Number(p ?? 0);
  if (v >= 80) return { color: "#ff8b8b", fontWeight: 900 };
  if (v >= 50) return { color: "#ffd27a", fontWeight: 900 };
  return { color: "#b7ffdd", fontWeight: 900 };
}

export default function SolrDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const nodes = useMemo(() => data?.nodes ?? [], [data]);

  const load = async () => {
    setError("");
    try {
      const res = await fetch(API);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} - ${txt}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e?.message || "Impossible de récupérer le monitoring (backend lancé ? endpoint autorisé ?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // refresh auto
    return () => clearInterval(id);
  }, []);

  const totalsAll = useMemo(() => {
    let up = 0;
    let down = 0;
    let docs = 0;
    let size = 0;

    for (const n of nodes) {
      if (n.status === "UP") up++;
      else down++;

      // si tu n'as pas totalDocs/totalSizeInBytes, on calcule depuis cores
      const nodeDocs =
        n.totalDocs ??
        (n.cores || []).reduce((s, c) => s + Number(c.numDocs || 0), 0);

      const nodeSize =
        n.totalSizeInBytes ??
        (n.cores || []).reduce((s, c) => s + Number(c.sizeInBytes || 0), 0);

      docs += nodeDocs;
      size += nodeSize;
    }

    return { up, down, docs, size };
  }, [nodes]);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Solr Monitoring Dashboard</h2>
          <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
            API: <span style={{ fontFamily: "monospace" }}>{API}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {data?.generatedAt && (
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              GeneratedAt: <span style={{ fontFamily: "monospace" }}>{data.generatedAt}</span>
            </div>
          )}
          <button className="btn" onClick={load}>Rafraîchir</button>
        </div>
      </div>

      {loading && <p className="notice" style={{ marginTop: 12 }}>Chargement...</p>}
      {error && <p className="notice noticeError" style={{ marginTop: 12 }}>{error}</p>}

      {!loading && !error && (
        <>
          {/* SUMMARY */}
          <div className="notice" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Résumé</div>
            <div>Nodes UP: <b>{totalsAll.up}</b> | DOWN: <b>{totalsAll.down}</b></div>
            <div>Total Docs (tous nodes): <b>{totalsAll.docs}</b></div>
            <div>Total Size (tous nodes): <b>{formatBytes(totalsAll.size)}</b></div>
          </div>

          {/* NODES */}
          <h2 style={{ marginTop: 16 }}>Nodes</h2>

          {nodes.length === 0 ? (
            <p className="notice">Aucun node configuré.</p>
          ) : (
            <ul className="list" style={{ marginTop: 10 }}>
              {nodes.map((n) => {
                const cores = n.cores || [];
                const totalDocs =
                  n.totalDocs ?? cores.reduce((s, c) => s + Number(c.numDocs || 0), 0);
                const totalSize =
                  n.totalSizeInBytes ?? cores.reduce((s, c) => s + Number(c.sizeInBytes || 0), 0);

                return (
                  <li key={`${n.name}-${n.host}-${n.port}`} className="item" style={{ alignItems: "stretch" }}>
                    <div style={{ flex: 1 }}>
                      <div className="itemTitle" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span>{n.name}</span>
                        <span style={badgeStyle(n.status)}>{n.status}</span>
                      </div>

                      <div className="itemSub" style={{ marginTop: 6 }}>
                        <div>
                          Host: <span style={{ fontFamily: "monospace" }}>{n.host}:{n.port}</span>
                        </div>

                        <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                          <div>
                            CPU: <span style={pctStyle(n.cpu)}>{n.cpu ?? 0}%</span>
                          </div>
                          <div>
                            Memory: <span style={pctStyle(n.memory)}>{n.memory ?? 0}%</span>
                          </div>
                          <div>
                            Cores: <b>{cores.length}</b>
                          </div>
                          <div>
                            Total Docs: <b>{totalDocs}</b>
                          </div>
                          <div>
                            Total Size: <b>{formatBytes(totalSize)}</b>
                          </div>
                        </div>

                        {(n.alerts?.length ?? 0) > 0 && (
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {n.alerts.map((a) => (
                              <span key={a} className="notice" style={{ margin: 0, padding: "6px 10px" }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {n.status !== "UP" && n.error && (
                          <div className="notice noticeError" style={{ marginTop: 10 }}>
                            <b>Erreur:</b> {n.error}
                          </div>
                        )}

                        {/* CORES TABLE */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 800, marginBottom: 8 }}>Cores</div>

                          {cores.length === 0 ? (
                            <div className="notice" style={{ margin: 0 }}>Aucun core</div>
                          ) : (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                <thead>
                                  <tr style={{ opacity: 0.85, textAlign: "left" }}>
                                    <th style={{ padding: "8px 6px" }}>Name</th>
                                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Docs</th>
                                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Deleted</th>
                                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Size</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cores.map((c) => (
                                    <tr key={c.name} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{c.name}</td>
                                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "monospace" }}>{c.numDocs}</td>
                                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "monospace" }}>{c.deletedDocs}</td>
                                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "monospace" }}>{formatBytes(c.sizeInBytes)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
