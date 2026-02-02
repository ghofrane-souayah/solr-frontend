import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchema from "./pages/SolrSchema";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/solr-cluster" element={<SolrCluster />} />

      {/* details serveur */}
      <Route path="/solr/server/:name" element={<SolrServerDetails />} />

      {/* schema d’un core */}
      <Route path="/solr/server/:name/schema/:core" element={<SolrSchema />} />
    </Routes>
  );
}
