import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Collections.css";

const API = "http://localhost:8081/api/solr/collections";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export default function Collections() {
  const { id } = useParams(); // /solr/server/:id/collections
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    name: "",
    numShards: 1,
    replicationFactor: 1,
  });

  const resetMsg = () => {
    setErr("");
    setOk("");
  };

  const loadCollections = useCallback(
    async (signal) => {
      setLoading(true);
      resetMsg();

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErr("Session expirée. Reconnecte-toi.");
          nav("/login", { replace: true });
          return;
        }

        const headers = getAuthHeaders();

        const res = await fetch(`${API}?serverId=${encodeURIComponent(id)}`, {
          method: "GET",
          headers,
          signal,
        });

        if (res.status === 401) throw new Error("UNAUTHORIZED");
        if (res.status === 403) throw new Error("FORBIDDEN");
        if (!res.ok) throw new Error(`HTTP_${res.status}`);

        const data = await res.json();

        setServerInfo(data?.server ?? null);
        setItems(Array.isArray(data?.collections) ? data.collections : []);
      } catch (e) {
        if (e?.name === "AbortError") return;

        setItems([]);
        if (e?.message === "UNAUTHORIZED") {
          setErr("Session expirée. Reconnecte-toi.");
          localStorage.removeItem("token");
          nav("/login", { replace: true });
        } else if (e?.message === "FORBIDDEN") {
          setErr("Accès refusé.");
        } else {
          setErr("Erreur lors du chargement des collections.");
        }
      } finally {
        setLoading(false);
      }
    },
    [id, nav]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadCollections(controller.signal);
    return () => controller.abort();
  }, [loadCollections]);

  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) =>
      `${c?.name ?? ""} ${c?.configName ?? ""}`.toLowerCase().includes(s)
    );
  }, [items, q]);

  const totalDocs = useMemo(
    () => items.reduce((sum, c) => sum + Number(c?.numDocs || 0), 0),
    [items]
  );

  const totalSize = useMemo(
    () => items.reduce((sum, c) => sum + Number(c?.sizeInBytes || 0), 0),
    [items]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMsg();

    if (!form.name.trim()) {
      setErr("Le nom de la collection est obligatoire.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          serverId: Number(id),
          name: form.name.trim(),
          numShards: Number(form.numShards || 1),
          replicationFactor: Number(form.replicationFactor || 1),
        }),
      });

      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      setOk("Collection créée avec succès.");
      setForm({
        name: "",
        numShards: 1,
        replicationFactor: 1,
      });

      await loadCollections();
    } catch (e) {
      if (e?.message === "UNAUTHORIZED") {
        setErr("Session expirée. Reconnecte-toi.");
      } else if (e?.message === "FORBIDDEN") {
        setErr("Accès refusé.");
      } else {
        setErr("Erreur lors de la création de la collection.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name) => {
    const okDelete = window.confirm(`Supprimer la collection "${name}" ?`);
    if (!okDelete) return;

    resetMsg();

    try {
      const res = await fetch(
        `${API}/${encodeURIComponent(name)}?serverId=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      setOk("Collection supprimée avec succès.");
      await loadCollections();
    } catch (e) {
      if (e?.message === "UNAUTHORIZED") {
        setErr("Session expirée. Reconnecte-toi.");
      } else if (e?.message === "FORBIDDEN") {
        setErr("Accès refusé.");
      } else {
        setErr("Erreur lors de la suppression.");
      }
    }
  };

  const openSchema = (collectionName) => {
    if (!collectionName) return;
    nav(
      `/solr-schema?serverId=${encodeURIComponent(id)}&core=${encodeURIComponent(
        collectionName
      )}`
    );
  };

  return (
    <div className="colPage">
      <div className="colHeader">
        <div className="colHeaderLeft">
          <div className="crumbs">
            <button className="linkLike" onClick={() => nav("/solr-cluster")}>
              Cluster
            </button>
            <span className="sep">/</span>
            <button
              className="linkLike"
              onClick={() => nav(`/solr/server/${encodeURIComponent(id)}`)}
            >
              Server
            </button>
            <span className="sep">/</span>
            <span className="current">Collections</span>
          </div>

          <div className="colTitleRow">
            <h1 className="colTitle">Gestion des collections</h1>
            {serverInfo?.name && <span className="chip mono">{serverInfo.name}</span>}
          </div>

          
        </div>

        <div className="colHeaderRight">
          <button
            className="btn ghost"
            onClick={() => {
              const controller = new AbortController();
              loadCollections(controller.signal);
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : "⟳ Actualiser"}
          </button>
        </div>
      </div>

      {err && <div className="notice error">❌ {err}</div>}
      {ok && <div className="notice ok">✅ {ok}</div>}

      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Collections</div>
            <div className="kpiValue">{items.length}</div>
          </div>
          <div className="kpiHint">Total des collections</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Documents</div>
            <div className="kpiValue">{totalDocs}</div>
          </div>
          <div className="kpiHint">Total de tous les docs</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Taille</div>
            <div className="kpiValue">{formatBytes(totalSize)}</div>
          </div>
          <div className="kpiHint">Taille totale indexée</div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <div className="panelTitle">Créer une collection</div>
            <div className="panelSub">Ajoute une nouvelle collection sur ce serveur</div>
          </div>
        </div>

        <form className="createGrid" onSubmit={handleCreate}>
          <div className="field">
            <label>Nom</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ex: products"
            />
          </div>

          <div className="field">
            <label>Shards</label>
            <input
              type="number"
              min="1"
              value={form.numShards}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, numShards: e.target.value }))
              }
            />
          </div>

          <div className="field">
            <label>Replication factor</label>
            <input
              type="number"
              min="1"
              value={form.replicationFactor}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  replicationFactor: e.target.value,
                }))
              }
            />
          </div>

          <div className="createActions">
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setForm({ name: "", numShards: 1, replicationFactor: 1 })
              }
            >
              Annuler
            </button>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panelHead row">
          <div>
            <div className="panelTitle">Collections</div>
            <div className="panelSub">Liste des collections du serveur</div>
          </div>

          <div className="rightTools">
            <div className="searchBox">
              <span>⌕</span>
              <input
                placeholder="Search collection..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="chip">
              {filteredItems.length} / {items.length}
            </div>
          </div>
        </div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Config</th>
                <th className="right">Docs</th>
                <th className="right">Shards</th>
                <th className="right">Replicas</th>
                <th className="right">Size</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((c) => (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td>{c.configName ?? "-"}</td>
                  <td className="right">{c.numDocs ?? 0}</td>
                  <td className="right">{c.numShards ?? "-"}</td>
                  <td className="right">{c.replicationFactor ?? "-"}</td>
                  <td className="right">{formatBytes(c.sizeInBytes ?? 0)}</td>
                  <td className="right">
                    <div className="rowActions">
                      <button
                        className="btn ghost small"
                        onClick={() => openSchema(c.name)}
                        type="button"
                      >
                        Schema
                      </button>
                      <button
                        className="btn danger small"
                        onClick={() => handleDelete(c.name)}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Aucune collection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}