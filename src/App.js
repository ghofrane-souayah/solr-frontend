import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchema from "./pages/SolrSchema";

export default function App() {
  return (
    <Routes>
      {/* page par défaut */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/solr-cluster" element={<SolrCluster />} />
      <Route path="/solr/server/:name" element={<SolrServerDetails />} />
      <Route path="/solr/server/:name/schema/:core" element={<SolrSchema />} />

      {/* fallback 404 */}
      <Route path="*" element={<div style={{ padding: 30 }}>404</div>} />
    </Routes>
  );
}
