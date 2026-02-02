import SolrDashboard from "../components/SolrDashboard";
export default function Admin({ user, onLogout }) {
  return (
    <div className="container">
      <div className="card">
        <h1>Dashboard Admin</h1>
        <p className="notice">Connecté : {user.email} — {user.role}</p>

        <button className="btn" onClick={onLogout}>
          Déconnexion
        </button>

        <h2>Actions admin</h2>
        <ul>
          <li>Ajouter / supprimer des users</li>
          <li>Configurer les alertes Solr</li>
          <li>Voir toutes les métriques</li>
        </ul>
      </div>
       <SolrDashboard />
    </div>
  );
}