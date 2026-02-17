import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";

import Layout from "./Layout/Layout";

import Dashboard from "./pages/Dashboard";
import SolrCluster from "./pages/SolrCluster";
import SolrServerDetails from "./pages/SolrServerDetails";
import SolrSchema from "./pages/SolrSchema";
import Users from "./pages/Users";
import Companies from "./pages/Companies";

import Profile from "./pages/profile";
import Forbidden from "./components/Forbidden";

import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      {/* ✅ Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* ✅ USER route (token required) */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />

      {/* ✅ Protected Layout (token required) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {/* ✅ default داخل Layout */}
        <Route index element={<Navigate to="/solr-cluster" replace />} />

        {/* ✅ ADMIN / SUPER_ADMIN */}
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

        {/* ✅ Solr pages: USER + ADMIN + SUPER_ADMIN */}
        <Route
          path="solr-cluster"
          element={
            <RequireAuth allow={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <SolrCluster />
            </RequireAuth>
          }
        />

        <Route
          path="solr/server/:name"
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
              <SolrSchema />
            </RequireAuth>
          }
        />
      </Route>

      {/* ✅ Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
