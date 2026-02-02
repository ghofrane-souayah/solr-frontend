import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./SolrSchema.css";

const API = "http://localhost:8081/api/solr/servers";

export default function SolrSchema() {
  const { name, core } = useParams();

  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("FIELDS"); // FIELDS | TYPES | DYNAMIC
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [fRes, tRes, dRes] = await Promise.all([
        fetch(`${API}/${name}/cores/${core}/schema/fields`),
        fetch(`${API}/${name}/cores/${core}/schema/types`),
        fetch(`${API}/${name}/cores/${core}/schema/dynamic-fields`),
      ]);

      if (!fRes.ok) throw new Error(`Fields HTTP ${fRes.status}`);
      if (!tRes.ok) throw new Error(`Types HTTP ${tRes.status}`);
      if (!dRes.ok) throw new Error(`Dynamic HTTP ${dRes.status}`);

      const fJson = await fRes.json();
      const tJson = await tRes.json();
      const dJson = await dRes.json();

      // ✅ on accepte plusieurs formats possibles
      setFields(Array.isArray(fJson) ? fJson : fJson.fields || []);
      setTypes(Array.isArray(tJson) ? tJson : tJson.fieldTypes || tJson.types || []);
      setDynamicFields(Array.isArray(dJson) ? dJson : dJson.dynamicFields || []);
    } catch (e) {
      console.error(e);
      setError(
        "Impossible de charger le schema (endpoints backend manquants ? core introuvable ?)."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, core]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const filterList = (arr, fieldsToSearch) => {
      if (!query) return arr;
      return arr.filter((x) => {
        const hay = fieldsToSearch.map((k) => String(x?.[k] ?? "")).join(" ").toLowerCase();
        return hay.includes(query);
      });
    };

    if (tab === "FIELDS") return filterList(fields, ["name", "type"]);
    if (tab === "TYPES") return filterList(types, ["name", "class"]);
    return filterList(dynamicFields, ["name", "type"]);
  }, [tab, q, fields, types, dynamicFields]);

  return (
    <div className="schemaPage">
      {/* HEADER */}
      <div className="schemaHeader">
        <div>
          <div className="schemaBreadcrumb">
            <Link to="/solr-cluster" className="schemaLink">
              Solr Cluster
            </Link>
            <span className="schemaSep">/</span>
            <Link to={`/solr/server/${name}`} className="schemaLink">
              {name}
            </Link>
            <span className="schemaSep">/</span>
            <span className="schemaCore mono">{core}</span>
          </div>

          <h1 className="schemaTitle">Schema</h1>
          <div className="schemaSubtitle">
            Server: <span className="mono">{name}</span> — Core:{" "}
            <span className="mono">{core}</span>
          </div>
        </div>

        <div className="schemaActions">
          <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <Link className="btn" to={`/solr/server/${name}`}>
            ← Back
          </Link>
        </div>
      </div>

      {/* TOP BAR */}
      <div className="schemaBar">
        <div className="tabs">
          <button
            className={`tabBtn ${tab === "FIELDS" ? "active" : ""}`}
            onClick={() => setTab("FIELDS")}
          >
            Fields <span className="badge">{fields.length}</span>
          </button>

          <button
            className={`tabBtn ${tab === "TYPES" ? "active" : ""}`}
            onClick={() => setTab("TYPES")}
          >
            Types <span className="badge">{types.length}</span>
          </button>

          <button
            className={`tabBtn ${tab === "DYNAMIC" ? "active" : ""}`}
            onClick={() => setTab("DYNAMIC")}
          >
            Dynamic <span className="badge">{dynamicFields.length}</span>
          </button>
        </div>

        <input
          className="search"
          placeholder="Search (name / type / class)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <div className="notice error">❌ {error}</div>}
      {loading && <div className="notice">⏳ Chargement du schema...</div>}

      {/* CONTENT */}
      <div className="card">
        {tab === "FIELDS" && <FieldsTable rows={filtered} />}
        {tab === "TYPES" && <TypesTable rows={filtered} />}
        {tab === "DYNAMIC" && <DynamicTable rows={filtered} />}
      </div>
    </div>
  );
}

/* ===========================
   TABLES
=========================== */

function FieldsTable({ rows }) {
  if (!rows || rows.length === 0) return <Empty text="Aucun field." />;

  return (
    <>
      <div className="cardTitle">Fields</div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Stored</th>
            <th>Indexed</th>
            <th>MultiValued</th>
            <th>Required</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.name}>
              <td className="mono">{f.name}</td>
              <td>
                <span className="chip">{f.type || "-"}</span>
              </td>
              <td>{bool(f.stored)}</td>
              <td>{bool(f.indexed)}</td>
              <td>{bool(f.multiValued)}</td>
              <td>{bool(f.required)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TypesTable({ rows }) {
  if (!rows || rows.length === 0) return <Empty text="Aucun type." />;

  return (
    <>
      <div className="cardTitle">Types</div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Analyzer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.name}>
              <td className="mono">{t.name}</td>
              <td className="mono">{t.class || t.className || "-"}</td>
              <td>{t.analyzer ? "✅" : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DynamicTable({ rows }) {
  if (!rows || rows.length === 0) return <Empty text="Aucun dynamic field." />;

  return (
    <>
      <div className="cardTitle">Dynamic Fields</div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Stored</th>
            <th>Indexed</th>
            <th>MultiValued</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.name}>
              <td className="mono">{d.name}</td>
              <td>
                <span className="chip">{d.type || "-"}</span>
              </td>
              <td>{bool(d.stored)}</td>
              <td>{bool(d.indexed)}</td>
              <td>{bool(d.multiValued)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Empty({ text }) {
  return <div className="notice warn">⚠️ {text}</div>;
}

function bool(v) {
  return v === true ? "✅" : "—";
}
