import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { SolrInstanceApi } from "../api/solrInstanceApi";
import "./SolrCluster.css";

const API = "http://localhost:8081/api/solr/monitoring";

function getRoles() {
  try {
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");
    return (Array.isArray(roles) ? roles : [])
      .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getSavedCompanyId() {
  try {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

    return (
      localStorage.getItem("companyId") ||
      savedUser?.companyId ||
      savedUser?.company?.id ||
      ""
    );
  } catch {
    return localStorage.getItem("companyId") || "";
  }
}

export default function SolrCluster() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [openCores, setOpenCores] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  const startedRef = useRef(false);
  const toastTimerRef = useRef(null);

  const [addForm, setAddForm] = useState({
    name: "",
    host: "127.0.0.1",
    port: "",
    companyId: String(getSavedCompanyId()),
    instancePath: "AUTO",
    corePath: "AUTO",
    imagePath: "solr:9.10.1",
  });

  const [copyForm, setCopyForm] = useState({
    newName: "",
    newPort: "",
  });

  const [toast, setToast] = useState(null);

  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;
  const isUser = roles.includes("USER");
  const canView = isSuperAdmin || isAdmin || isUser;
  const canManage = isAdmin;

  const toggleCores = (serverName) => {
    setOpenCores((prev) => ({
      ...prev,
      [serverName]: !prev[serverName],
    }));
  };

  const notify = (type, text) => {
    setToast({ type, text });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const load = async () => {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(API, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("UNAUTHORIZED");
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setError(
        e?.message === "UNAUTHORIZED"
          ? "Accès refusé / session expirée. Reconnecte-toi."
          : `Erreur chargement: ${e?.message || "unknown"}`
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    load();

    const id = setInterval(load, 5000);

    return () => {
      clearInterval(id);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const servers = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.nodes)) return data.nodes;
    if (Array.isArray(data.servers)) return data.servers;
    return [];
  }, [data]);

  const stats = useMemo(() => {
    const total = servers.length;
    const up = servers.filter((s) => s.status === "UP").length;
    const down = total - up;
    return { total, up, down };
  }, [servers]);

  const filteredServers = useMemo(() => {
    const query = q.trim().toLowerCase();

    return servers.filter((s) => {
      if (filter === "UP" && s.status !== "UP") return false;
      if (filter === "DOWN" && s.status !== "DOWN") return false;

      if (!query) return true;

      const hay = `${s.name} ${s.host} ${s.port}`.toLowerCase();
      return hay.includes(query);
    });
  }, [servers, filter, q]);

  const pctColor = (v) => {
    const n = Number(v) || 0;
    if (n >= 80) return "bad";
    if (n >= 50) return "warn";
    return "good";
  };

  const mapInstanceError = (message, fallback) => {
    const msg = String(message || fallback || "Erreur");
    const lower = msg.toLowerCase();

    if (lower.includes("companyid is required")) {
      return "Company ID est obligatoire.";
    }

    if (lower.includes("port already used")) {
      return "Le port est déjà utilisé. Choisissez un autre port.";
    }

    if (lower.includes("host + port already exists")) {
      return "Cette combinaison host + port existe déjà.";
    }

    if (lower.includes("instance name already exists")) {
      return "Le nom de l’instance existe déjà.";
    }

    if (lower.includes("access denied") || lower.includes("forbidden")) {
      return "Accès refusé.";
    }

    return msg;
  };

  const openAdd = (server = null) => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    setAddForm({
      name: "",
      host: server?.host || "127.0.0.1",
      port: "",
      companyId: String(getSavedCompanyId()),
      instancePath: "AUTO",
      corePath: "AUTO",
      imagePath: "solr:9.10.1",
    });
    setShowAdd(true);
  };

  const openCopy = (server) => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    setSelected(server);
    setCopyForm({
      newName: `${server?.name || "instance"}-copy`,
      newPort: String(Number(server?.port || 0) + 1 || ""),
    });
    setShowCopy(true);
  };

  const openDelete = (server) => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    setSelected(server);
    setShowDelete(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddForm({
      name: "",
      host: "127.0.0.1",
      port: "",
      companyId: String(getSavedCompanyId()),
      instancePath: "AUTO",
      corePath: "AUTO",
      imagePath: "solr:9.10.1",
    });
  };

  const closeCopy = () => {
    setShowCopy(false);
    setSelected(null);
    setCopyForm({
      newName: "",
      newPort: "",
    });
  };

  const closeDelete = () => {
    setShowDelete(false);
    setSelected(null);
  };

  const onAdd = async () => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    const finalCompanyId = Number(addForm.companyId);

    if (!finalCompanyId) {
      notify("error", "Company ID est obligatoire.");
      return;
    }

    try {
      await SolrInstanceApi.create({
        name: addForm.name.trim(),
        host: addForm.host.trim(),
        port: Number(addForm.port),
        instancePath: addForm.instancePath.trim(),
        corePath: addForm.corePath.trim(),
        imagePath: addForm.imagePath.trim(),
        companyId: finalCompanyId,
      });

      closeAdd();
      notify("success", "Instance créée.");
      await load();
    } catch (e) {
      const apiError =
        e?.response?.data?.errors?.[0]?.field &&
        e?.response?.data?.errors?.[0]?.defaultMessage
          ? `${e.response.data.errors[0].field}: ${e.response.data.errors[0].defaultMessage}`
          : e?.response?.data?.message || e?.message || "Erreur création";

      notify("error", mapInstanceError(apiError, "Erreur création"));
    }
  };

  const onCopy = async () => {
    if (!selected || !canManage) return;

    try {
      await SolrInstanceApi.copy(selected.id, {
        newName: copyForm.newName.trim(),
        newPort: Number(copyForm.newPort),
      });

      closeCopy();
      notify("success", "Instance copiée avec succès.");
      await load();
    } catch (e) {
      notify(
        "error",
        mapInstanceError(
          e?.response?.data?.message || e?.message,
          "Erreur lors de la copie"
        )
      );
    }
  };

  const onDelete = async () => {
    if (!selected || !canManage) return;

    try {
      await SolrInstanceApi.remove(selected.id);
      closeDelete();
      notify("success", "Instance supprimée.");
      await load();
    } catch (e) {
      notify(
        "error",
        mapInstanceError(
          e?.response?.data?.message || e?.message,
          "Erreur suppression"
        )
      );
    }
  };

  if (!canView) {
    return <div className="notice error">❌ Accès refusé.</div>;
  }

  return (
    <div className="solrPage">
      <ToastPortal toast={toast} onClose={() => setToast(null)} />

      <div className="solrHeader">
        <div>
          <h1 className="solrTitle">Solr Cluster</h1>
          <div className="solrSubtitle">Monitoring & Management Console</div>
        </div>

        <div className="solrHeaderRight">
          <div className="metaPill" title={API}>
            Monitoring API
          </div>

          <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panelTop">
          <div>
            <div className="panelTitle">Cluster overview</div>
            <div className="panelSub">Health snapshot of nodes</div>
          </div>

          {data?.generatedAt && (
            <div className="metaPill">
              Last sync: <span className="mono">{data.generatedAt}</span>
            </div>
          )}
        </div>

        {error && <div className="notice error">❌ {error}</div>}

        <div className="kpiGrid">
          <div className="kpiCard">
            <div className="kpiLabel">Total</div>
            <div className="kpiValue">{stats.total}</div>
            <div className="kpiHint">Nodes discovered</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Up</div>
            <div className="kpiValue">{stats.up}</div>
            <div className="kpiHint">Healthy nodes</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Down</div>
            <div className="kpiValue">{stats.down}</div>
            <div className="kpiHint">Unreachable nodes</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelTop panelTopServers">
          <div className="serversTitleWrap">
            <div>
              <div className="panelTitle">Solr servers</div>
              <div className="panelSub">Browse nodes and inspect metrics</div>
            </div>

            {canManage && (
              <button
                type="button"
                className="addIconBtn"
                onClick={() => openAdd()}
                title="Add instance"
                aria-label="Add instance"
              >
                +
              </button>
            )}
          </div>

          <div className="tools">
            <div className="seg">
              <button
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
              </button>
              <button
                className={filter === "UP" ? "active" : ""}
                onClick={() => setFilter("UP")}
              >
                Up
              </button>
              <button
                className={filter === "DOWN" ? "active" : ""}
                onClick={() => setFilter("DOWN")}
              >
                Down
              </button>
            </div>

            <div className="searchBox">
              <span>⌕</span>
              <input
                placeholder="Search name / host / port..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {data && !loading && filteredServers.length === 0 && (
          <div className="notice">Aucun serveur ne correspond au filtre.</div>
        )}

        <div className="serverList">
          {filteredServers.map((s) => {
            const cores = Array.isArray(s.cores) ? s.cores : [];
            const hasCores = cores.length > 0;
            const isOpen = !!openCores[s.name];
            const safeId = String(s.name).replace(/[^a-zA-Z0-9_-]/g, "_");
            const panelId = `cores-panel-${safeId}`;

            return (
              <div key={`${s.name}-${s.host}-${s.port}`} className="serverCard">
                <div className="serverTop">
                  <div>
                    <div className="serverNameRow">
                      <Link
                        to={`/solr/server/${s.id}`}
                        className="serverLink serverName"
                      >
                        {s.name}
                      </Link>

                      <span
                        className={`status ${s.status === "UP" ? "up" : "down"}`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="serverAddr mono">
                      {s.host}:{s.port}
                    </div>
                  </div>

                  <div className="serverActions directActions">
                    {canManage && (
                      <button
                        type="button"
                        className="btn secondary small"
                        onClick={() => openCopy(s)}
                      >
                        Copy
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => openDelete(s)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="metricsRow">
                  <div className={`metric ${pctColor(s.cpu)}`}>
                    <div className="metricLabel">CPU</div>
                    <div className="metricValue">{Number(s.cpu) || 0}%</div>
                  </div>

                  <div className={`metric ${pctColor(s.memory)}`}>
                    <div className="metricLabel">Memory</div>
                    <div className="metricValue">{Number(s.memory) || 0}%</div>
                  </div>

                  <div className="metric">
                    <div className="metricLabel">Total docs</div>
                    <div className="metricValue">{s.totalDocs ?? 0}</div>
                  </div>

                  <div className="metric">
                    <div className="metricLabel">Total size</div>
                    <div className="metricValue">
                      {formatBytes(s.totalSizeInBytes ?? 0)}
                    </div>
                  </div>
                </div>

                {Array.isArray(s.alerts) && s.alerts.length > 0 && (
                  <div className="notice warn">⚠️ Alerts: {s.alerts.join(", ")}</div>
                )}

                {s.error && <div className="notice error">❌ {s.error}</div>}

                <div className="coresBlock">
                  <button
                    type="button"
                    className={`coresHeaderBtn ${isOpen ? "open" : ""}`}
                    onClick={() => (hasCores ? toggleCores(s.name) : null)}
                    disabled={!hasCores}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    title={!hasCores ? "Aucun core" : "Afficher / masquer"}
                  >
                    <div className="coresHeaderLeft">
                      <span className="coresTitle">Cores</span>
                      <span className="coresBadge">{cores.length}</span>
                      {!hasCores ? (
                        <span className="coresHintInline">Aucun core</span>
                      ) : null}
                    </div>

                    <span className={`chev ${isOpen ? "rot" : ""}`}>▾</span>
                  </button>

                  <div id={panelId} className={`collapse ${isOpen ? "open" : ""}`}>
                    <div className="collapseInner">
                      <div className="coresTableWrap">
                        <table className="coresTable">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Docs</th>
                              <th>Deleted</th>
                              <th>Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cores.map((c) => (
                              <tr key={c.name}>
                                <td className="mono">{c.name}</td>
                                <td>{c.numDocs ?? 0}</td>
                                <td>{c.deletedDocs ?? 0}</td>
                                <td>{formatBytes(c.sizeInBytes ?? 0)}</td>
                              </tr>
                            ))}

                            {cores.length === 0 && (
                              <tr>
                                <td colSpan={4} className="muted" style={{ padding: 12 }}>
                                  Aucun core.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && canManage && (
        <Modal title="Add instance" onClose={closeAdd}>
          <div className="modalField">
            <label className="label">Name</label>
            <input
              className="input"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="ex: solr-prod-1"
            />
          </div>

          <div className="modalField">
            <label className="label">Host</label>
            <input
              className="input"
              value={addForm.host}
              onChange={(e) => setAddForm({ ...addForm, host: e.target.value })}
              placeholder="ex: 127.0.0.1"
            />
          </div>

          <div className="modalField">
            <label className="label">Port</label>
            <input
              className="input"
              type="number"
              value={addForm.port}
              onChange={(e) => setAddForm({ ...addForm, port: e.target.value })}
              placeholder="ex: 8983"
            />
          </div>

          <div className="modalField">
            <label className="label">Company ID</label>
            <input
              className="input"
              type="number"
              value={addForm.companyId}
              onChange={(e) =>
                setAddForm({ ...addForm, companyId: e.target.value })
              }
              placeholder="ex: 1"
            />
          </div>

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeAdd}>
              Cancel
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={onAdd}
              disabled={
                !addForm.name.trim() ||
                !addForm.host.trim() ||
                !addForm.port ||
                !addForm.companyId
              }
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {showCopy && selected && canManage && (
        <Modal title="Copy instance" onClose={closeCopy}>
          <div className="hint">
            Source: <b>{selected.name}</b> ({selected.host}:{selected.port})
          </div>

          <div className="modalField">
            <label className="label">New name</label>
            <input
              className="input"
              value={copyForm.newName}
              onChange={(e) =>
                setCopyForm({ ...copyForm, newName: e.target.value })
              }
              placeholder="Enter new instance name"
            />
          </div>

          <div className="modalField">
            <label className="label">New port</label>
            <input
              className="input"
              type="number"
              value={copyForm.newPort}
              onChange={(e) =>
                setCopyForm({ ...copyForm, newPort: e.target.value })
              }
              placeholder="Enter new port"
            />
          </div>

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeCopy}>
              Cancel
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={onCopy}
              disabled={!copyForm.newName.trim() || !copyForm.newPort}
            >
              Copy
            </button>
          </div>
        </Modal>
      )}

      {showDelete && selected && canManage && (
        <Modal title="Delete instance" onClose={closeDelete}>
          <div className="dangerBox">
            This will permanently delete <b>{selected.name}</b>.
          </div>

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeDelete}>
              Cancel
            </button>

            <button type="button" className="btn danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ToastPortal({ toast, onClose }) {
  if (!toast) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
    >
      <div
        className={`entToast ${toast.type}`}
        role="alert"
        aria-live="polite"
        style={{
          position: "relative",
          zIndex: 2147483647,
          pointerEvents: "auto",
        }}
      >
        <span className="dot" />
        <div className="text">{toast.text}</div>
        <button className="x" onClick={onClose} type="button">
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <h3 className="modalTitle">{title}</h3>

          <button type="button" className="modalClose" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>,
    document.body
  );
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