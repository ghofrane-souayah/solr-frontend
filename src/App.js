import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./Layout/Layout";
import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchema from "./pages/SolrSchema";
import Users from "./pages/Users";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/solr-cluster" replace />} />
        <Route path="solr-cluster" element={<SolrCluster />} />
        <Route path="solr/server/:name" element={<SolrServerDetails />} />
        <Route path="solr-schema" element={<SolrSchema />} />
        <Route path="users" element={<Users />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
