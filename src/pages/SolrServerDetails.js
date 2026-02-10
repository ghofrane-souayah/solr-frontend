// =====================
// 1️⃣ IMPORTS (TOUJOURS EN HAUT)
// =====================
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./SolrServerDetails.css";

// =====================
// 2️⃣ CONSTANTES
// =====================
const API = "http://localhost:8081/api/solr/servers";

// =====================
// 3️⃣ COMPONENT
// =====================
export default function SolrServerDetails() {
  const { name } = useParams();

  const [details, setDetails] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ collapse cores
  const [openCores, setOpenCores] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resDetails = await fetch(`${API}/${name}`);
      if (!resDetails.ok) throw new Error(`HTTP ${resDetails.status}`);
      const detailsJson = await resDetails.json();

      const resHealth = await fetch(`${API}/${name}/health`);
      const healthJson = resHealth.ok ? await resHealth.json() : null;

      setDetails(detailsJson);
      setHealth(healthJson);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement du serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (loading) return <div className="page notice">⏳ Chargement…</div>;
  if (error) return <div className="page notice error">❌ {error}</div>;
  if (!details) return null;

  const cores = Array.isArray(details.cores) ? details.cores : [];
  const hasCores = cores.length > 0;

  return (
    <div className="page">
      {/* HEADER */}
      <div className="header">
        <h1 className="title">Server: {details.name}</h1>

        <div className="actions">
          <button className="btn" onClick={load}>
            Refresh
          </button>
          <Link className="btn link" to="/solr-cluster">
            ← Back
          </Link>
        </div>
      </div>

      {/* INFOS */}
      <div className="card">
        <h2 className="sectionTitle">Informations</h2>

        <div className="grid">
          <Info label="Base URL" value={details.baseUrl} mono />
          <Info label="Host" value={details.host} />
          <Info label="Port" value={details.port} />
          <Info
            label="Status"
            value={
              <span className={`status ${details.status === "UP" ? "up" : "down"}`}>
                {details.status}
              </span>
            }
          />
          <Info label="CPU" value={`${details.cpu}%`} />
          <Info label="Memory" value={`${details.memory}%`} />
          <Info label="Total Docs" value={details.totalDocs} />
          <Info label="Total Size" value={`${details.totalSizeInBytes} bytes`} />
        </div>
      </div>

      {/* HEALTH */}
      {health && (
        <div className="card">
          <h2 className="sectionTitle">Health</h2>
          <div className="health">
            <span className={`status ${health.status === "UP" ? "up" : "down"}`}>
              {health.status}
            </span>
            <span className="mono">Response time: {health.responseTimeMs} ms</span>
          </div>
        </div>
      )}

      {/* CORES (✅ PRO COLLAPSE) */}
      <div className="card">
        <button
          type="button"
          className={`coresHeaderBtn ${openCores ? "open" : ""}`}
          onClick={() => hasCores && setOpenCores((v) => !v)}
          disabled={!hasCores}
          aria-expanded={openCores}
          aria-controls="cores-panel-details"
          title={!hasCores ? "Aucun core" : "Afficher / masquer"}
        >
          <div className="coresHeaderLeft">
            <span className="coresTitle">Cores</span>
            <span className="coresBadge">{cores.length}</span>
            {!hasCores ? <span className="coresHintInline">Aucun core</span> : null}
          </div>

          <span className={`chev ${openCores ? "rot" : ""}`}>▾</span>
        </button>

        <div id="cores-panel-details" className={`collapse ${openCores ? "open" : ""}`}>
          <div className="collapseInner">
            {!hasCores ? (
              <div className="notice warn">⚠️ Aucun core</div>
            ) : (
              <table className="table">
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
                      <td className="mono">
                        {/* ✅ FIX: route schema correcte */}
                        <Link
                          to={`/solr/schema/${name}/${c.name}`}
                          className="coreLink"
                          title={`Open schema for ${c.name}`}
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td>{c.numDocs ?? 0}</td>
                      <td>{c.deletedDocs ?? 0}</td>
                      <td>{formatBytes(c.sizeInBytes ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {!openCores && hasCores ? <div className="muted" style={{ marginTop: 10 }} /> : null}
      </div>
    </div>
  );
}

// =====================
// 4️⃣ COMPOSANT UTILITAIRE
// =====================
function Info({ label, value, mono }) {
  return (
    <div className="info">
      <div className="label">{label}</div>
      <div className={`value ${mono ? "mono" : ""}`}>{value}</div>
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
