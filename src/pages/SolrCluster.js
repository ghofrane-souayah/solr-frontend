import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { SolrInstanceApi } from "../api/solrInstanceApi";
import "./SolrCluster.css";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startingId, setStartingId] = useState(null);

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
  const savedCompanyId = String(getSavedCompanyId());
  const canView = isSuperAdmin || isAdmin || isUser;
  const canManage = isAdmin;

  const notify = (type, text) => {
    setToast({ type, text });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const load = useCallback(async () => {
    setInitialLoading((prev) => (data ? prev : true));
    setRefreshing(true);
    setError("");

    try {
      const json = await SolrInstanceApi.monitoring();
      setData(json);
      setError("");
    } catch (e) {
      setError(`Erreur chargement: ${e?.message || "unknown"}`);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    load();

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [load]);

  const servers = useMemo(() => {
    return data?.nodes ?? data?.servers ?? (Array.isArray(data) ? data : []);
  }, [data]);

  const stats = useMemo(() => {
    const total = servers.length;
    const up = servers.filter((s) => s.status === "UP").length;
    const down = servers.filter((s) => s.status === "DOWN").length;
    return { total, up, down };
  }, [servers]);

  const filteredServers = useMemo(() => {
    const query = q.trim().toLowerCase();

    return servers.filter((s) => {
      if (filter === "UP" && s.status !== "UP") return false;
      if (filter === "DOWN" && s.status !== "DOWN") return false;

      if (!query) return true;

      const hay = `${s.name || ""} ${s.host || ""} ${s.port || ""}`.toLowerCase();
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
    if (lower.includes("not ready yet")) {
      return "Le conteneur Solr est lancé mais pas encore prêt.";
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
      companyId: isSuperAdmin ? "" : savedCompanyId,
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
    if (creating) return;

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
    if (copying) return;

    setShowCopy(false);
    setSelected(null);
    setCopyForm({
      newName: "",
      newPort: "",
    });
  };

  const closeDelete = () => {
    if (deleting) return;

    setShowDelete(false);
    setSelected(null);
  };

  const onAdd = async () => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    const name = addForm.name.trim();
    const host = addForm.host.trim();
    const port = Number(addForm.port);
    const finalCompanyId = Number(addForm.companyId);

    if (!name || !host || !addForm.port) {
      notify("error", "Tous les champs obligatoires doivent être remplis.");
      return;
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      notify("error", "Le port doit être compris entre 1 et 65535.");
      return;
    }

    if (!finalCompanyId) {
      notify("error", "Company ID est obligatoire.");
      return;
    }

    try {
      setCreating(true);

      await SolrInstanceApi.create({
        name,
        host,
        port,
        instancePath: addForm.instancePath.trim(),
        corePath: addForm.corePath.trim(),
        imagePath: addForm.imagePath.trim(),
        companyId: finalCompanyId,
      });

      notify("success", "Instance créée avec succès.");
      closeAdd();
      await load();
    } catch (e) {
      notify(
        "error",
        mapInstanceError(e?.response?.data?.message || e?.message)
      );
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!selected || !canManage) return;

    const newName = copyForm.newName.trim();
    const newPort = Number(copyForm.newPort);

    if (!newName || !copyForm.newPort) {
      notify("error", "Le nom et le port sont obligatoires.");
      return;
    }

    if (!Number.isInteger(newPort) || newPort < 1 || newPort > 65535) {
      notify("error", "Le port doit être compris entre 1 et 65535.");
      return;
    }

    try {
      setCopying(true);

      await SolrInstanceApi.copy(selected.id, {
        newName,
        newPort,
      });

      closeCopy();
      notify("success", "Instance copiée.");
      await load();
    } catch (e) {
      notify(
        "error",
        mapInstanceError(
          e?.response?.data?.message || e?.message,
          "Erreur lors de la copie"
        )
      );
    } finally {
      setCopying(false);
    }
  };

  const onDelete = async () => {
    if (!selected || !canManage) return;

    try {
      setDeleting(true);
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
    } finally {
      setDeleting(false);
    }
  };

  const onStart = async (server) => {
    if (!canManage) {
      notify("error", "Accès refusé.");
      return;
    }

    try {
      setStartingId(server.id);
      await SolrInstanceApi.start(server.id);
      notify("success", `Instance "${server.name}" démarrée.`);
      await load();
    } catch (e) {
      notify(
        "error",
        mapInstanceError(
          e?.response?.data?.message || e?.message,
          "Erreur démarrage"
        )
      );
    } finally {
      setStartingId(null);
    }
  };

  if (!canView) {
    return <div className="notice error">❌ Accès refusé.</div>;
  }

  return (
    <div className="solrPage">
      <ToastPortal toast={toast} onClose={() => setToast(null)} />

      <div className="panel">
        <div className="panelTop">
          <div>
            <div className="panelTitle">Cluster overview</div>
            <div className="panelSub">Health snapshot of nodes</div>
          </div>

          {data?.generatedAt && (
            <div className="metaPill">
              Last sync: <span className="mono">{formatDateTime(data.generatedAt)}</span>
            </div>
          )}
        </div>

        {error && <div className="notice error">❌ {error}</div>}

        <div className="kpiGrid">
          <div className="kpiCard">
            <div className="kpiLabel">Total ⚪</div>
            <div className="kpiValue">{servers.length}</div>
            <div className="kpiHint">Nodes discovered</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Up 🟢</div>
            <div className="kpiValue">{stats.up}</div>
            <div className="kpiHint">Healthy nodes</div>
          </div>

          <div className="kpiCard">
            <div className="kpiLabel">Down 🔴</div>
            <div className="kpiValue">{stats.down}</div>
            <div className="kpiHint">Unreachable nodes</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelTop panelTopServers">
          <div className="serversTitleWrap">
            <div>
              <div className="panelTitle">Solr serveurs</div>
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
                placeholder="Recherche nom / host / port..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {initialLoading && !data ? (
          <div className="notice">Chargement des serveurs...</div>
        ) : filteredServers.length === 0 ? (
          <div className="notice">Aucun serveur ne correspond au filtre.</div>
        ) : null}

        <div className="serverList">
          {filteredServers.map((s) => (
            <div key={`${s.id}-${s.name}-${s.host}-${s.port}`} className="serverCard">
              <div className="serverTop">
                <div>
                  <div className="serverNameRow">
                    <Link to={`/solr/server/${s.id}`} className="serverLink serverName">
                      {s.name}
                    </Link>

                    <span
                      className={`status ${
                        s.status === "UP" ? "up" : s.status === "DOWN" ? "down" : "warn"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="serverAddr mono">
                    {s.host}:{s.port}
                  </div>

                  <div className="serverMeta">
                    Last health check:{" "}
                    <span className="mono">{formatDateTime(s.lastHealthCheckTime)}</span>
                  </div>
                </div>

                <div className="serverActions directActions">
                  {canManage && s.status !== "UP" && (
                    <button
                      type="button"
                      className="btn primary small"
                      onClick={() => onStart(s)}
                      disabled={startingId === s.id}
                    >
                      {startingId === s.id ? "Démarrage..." : "Start"}
                    </button>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => openCopy(s)}
                    >
                      Copier
                    </button>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      className="btn destructive small"
                      onClick={() => openDelete(s)}
                    >
                      Supprimer
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
                  <div className="metricValue">{formatBytes(s.totalSizeInBytes ?? 0)}</div>
                </div>
              </div>

              {Array.isArray(s.alerts) && s.alerts.length > 0 && (
                <div className="notice warn">Alerts: {s.alerts.join(", ")}</div>
              )}

              {s.status === "DOWN" ? (
                <div className="notice error">Le serveur est DOWN et ne répond pas.</div>
              ) : s.error ? (
                <div className="notice error">Erreur: {s.error}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {showAdd && canManage && (
        <Modal title="Ajouter instance" onClose={closeAdd} preventClose={creating}>
          <div className="modalField">
            <label className="label">Nom</label>
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
              min="1"
              max="65535"
              value={addForm.port}
              onChange={(e) => setAddForm({ ...addForm, port: e.target.value })}
              placeholder="ex: 8983"
            />
          </div>

          {isSuperAdmin && (
            <div className="modalField">
              <label className="label">Company ID</label>
              <input
                className="input"
                type="number"
                value={addForm.companyId}
                onChange={(e) => setAddForm({ ...addForm, companyId: e.target.value })}
                placeholder="Ex: 1"
              />
            </div>
          )}

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeAdd} disabled={creating}>
              Annuler
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={onAdd}
              disabled={
                creating ||
                !addForm.name.trim() ||
                !addForm.host.trim() ||
                !addForm.port ||
                (!isSuperAdmin && !savedCompanyId) ||
                (isSuperAdmin && !addForm.companyId)
              }
            >
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </Modal>
      )}

      {showCopy && selected && canManage && (
        <Modal title="Copier instance" onClose={closeCopy} preventClose={copying}>
          <div className="hint">
            Source: <b>{selected.name}</b> ({selected.host}:{selected.port})
          </div>

          <div className="modalField">
            <label className="label">Nouveau Nom</label>
            <input
              className="input"
              value={copyForm.newName}
              onChange={(e) => setCopyForm({ ...copyForm, newName: e.target.value })}
              placeholder="Enter new instance name"
            />
          </div>

          <div className="modalField">
            <label className="label">Nouveau Port</label>
            <input
              className="input"
              type="number"
              min="1"
              max="65535"
              value={copyForm.newPort}
              onChange={(e) => setCopyForm({ ...copyForm, newPort: e.target.value })}
              placeholder="Enter new port"
            />
          </div>

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeCopy} disabled={copying}>
              Annuler
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={onCopy}
              disabled={copying || !copyForm.newName.trim() || !copyForm.newPort}
            >
              {copying ? "Copie..." : "Copier"}
            </button>
          </div>
        </Modal>
      )}

      {showDelete && selected && canManage && (
        <Modal title="Delete instance" onClose={closeDelete} preventClose={deleting}>
          <div className="dangerBox">
            This will permanently delete <b>{selected.name}</b>.
          </div>

          <div className="modalFoot">
            <button type="button" className="btn ghost" onClick={closeDelete} disabled={deleting}>
              Annuler
            </button>

            <button
              type="button"
              className="btn destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression..." : "Supprimer"}
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

function Modal({ title, children, onClose, preventClose = false }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !preventClose) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, preventClose]);

  const handleOverlayMouseDown = () => {
    if (!preventClose) onClose();
  };

  return createPortal(
  <div className="modalOverlay" onMouseDown={handleOverlayMouseDown}>
  <div className="solrPage modalScope">
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <h3 className="modalTitle">{title}</h3>

          <button
            type="button"
            className="modalClose"
            onClick={onClose}
            disabled={preventClose}
          >
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
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

function formatDateTime(value) {
  if (!value) return "N/A";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}