// src/pages/SolrSchemaPage.js
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./SolrSchemaPage.css";

const API_BASE = "http://localhost:8081/api/solr";

export default function SolrSchemaPage() {
  // ✅ récupère server/core depuis l'URL: /solr/schema/:serverName/:core
  const { serverName, core: coreParam } = useParams();

  const [server, setServer] = useState("");
  const [core, setCore] = useState("");

  const [activeTab, setActiveTab] = useState("fields"); // fields | types | dynamic
  const [query, setQuery] = useState("");

  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);
  const [dynamic, setDynamic] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal add/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "string",
    stored: true,
    indexed: true,
    multiValued: false,
    required: false,
  });

  // ✅ quand l'URL change (clic sur un core), on remplit server/core automatiquement
  useEffect(() => {
    if (serverName) setServer(serverName);
    if (coreParam) setCore(coreParam);
  }, [serverName, coreParam]);

  const canLoad = !!server && !!core;

  const schemaUrls = useMemo(() => {
    if (!canLoad) return null;
    const base = `${API_BASE}/servers/${encodeURIComponent(
      server
    )}/collections/${encodeURIComponent(core)}/schema`;
    return {
      fields: `${base}/fields`,
      fieldtypes: `${base}/fieldtypes`,
      dynamicfields: `${base}/dynamicfields`,
    };
  }, [server, core, canLoad]);

  const filteredFields = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((f) => {
      const name = String(f.name ?? "").toLowerCase();
      const type = String(f.type ?? "").toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [fields, query]);

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => String(t).toLowerCase().includes(q));
  }, [types, query]);

  const filteredDynamic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dynamic;
    return dynamic.filter((d) => String(d).toLowerCase().includes(q));
  }, [dynamic, query]);

  const loadSchema = async () => {
    if (!canLoad || !schemaUrls) {
      setError("Choisis un server et un core pour charger le schema.");
      setFields([]);
      setTypes([]);
      setDynamic([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [resFields, resTypes, resDyn] = await Promise.all([
        fetch(schemaUrls.fields),
        fetch(schemaUrls.fieldtypes),
        fetch(schemaUrls.dynamicfields),
      ]);

      if (!resFields.ok) throw new Error(`Fields HTTP ${resFields.status}`);
      if (!resTypes.ok) throw new Error(`Types HTTP ${resTypes.status}`);
      if (!resDyn.ok) throw new Error(`Dynamic HTTP ${resDyn.status}`);

      const [fieldsJson, typesJson, dynJson] = await Promise.all([
        resFields.json(),
        resTypes.json(),
        resDyn.json(),
      ]);

      setFields(Array.isArray(fieldsJson) ? fieldsJson : []);
      setTypes(Array.isArray(typesJson) ? typesJson : []);
      setDynamic(Array.isArray(dynJson) ? dynJson : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger le schema (backend / core / endpoints).");
      setFields([]);
      setTypes([]);
      setDynamic([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ charge automatiquement dès que server/core deviennent valides
  useEffect(() => {
    if (!server || !core) return;
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, core]);

  // ---------- CRUD fields ----------
  const openAdd = () => {
    setEditMode(false);
    setForm({
      name: "",
      type: "string",
      stored: true,
      indexed: true,
      multiValued: false,
      required: false,
    });
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditMode(true);
    setForm({
      name: f?.name ?? "",
      type: f?.type ?? "string",
      stored: !!f?.stored,
      indexed: !!f?.indexed,
      multiValued: !!f?.multiValued,
      required: !!f?.required,
    });
    setModalOpen(true);
  };

  const submitField = async () => {
    if (!canLoad || !schemaUrls) return;

    const name = String(form.name || "").trim();
    if (!name) {
      setError("Field name est obligatoire.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = editMode
        ? `${schemaUrls.fields}/${encodeURIComponent(name)}`
        : schemaUrls.fields;

      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: form.type,
          stored: form.stored,
          indexed: form.indexed,
          multiValued: form.multiValued,
          required: form.required,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${method} HTTP ${res.status} ${txt}`);
      }

      setModalOpen(false);
      await loadSchema();
    } catch (e) {
      console.error(e);
      setError("Action échouée (add/update field). Vérifie le backend.");
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (fieldName) => {
    if (!canLoad || !schemaUrls) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${schemaUrls.fields}/${encodeURIComponent(fieldName)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`DELETE HTTP ${res.status} ${txt}`);
      }

      await loadSchema();
    } catch (e) {
      console.error(e);
      setError("Delete échoué. Vérifie l’endpoint / deleteField backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="schemaWrap">
      <div className="schemaHeader">
        <div className="schemaTitleBlock">
          <div className="schemaBreadcrumb">
            <Link className="link" to="/solr-cluster">
              Solr Cluster
            </Link>
            <span className="sep">/</span>
            <span className="mono">Schema</span>
          </div>

          <div className="schemaTitle">Schema</div>

          <div className="schemaSubtitle">
            Server: <span className="mono">{server || "—"}</span> &nbsp; Core:{" "}
            <span className="mono">{core || "—"}</span>
          </div>
        </div>

        <div className="schemaHeaderActions">
          <button className="btn ghost" disabled={!canLoad || loading} onClick={loadSchema}>
            ↻ Refresh
          </button>

          <button className="btn primary" disabled={!canLoad || loading} onClick={openAdd}>
            + Add field
          </button>

          <Link className="btn ghost" to="/solr-cluster">
            ← Back
          </Link>
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}
      {!error && loading && <div className="alert">Chargement…</div>}

      <div className="toolbar">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "fields" ? "active" : ""}`}
            onClick={() => setActiveTab("fields")}
          >
            Fields <span className="pill">{fields.length}</span>
          </button>

          <button
            className={`tab ${activeTab === "types" ? "active" : ""}`}
            onClick={() => setActiveTab("types")}
          >
            Types <span className="pill">{types.length}</span>
          </button>

          <button
            className={`tab ${activeTab === "dynamic" ? "active" : ""}`}
            onClick={() => setActiveTab("dynamic")}
          >
            Dynamic <span className="pill">{dynamic.length}</span>
          </button>
        </div>

        <input
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (field/type/dynamic)..."
        />
      </div>

      <div className="grid">
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">
                {activeTab === "fields"
                  ? "Fields"
                  : activeTab === "types"
                  ? "Field Types"
                  : "Dynamic Fields"}
              </div>
              <div className="muted">
                {activeTab === "fields"
                  ? `${filteredFields.length} field(s)`
                  : activeTab === "types"
                  ? `${filteredTypes.length} type(s)`
                  : `${filteredDynamic.length} item(s)`}
              </div>
            </div>
          </div>

          {activeTab === "fields" ? (
            <div className="tableWrap">
              {filteredFields.length === 0 ? (
                <div className="empty">Aucun field.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th className="center">Stored</th>
                      <th className="center">Indexed</th>
                      <th className="center">Multi</th>
                      <th className="right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.map((f) => (
                      <tr key={f.name}>
                        <td className="mono">{f.name}</td>
                        <td>
                          <span className="tag">{f.type}</span>
                        </td>
                        <td className="center">{f.stored ? "✓" : "—"}</td>
                        <td className="center">{f.indexed ? "✓" : "—"}</td>
                        <td className="center">{f.multiValued ? "✓" : "—"}</td>
                        <td className="right">
                          <button
                            className="btn sm"
                            disabled={!canLoad || loading}
                            onClick={() => openEdit(f)}
                          >
                            Edit
                          </button>{" "}
                          <button
                            className="btn sm danger"
                            disabled={!canLoad || loading}
                            onClick={() => deleteField(f.name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === "types" ? (
            <div className="chipsScroll">
              {filteredTypes.length === 0 ? (
                <div className="empty">Aucun élément.</div>
              ) : (
                <div className="chips">
                  {filteredTypes.map((t) => (
                    <div className="chip mono" key={t}>
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="chipsScroll">
              {filteredDynamic.length === 0 ? (
                <div className="empty">Aucun élément.</div>
              ) : (
                <div className="chips">
                  {filteredDynamic.map((d) => (
                    <div className="chip mono" key={d}>
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rightCol">
          <div className="card">
            <div className="cardHead">
              <div>
                <div className="cardTitle">Info</div>
                <div className="muted">
                  Cette page lit server/core depuis l’URL.
                </div>
              </div>
            </div>
            <div className="empty">
              URL attendue: <span className="mono">/solr/schema/{"{server}"}/{"{core}"}</span>
              <div className="hint">
                Exemple: /solr/schema/solr1/gettingstarted
              </div>
            </div>
          </div>

          <div className="card">
            <div className="cardHead">
              <div>
                <div className="cardTitle">Counts</div>
                <div className="muted">Résumé</div>
              </div>
            </div>
            <div className="empty">
              Fields: <b>{fields.length}</b>
              <br />
              Types: <b>{types.length}</b>
              <br />
              Dynamic: <b>{dynamic.length}</b>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modalOverlay" onMouseDown={() => setModalOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">{editMode ? "Update field" : "Add field"}</div>
              <button className="iconBtn" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modalBody">
              <label className="label">
                Field name
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ex: title"
                  disabled={editMode}
                />
              </label>

              <label className="label">
                Type
                <input
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  placeholder="ex: string"
                />
              </label>

              <div className="checks">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.stored}
                    onChange={(e) => setForm((p) => ({ ...p, stored: e.target.checked }))}
                  />
                  stored
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.indexed}
                    onChange={(e) => setForm((p) => ({ ...p, indexed: e.target.checked }))}
                  />
                  indexed
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.multiValued}
                    onChange={(e) => setForm((p) => ({ ...p, multiValued: e.target.checked }))}
                  />
                  multiValued
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
                  />
                  required
                </label>
              </div>
            </div>

            <div className="modalFoot">
              <button className="btn ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={loading} onClick={submitField}>
                {editMode ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
