import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchemaPage from "./pages/SolrSchemaPage";
import SolrSchema from "./pages/SolrSchema"; // si tu l’as
import Users from "./pages/Users"; // si pas encore, crée une page vide

import Layout from "./Layout/Layout";

function RequireAuth({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return user ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return user ? <Navigate to="/solr-cluster" replace /> : children;
}
function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return user?.role === "ADMIN"
    ? children
    : <Navigate to="/solr-cluster" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* page d’accueil */}
      <Route path="/" element={<Navigate to="/solr-cluster" replace />} />

      {/* Auth */}
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <Login />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuth>
            <Register />
          </RedirectIfAuth>
        }
      />

      {/* Dashboard + pages protégées */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/solr-cluster" element={<SolrCluster />} />
        <Route path="/solr/server/:name" element={<SolrServerDetails />} />

        {/* ✅ ROUTE PRO pour clic core -> schema */}
        <Route path="/solr/schema/:serverName/:core" element={<SolrSchemaPage />} />

        {/* ✅ route simple si tu veux ouvrir schema sans params (optionnel) */}
        <Route path="/solr-schema" element={<SolrSchemaPage />} />

        {/* optionnel */}
        <Route path="/schema" element={<SolrSchema />} />

        {/* users */}
       <Route
  path="/users"
  element={
    <RequireAdmin>
      <Users />
    </RequireAdmin>
  }
/>
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/solr-cluster" replace />} />
    </Routes>
  );
}
