import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";

import Layout from "./Layout/Layout";

import Dashboard from "./pages/Dashboard";
import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchemaPage from "./pages/SolrSchemaPage";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import Profile from "./pages/profile";
import Forbidden from "./components/Forbidden";
import RequireAuth from "./components/RequireAuth";
import SolrInstances from "./pages/SolrInstances";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Protected layout */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="solr-cluster" replace />} />

        <Route
          path="profile"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <Profile />
            </RequireAuth>
          }
        />

        <Route
          path="dashboard"
          element={
            <RequireAuth allow={["ADMIN", "SUPER_ADMIN"]}>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route
          path="users"
          element={
            <RequireAuth allow={["ADMIN", "SUPER_ADMIN"]}>
              <Users />
            </RequireAuth>
          }
        />

        <Route
          path="companies"
          element={
            <RequireAuth allow={["SUPER_ADMIN"]}>
              <Companies />
            </RequireAuth>
          }
        />

        <Route
          path="solr-cluster"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <SolrCluster />
            </RequireAuth>
          }
        />

        <Route
          path="solr-instances"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <SolrInstances />
            </RequireAuth>
          }
        />

        <Route
          path="solr/server/:id"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <SolrServerDetails />
            </RequireAuth>
          }
        />

        <Route
          path="solr-schema"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <SolrSchemaPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}