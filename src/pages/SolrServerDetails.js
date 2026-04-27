import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./SolrServerDetails.css";

const API = "http://localhost:8081/api/solr/servers";

function getAuthHeaders() {
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
  const { id } = useParams();
  const nav = useNavigate();

  const [details, setDetails] = useState(null);
  const [health, setHealth] = useState(null);
  const [cores, setCores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const roles = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem("roles") || "[]");
      return (Array.isArray(raw) ? raw : []).map((r) =>
        String(r || "").replace("ROLE_", "").toUpperCase()
      );
    } catch {
      return [];
    }
  })();

  const canManageCollections =
    roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setErr("");

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErr("Session expirée. Reconnecte-toi.");
          nav("/login", { replace: true });
          return;
        }

        if (!id) {
          setErr("ID serveur manquant (route invalide).");
          return;
        }

        const headers = getAuthHeaders();

        const resDetails = await fetch(`${API}/${encodeURIComponent(id)}`, {
          method: "GET",
          headers,
          signal,
        });

        if (resDetails.status === 401) throw new Error("UNAUTHORIZED");
        if (resDetails.status === 403) throw new Error("FORBIDDEN");
        if (!resDetails.ok) throw new Error(`HTTP_${resDetails.status}`);

        const d = await resDetails.json();

        let hl = null;
        try {
          const resHealth = await fetch(
            `${API}/${encodeURIComponent(id)}/health`,
            {
              method: "GET",
              headers,
              signal,
            }
          );
          if (resHealth.status === 401) throw new Error("UNAUTHORIZED");
          if (resHealth.status === 403) throw new Error("FORBIDDEN");
          if (resHealth.ok) hl = await resHealth.json();
        } catch {
        }

        const coresArr = Array.isArray(d?.cores) ? d.cores : [];

        setDetails(d);
        setHealth(hl);
        setCores(coresArr);
      } catch (e) {
        if (e?.name === "AbortError") return;

        setDetails(null);
        setHealth(null);
        setCores([]);

        if (e?.message === "UNAUTHORIZED") {
          setErr("Session expirée. Reconnecte-toi.");
          localStorage.removeItem("token");
          nav("/login", { replace: true });
        } else if (e?.message === "FORBIDDEN") {
          setErr("Accès refusé : tu n’as pas la permission d’ouvrir ces détails.");
        } else {
          setErr("Erreur de chargement serveur.");
        }
      } finally {
        setLoading(false);
      }
    },
    [id, nav]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const baseUrl = useMemo(() => {
    const host = details?.host ?? "localhost";
    const port = details?.port ?? "";
    if (!port) return "";
    return `http://${host}:${port}`;
  }, [details]);

  const computedStatus = useMemo(() => {
    const s1 = String(details?.status ?? "").toUpperCase();
    const s2 = String(health?.status ?? "").toUpperCase();
    return s1 === "UP" || s2 === "UP" ? "UP" : "DOWN";
  }, [details, health]);

  const isUp = computedStatus === "UP";

  const cpu = Number(details?.cpu ?? 0);
  const mem = Number(details?.memory ?? 0);
  const totalDocs = details?.totalDocs ?? 0;
  const totalSize = details?.totalSizeInBytes ?? 0;

  const filteredCores = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cores;
    return cores.filter((c) =>
      String(c?.name ?? "").toLowerCase().includes(s)
    );
  }, [cores, q]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const goToSchema = (coreName) => {
    const cn = String(coreName || "").trim();
    if (!cn || cn === "—") return;

    nav(
      `/solr-schema?serverId=${encodeURIComponent(id)}&core=${encodeURIComponent(
        cn
      )}`
    );
  };

  return (
    <div className="srvPage">
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
            <h1 className="srvTitle">{details?.name ?? `Server #${id}`}</h1>
            <span className={`badge ${isUp ? "ok" : "down"}`}>
              {isUp ? "UP" : "DOWN"}
            </span>
            {baseUrl && (
              <span className="chip mono" title={baseUrl}>
                {baseUrl}
              </span>
            )}
          </div>

          <div className="srvSub">
            Monitoring détaillé du serveur (CPU, mémoire, cores, santé).
          </div>
        </div>

        <div className="srvHeaderRight">
          {baseUrl && (
            <button
              className="btn ghost"
              onClick={() => copy(baseUrl)}
              title="Copier l’URL"
            >
              Copier URL
            </button>
          )}

          {canManageCollections && (
            <button
              className="btn ghost"
              onClick={() =>
                nav(`/solr/server/${encodeURIComponent(id)}/collections`)
              }
            >
              Collections
            </button>
          )}

          <button
            className="btn"
            onClick={() => {
              const controller = new AbortController();
              load(controller.signal);
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "  ⟳ Actualiser"}
          </button>
        </div>
      </div>

      {err && <div className="notice error">❌ {err}</div>}

      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">CPU</div>
            <div className={`kpiTag ${pctTone(cpu)}`}>{cpu}%</div>
          </div>
          <div className="bar">
            <div
              className={`barFill ${pctTone(cpu)}`}
              style={{ width: `${Math.min(100, Math.max(0, cpu))}%` }}
            />
          </div>
          <div className="kpiHint">Utilisation processeur</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Memory</div>
            <div className={`kpiTag ${pctTone(mem)}`}>{mem}%</div>
          </div>
          <div className="bar">
            <div
              className={`barFill ${pctTone(mem)}`}
              style={{ width: `${Math.min(100, Math.max(0, mem))}%` }}
            />
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

      <div className="grid2">
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
                <span className={`pill ${isUp ? "ok" : "down"}`}>
                  {isUp ? "UP" : "DOWN"}
                </span>
              </div>
            </div>
          </div>
        </div>

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
              <div className="v">
                {health?.responseTimeMs != null
                  ? `${health.responseTimeMs} ms`
                  : "—"}
              </div>
            </div>
            <div className="healthItem">
              <div className="k">Ping</div>
              <div className="v">
                <span className={`pill ${isUp ? "ok" : "down"}`}>
                  {isUp ? "OK" : "FAIL"}
                </span>
              </div>
            </div>
            <div className="healthItem">
              <div className="k">Message</div>
              <div className="v">
                {health?.message ?? (isUp ? "Healthy" : "Unreachable")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead row">
          <div>
            <div className="panelTitle">Collections</div>
            <div className="panelSub">Liste et statistiques des collections</div>
          </div>

          <div className="rightTools">
            <div className="searchBox">
              <span>⌕</span>
              <input
                placeholder="rechrche collection…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
                <th>Nom</th>
                <th className="right">Docs</th>
                <th className="right">Supprimer</th>
                <th className="right">Taille</th>
              </tr>
            </thead>
            <tbody>
              {filteredCores.map((c) => {
                const coreName = c?.name ?? "—";
                return (
                  <tr
                    key={coreName}
                    className="coreRowClickable"
                    onClick={() => goToSchema(coreName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        goToSchema(coreName);
                      }
                    }}
                    title="Ouvrir Solr Schema"
                  >
                    <td className="mono">{coreName}</td>
                    <td className="right">{c.numDocs ?? 0}</td>
                    <td className="right">{c.deletedDocs ?? 0}</td>
                    <td className="right">{formatBytes(c.sizeInBytes ?? 0)}</td>
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