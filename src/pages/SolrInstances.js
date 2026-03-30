import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SolrInstanceApi } from "../api/solrInstanceApi";
import "./SolrInstances.css";

export default function SolrInstances() {
  const navigate = useNavigate();

  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  const [addForm, setAddForm] = useState({
    name: "",
    host: "",
    port: "",
    instancePath: "",
    corePath: "",
    imagePath: "",
  });

  const [copyForm, setCopyForm] = useState({
    newName: "",
    newPort: "",
  });

  const [toast, setToast] = useState(null);

  const notify = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await SolrInstanceApi.list();
      setInstances(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Erreur lors du chargement des instances");
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return instances.filter((x) => {
      const status = (x.status || "").toUpperCase();

      if (filter === "UP" && status !== "UP") return false;
      if (filter === "DOWN" && status !== "DOWN") return false;

      if (!query) return true;

      const hay = `${x.name || ""} ${x.host || ""} ${x.port || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [instances, q, filter]);

  const resetAddForm = () => {
    setAddForm({
      name: "",
      host: "",
      port: "",
      instancePath: "",
      corePath: "",
      imagePath: "",
    });
  };

  const resetCopyForm = () => {
    setCopyForm({
      newName: "",
      newPort: "",
    });
  };

  const openAdd = () => {
    resetAddForm();
    setShowAdd(true);
  };

  const openCopy = (inst) => {
    setSelected(inst);
    setCopyForm({
      newName: `${inst.name || "instance"}-copy`,
      newPort: String(Number(inst.port || 0) + 1 || ""),
    });
    setShowCopy(true);
  };

  const openDelete = (inst) => {
    setSelected(inst);
    setShowDelete(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    resetAddForm();
  };

  const closeCopy = () => {
    setShowCopy(false);
    setSelected(null);
    resetCopyForm();
  };

  const closeDelete = () => {
    setShowDelete(false);
    setSelected(null);
  };

  const onAdd = async () => {
    try {
      setActionLoading(true);

      await SolrInstanceApi.create({
        name: addForm.name.trim(),
        host: addForm.host.trim(),
        port: Number(addForm.port),
        instancePath: addForm.instancePath.trim(),
        corePath: addForm.corePath.trim(),
        imagePath: addForm.imagePath.trim(),
      });

      closeAdd();
      notify("success", "Instance créée avec succès.");
      await load();
    } catch (e) {
      notify("error", e?.message || "Erreur lors de la création");
    } finally {
      setActionLoading(false);
    }
  };

const onCopy = async () => {
  if (!selected) return;

  try {
    setActionLoading(true);

    await SolrInstanceApi.copy(selected.id, {
      newName: copyForm.newName.trim(),
      newPort: Number(copyForm.newPort),
    });

    closeCopy();
    notify("success", "Instance copiée avec succès.");
    await load();
  } catch (e) {
    const msg = e?.message || "Erreur lors de la copie";

    if (msg.toLowerCase().includes("port already used")) {
      notify("error", "Le port est déjà utilisé. Choisissez un autre port.");
    } else if (msg.toLowerCase().includes("host + port already exists")) {
      notify("error", "Cette combinaison host + port existe déjà.");
    } else if (msg.toLowerCase().includes("instance name already exists")) {
      notify("error", "Le nom de l’instance existe déjà.");
    } else {
      notify("error", msg);
    }
  } finally {
    setActionLoading(false);
  }
};

  const onDelete = async () => {
    if (!selected) return;

    try {
      setActionLoading(true);

      await SolrInstanceApi.remove(selected.id);

      closeDelete();
      notify("success", "Instance supprimée avec succès.");
      await load();
    } catch (e) {
      notify("error", e?.message || "Erreur lors de la suppression");
    } finally {
      setActionLoading(false);
    }
  };

  const onStart = async (inst) => {
    if (!inst?.id) return;

    try {
      setActionLoading(true);
      await SolrInstanceApi.start(inst.id);
      notify("success", `Instance "${inst.name}" démarrée.`);
      await load();
    } catch (e) {
      notify("error", e?.message || "Erreur lors du démarrage");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="entPage">
      <div className="entHeader">
        <div className="entHeaderLeft">
          <button className="iconBtn" onClick={() => navigate(-1)} title="Back">
            ←
          </button>
          <div>
            <div className="entBreadcrumb">Solr / Management</div>
            <div className="entTitle">Instances</div>
          </div>
        </div>

        <div className="entHeaderRight">
          <div className="entSearch">
            <span className="entSearchIcon">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, host, port…"
            />
          </div>

          <div className="entSeg">
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

          <button className="btnPrimary" onClick={openAdd}>
            New instance
          </button>

          <button className="btnGhost" onClick={load} disabled={loading || actionLoading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`entToast ${toast.type}`}>
          <span className="dot" />
          <div className="text">{toast.text}</div>
          <button className="x" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}

      {error && <div className="entBanner error">❌ {error}</div>}

      <div className="entCard">
        <div className="entCardTop">
          <div className="entCardTitle">Registered instances</div>
          <div className="entMeta">
            Total: <b>{filtered.length}</b>
          </div>
        </div>

        <div className="entTableWrap">
          <table className="entTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Host</th>
                <th style={{ width: 120 }}>Port</th>
                <th style={{ width: 140 }}>Status</th>
                <th style={{ width: 320, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="name">{x.name}</div>
                    <div className="sub">ID: {x.id}</div>
                  </td>

                  <td className="mono">{x.host}</td>
                  <td className="mono">{x.port}</td>

                  <td>
                    <span
                      className={`badge ${
                        (x.status || "").toUpperCase() === "UP" ? "up" : "down"
                      }`}
                    >
                      <span className="badgeDot" />
                      {x.status || "UNKNOWN"}
                    </span>
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <div className="actionGroup">
                      <button
                        className="actionBtn start"
                        onClick={() => onStart(x)}
                        disabled={(x.status || "").toUpperCase() === "UP" || actionLoading}
                      >
                        Start
                      </button>

                      <button
                        className="actionBtn copy"
                        onClick={() => openCopy(x)}
                        disabled={actionLoading}
                      >
                        Copy
                      </button>

                      <button
                        className="actionBtn delete"
                        onClick={() => openDelete(x)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No instances found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="New instance" onClose={closeAdd}>
          <div className="formRow">
            <label>Name</label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="ex: solr-prod-1"
            />
          </div>

          <div className="formRow">
            <label>Host</label>
            <input
              value={addForm.host}
              onChange={(e) => setAddForm({ ...addForm, host: e.target.value })}
              placeholder="ex: 127.0.0.1"
            />
          </div>

          <div className="formRow">
            <label>Port</label>
            <input
              type="number"
              value={addForm.port}
              onChange={(e) => setAddForm({ ...addForm, port: e.target.value })}
              placeholder="ex: 8983"
            />
          </div>

          <div className="formRow">
            <label>Instance path</label>
            <input
              value={addForm.instancePath}
              onChange={(e) => setAddForm({ ...addForm, instancePath: e.target.value })}
              placeholder="ex: C:/solr/instance1"
            />
          </div>

          <div className="formRow">
            <label>Core path</label>
            <input
              value={addForm.corePath}
              onChange={(e) => setAddForm({ ...addForm, corePath: e.target.value })}
              placeholder="ex: C:/solr/instance1/core"
            />
          </div>

          <div className="formRow">
            <label>Image path</label>
            <input
              value={addForm.imagePath}
              onChange={(e) => setAddForm({ ...addForm, imagePath: e.target.value })}
              placeholder="ex: C:/solr/images/instance1"
            />
          </div>

          <div className="modalActions">
            <button
              className="btnPrimary"
              onClick={onAdd}
              disabled={
                actionLoading ||
                !addForm.name.trim() ||
                !addForm.host.trim() ||
                !addForm.port ||
                !addForm.instancePath.trim() ||
                !addForm.corePath.trim() ||
                !addForm.imagePath.trim()
              }
            >
              {actionLoading ? "Creating..." : "Create"}
            </button>

            <button className="btnGhost" onClick={closeAdd} disabled={actionLoading}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showCopy && selected && (
        <Modal title="Copy instance" onClose={closeCopy}>
          <div className="hint">
            Source: <b>{selected.name}</b> ({selected.host}:{selected.port})
          </div>

          <div className="formRow">
            <label>New name</label>
            <input
              value={copyForm.newName}
              onChange={(e) => setCopyForm({ ...copyForm, newName: e.target.value })}
            />
          </div>

          <div className="formRow">
            <label>New port</label>
            <input
              type="number"
              value={copyForm.newPort}
              onChange={(e) => setCopyForm({ ...copyForm, newPort: e.target.value })}
            />
          </div>

          <div className="modalActions">
            <button
              className="btnPrimary"
              onClick={onCopy}
              disabled={actionLoading || !copyForm.newName.trim() || !copyForm.newPort}
            >
              {actionLoading ? "Copying..." : "Copy"}
            </button>

            <button className="btnGhost" onClick={closeCopy} disabled={actionLoading}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showDelete && selected && (
        <Modal title="Delete instance" onClose={closeDelete}>
          <div className="dangerBox">
            This will permanently delete <b>{selected.name}</b>.
          </div>

          <div className="modalActions">
            <button className="btnDangerSolid" onClick={onDelete} disabled={actionLoading}>
              {actionLoading ? "Deleting..." : "Delete"}
            </button>

            <button className="btnGhost" onClick={closeDelete} disabled={actionLoading}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTop">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}