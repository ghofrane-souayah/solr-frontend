import SolrDashboard from "../components/SolrDashboard";
export default function Viewer({ user, onLogout }) {
  return (
    <div className="container">
      <div className="card">
        <h1>Dashboard Viewer</h1>
        <p className="notice">Connecté : {user.email} — {user.role}</p>

        <button className="btn" onClick={onLogout}>
          Déconnexion
        </button>

        <h2>Accès lecture seule</h2>
        <ul>
          <li>Voir les métriques Solr</li>
          <li>Voir l’état des cores</li>
          <li>Voir les logs / erreurs</li>
        </ul>
      </div>
       <SolrDashboard />
    </div>
  );
}