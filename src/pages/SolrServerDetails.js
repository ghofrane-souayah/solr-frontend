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

      {/* CORES */}
      <div className="card">
        <h2 className="sectionTitle">Cores</h2>

        {!Array.isArray(details.cores) || details.cores.length === 0 ? (
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
              {details.cores.map((c) => (
                <tr key={c.name}>
                  <td className="mono">
                    {/* ✅ Link du core (c est défini ici) */}
                    <Link
                      to={`/solr/server/${name}/schema/${c.name}`}
                      className="coreLink"
                    > 
                    <td>
  <Link
    to={`/solr/server/${name}/schema/${c.name}`}
    className="coreLink"
  >
    {c.name}
  </Link>
</td>

                      {c.name}
                    </Link>
                  </td>
                  <td>{c.numDocs ?? 0}</td>
                  <td>{c.deletedDocs ?? 0}</td>
                  <td>{c.sizeInBytes ?? 0} bytes</td>
                </tr>
                
              ))}
            </tbody>
          </table>
        )}
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
