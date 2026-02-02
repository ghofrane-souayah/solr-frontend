import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./SolrSchemaPage.css";

const API_BASE = "http://localhost:8081/api/solr";

export default function SolrSchemaPage() {
  const { name, core } = useParams();

  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  // Modal add
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "string",
    stored: true,
    indexed: true,
    multiValued: false,
  });
  const [actionMsg, setActionMsg] = useState("");

  const endpoints = {
    fields: `${API_BASE}/servers/${name}/collections/${core}/schema/fields`,
    types: `${API_BASE}/servers/${name}/collections/${core}/schema/fieldtypes`,
    dynamic: `${API_BASE}/servers/${name}/collections/${core}/schema/dynamicfields`,
    addField: `${API_BASE}/servers/${name}/collections/${core}/schema/fields`,
    deleteField: (fieldName) =>
      `${API_BASE}/servers/${name}/collections/${core}/schema/fields/${encodeURIComponent(fieldName)}`,
  };

  const loadAll = async () => {
    setError("");
    setActionMsg("");
    setLoading(true);

    try {
      const [fRes, tRes, dRes] = await Promise.all([
        fetch(endpoints.fields),
        fetch(endpoints.types),
        fetch(endpoints.dynamic),
      ]);

      if (!fRes.ok) throw new Error(`fields HTTP ${fRes.status}`);
      if (!tRes.ok) throw new Error(`types HTTP ${tRes.status}`);
      if (!dRes.ok) throw new Error(`dynamic HTTP ${dRes.status}`);

      const [fJson, tJson, dJson] = await Promise.all([
        fRes.json(),
        tRes.json(),
        dRes.json(),
      ]);

      setFields(Array.isArray(fJson) ? fJson : []);
      setTypes(Array.isArray(tJson) ? tJson : []);
      setDynamicFields(Array.isArray(dJson) ? dJson : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger le schema (backend? core? endpoints?).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, core]);

  const filteredFields = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return fields;
    return fields.filter((f) => `${f.name} ${f.type}`.toLowerCase().includes(query));
  }, [fields, q]);

  const openAdd = () => {
    setActionMsg("");
    setForm({
      name: "",
      type: types?.[0] || "string",
      stored: true,
      indexed: true,
      multiValued: false,
    });
    setShowAdd(true);
  };

  const addField = async (e) => {
    e.preventDefault();
    setActionMsg("");
    setError("");

    if (!form.name.trim()) {
      setActionMsg("⚠️ Le nom du field est obligatoire.");
      return;
    }

    try {
      const res = await fetch(endpoints.addField, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          stored: !!form.stored,
          indexed: !!form.indexed,
          multiValued: !!form.multiValued,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionMsg(`❌ Add field failed (HTTP ${res.status}).`);
        console.log("Solr response:", json);
        return;
      }

      setActionMsg("✅ Field ajouté !");
      setShowAdd(false);
      await loadAll();
    } catch (e2) {
      console.error(e2);
      setActionMsg("❌ Erreur réseau pendant l'ajout.");
    }
  };

  const deleteField = async (fieldName) => {
    setActionMsg("");
    setError("");

    const ok = window.confirm(`Supprimer le field "${fieldName}" ?`);
    if (!ok) return;

    try {
      const res = await fetch(endpoints.deleteField(fieldName), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionMsg(`❌ Delete failed (HTTP ${res.status}).`);
        console.log("Solr response:", json);
        return;
      }

      setActionMsg("✅ Field supprimé !");
      await loadAll();
    } catch (e) {
      console.error(e);
      setActionMsg("❌ Erreur réseau pendant la suppression.");
    }
  };

  return (
    <div className="schemaPage">
      <div className="schemaTopbar">
        <div className="schemaTitleBlock">
          <div className="schemaBreadcrumb">
            <Link to="/solr/cluster" className="link">
              Solr Cluster
            </Link>
            <span className="sep">›</span>
            <Link to={`/solr/server/${name}`} className="link">
              {name}
            </Link>
            <span className="sep">›</span>
            <span className="current">Schema</span>
          </div>

          <h1 className="schemaTitle">
            Schema — <span className="mono">{core}</span>
          </h1>
          <div className="schemaSubtitle">Fields / Types / Dynamic fields</div>
        </div>

        <div className="schemaActions">
          <button className="btn" onClick={loadAll} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="btn primary" onClick={openAdd} disabled={loading}>
            + Add field
          </button>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {actionMsg && <div className="notice">{actionMsg}</div>}

      <div className="schemaGrid">
        {/* LEFT: Fields */}
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Fields</div>
              <div className="muted">{filteredFields.length} field(s)</div>
            </div>

            <input
              className="search"
              placeholder="Search field..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="notice">⏳ Chargement...</div>
          ) : filteredFields.length === 0 ? (
            <div className="notice">Aucun field.</div>
          ) : (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Stored</th>
                    <th>Indexed</th>
                    <th>Multi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.map((f) => (
                    <tr key={f.name}>
                      <td className="mono">{f.name}</td>
                      <td>{f.type}</td>
                      <td>{f.stored ? "✅" : "—"}</td>
                      <td>{f.indexed ? "✅" : "—"}</td>
                      <td>{f.multiValued ? "✅" : "—"}</td>
                      <td className="right">
                        <button className="btn danger sm" onClick={() => deleteField(f.name)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: Types + Dynamic */}
        <div className="rightCol">
          <div className="card">
            <div className="cardTitle">Field Types</div>
            {types.length === 0 ? (
              <div className="notice">Aucun type.</div>
            ) : (
              <div className="chips">
                {types.map((t) => (
                  <span key={t} className="chip mono">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="cardTitle">Dynamic Fields</div>
            {dynamicFields.length === 0 ? (
              <div className="notice">Aucun dynamic field.</div>
            ) : (
              <div className="chips">
                {dynamicFields.map((d) => (
                  <span key={d} className="chip mono">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL ADD FIELD */}
      {showAdd && (
        <div className="modalOverlay" onMouseDown={() => setShowAdd(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">Add Field</div>
              <button className="iconBtn" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>

            <form className="modalBody" onSubmit={addField}>
              <label className="label">
                Field name
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ex: my_field_s"
                />
              </label>

              <label className="label">
                Type
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                >
                  {types.length === 0 ? (
                    <option value="string">string</option>
                  ) : (
                    types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
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
              </div>

              <div className="modalFoot">
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
