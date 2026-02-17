import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./SolrServerDetails.css";

const API = "http://localhost:8081/api/solr/servers";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

function pctTone(v) {
  const n = Number(v) || 0;
  if (n >= 80) return "bad";
  if (n >= 50) return "warn";
  return "good";
}

export default function SolrServerDetails() {
  const { name } = useParams();
  const nav = useNavigate();

  const [details, setDetails] = useState(null);
  const [health, setHealth] = useState(null);
  const [cores, setCores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const h = authHeaders();

      const resDetails = await fetch(`${API}/${encodeURIComponent(name)}`, { headers: h });
      if (resDetails.status === 401 || resDetails.status === 403) throw new Error("UNAUTHORIZED");
      if (!resDetails.ok) throw new Error(`HTTP ${resDetails.status}`);
      const d = await resDetails.json();

      // Health (optionnel)
      let hl = null;
      try {
        const resHealth = await fetch(`${API}/${encodeURIComponent(name)}/health`, { headers: h });
        if (resHealth.ok) hl = await resHealth.json();
      } catch {
        hl = null;
      }

      // Cores
      let coresArr = [];
      if (Array.isArray(d?.cores)) coresArr = d.cores;
      else if (Array.isArray(d?.coreStats)) coresArr = d.coreStats;
      else if (Array.isArray(d?.collections)) coresArr = d.collections;

      setDetails(d);
      setHealth(hl);
      setCores(Array.isArray(coresArr) ? coresArr : []);
    } catch (e) {
      console.error(e);
      setDetails(null);
      setHealth(null);
      setCores([]);
      setErr(e?.message === "UNAUTHORIZED" ? "Session expirée. Reconnecte-toi." : "Erreur de chargement serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const baseUrl = useMemo(() => {
    const host = details?.host ?? "localhost";
    const port = details?.port ?? "";
    if (!port) return "";
    return `http://${host}:${port}`;
  }, [details]);

  const status = (details?.status || health?.status || "—").toUpperCase();
  const isUp = status === "UP" || status === "OK";

  const cpu = Number(details?.cpu ?? 0);
  const mem = Number(details?.memory ?? 0);
  const totalDocs = details?.totalDocs ?? details?.docs ?? 0;
  const totalSize = details?.totalSizeInBytes ?? details?.sizeInBytes ?? 0;

  const filteredCores = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cores;

    return cores.filter((c) => {
      const coreName = String(c?.name ?? c?.core ?? "").toLowerCase();
      return coreName.includes(s);
    });
  }, [cores, q]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // ✅ CORES -> SOLR SCHEMA
  const goToSchema = (coreName) => {
    const cn = String(coreName || "").trim();
    if (!cn || cn === "—") return;
    nav(`/solr-schema?server=${encodeURIComponent(name)}&core=${encodeURIComponent(cn)}`);
  };

  return (
    <div className="srvPage">
      {/* TOP HEADER */}
      <div className="srvHeader">
        <div className="srvHeaderLeft">
          <div className="crumbs">
            <button className="linkLike" onClick={() => nav("/solr-cluster")}>
              Cluster
            </button>
            <span className="sep">/</span>
            <span className="current">Server</span>
          </div>

          <div className="srvTitleRow">
            <h1 className="srvTitle">{name}</h1>
            <span className={`badge ${isUp ? "ok" : "down"}`}>{isUp ? "UP" : "DOWN"}</span>
            {baseUrl && (
              <span className="chip mono" title={baseUrl}>
                {baseUrl}
              </span>
            )}
          </div>

          <div className="srvSub">Monitoring détaillé du serveur (CPU, mémoire, cores, état de santé).</div>
        </div>

        <div className="srvHeaderRight">
          {baseUrl && (
            <button className="btn ghost" onClick={() => copy(baseUrl)} title="Copier l’URL">
              Copy URL
            </button>
          )}
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="notice error">❌ {err}</div>}

      {/* KPI */}
      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">CPU</div>
            <div className={`kpiTag ${pctTone(cpu)}`}>{cpu}%</div>
          </div>
          <div className="bar">
            <div className={`barFill ${pctTone(cpu)}`} style={{ width: `${Math.min(100, Math.max(0, cpu))}%` }} />
          </div>
          <div className="kpiHint">Utilisation processeur</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Memory</div>
            <div className={`kpiTag ${pctTone(mem)}`}>{mem}%</div>
          </div>
          <div className="bar">
            <div className={`barFill ${pctTone(mem)}`} style={{ width: `${Math.min(100, Math.max(0, mem))}%` }} />
          </div>
          <div className="kpiHint">Utilisation mémoire</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Total docs</div>
            <div className="kpiValue">{totalDocs}</div>
          </div>
          <div className="kpiHint">Documents indexés</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Total size</div>
            <div className="kpiValue">{formatBytes(totalSize)}</div>
          </div>
          <div className="kpiHint">Taille index totale</div>
        </div>
      </div>

      {/* PANELS */}
      <div className="grid2">
        {/* Info */}
        <div className="panel">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Informations</div>
              <div className="panelSub">Paramètres et identité du serveur</div>
            </div>
          </div>

          <div className="infoGrid">
            <div className="infoItem">
              <div className="k">Host</div>
              <div className="v mono">{details?.host ?? "—"}</div>
            </div>

            <div className="infoItem">
              <div className="k">Port</div>
              <div className="v">{details?.port ?? "—"}</div>
            </div>

            <div className="infoItem">
              <div className="k">Status</div>
              <div className="v">
                <span className={`pill ${isUp ? "ok" : "down"}`}>{isUp ? "UP" : "DOWN"}</span>
              </div>
            </div>

            <div className="infoItem">
              <div className="k">Generated at</div>
              <div className="v mono">{details?.generatedAt ?? health?.generatedAt ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="panel">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Health</div>
              <div className="panelSub">Disponibilité et latence</div>
            </div>
          </div>

          <div className="healthGrid">
            <div className="healthItem">
              <div className="k">Response time</div>
              <div className="v">{health?.responseTimeMs != null ? `${health.responseTimeMs} ms` : "—"}</div>
            </div>

            <div className="healthItem">
              <div className="k">Ping</div>
              <div className="v">
                <span className={`pill ${isUp ? "ok" : "down"}`}>{isUp ? "OK" : "FAIL"}</span>
              </div>
            </div>

            <div className="healthItem">
              <div className="k">Message</div>
              <div className="v">{health?.message ?? (isUp ? "Healthy" : "Unreachable")}</div>
            </div>
          </div>

          {Array.isArray(health?.alerts) && health.alerts.length > 0 && (
            <div className="notice warn">⚠️ {health.alerts.join(", ")}</div>
          )}
        </div>
      </div>

      {/* CORES TABLE */}
      <div className="panel">
        <div className="panelHead row">
          <div>
            <div className="panelTitle">Cores</div>
            <div className="panelSub">Liste et statistiques des cores</div>
          </div>

          <div className="rightTools">
            <div className="searchBox">
              <span>⌕</span>
              <input placeholder="Search core…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="chip">
              {filteredCores.length} / {cores.length}
            </div>
          </div>
        </div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="right">Docs</th>
                <th className="right">Deleted</th>
                <th className="right">Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredCores.map((c) => {
                const coreName = c?.name ?? c?.core ?? "—";
                const docs = c?.numDocs ?? c?.docs ?? 0;
                const del = c?.deletedDocs ?? c?.deleted ?? 0;
                const size = c?.sizeInBytes ?? c?.size ?? 0;

                return (
                  <tr
                    key={coreName}
                    className="coreRowClickable"
                    onClick={() => goToSchema(coreName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") goToSchema(coreName);
                    }}
                    title="Ouvrir Solr Schema"
                  >
                    <td className="mono coreLinkCell">{coreName}</td>
                    <td className="right">{docs}</td>
                    <td className="right">{del}</td>
                    <td className="right">{formatBytes(size)}</td>
                  </tr>
                );
              })}

              {filteredCores.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Aucun core.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
