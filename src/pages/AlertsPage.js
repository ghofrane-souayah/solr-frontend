import { useEffect, useMemo, useState } from "react";
import "./AlertsPage.css";
import { SolrInstanceApi } from "../api/solrInstanceApi";
import { NotificationsApi } from "../api/notificationsApi";

export default function AlertsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatDate = (value) => {
    if (!value) return new Date().toLocaleString("fr-FR");

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleString("fr-FR");
  };

  const normalizeMonitoringData = (data) => {
    const servers =
      data?.nodes ??
      data?.servers ??
      data?.instances ??
      data?.data ??
      (Array.isArray(data) ? data : []);

    const alerts = [];

    servers.forEach((s, serverIndex) => {
      const derivedStatus =
        s?.status ??
        s?.healthStatus ??
        s?.health ??
        s?.state ??
        s?.nodeStatus ??
        (s?.reachable === false ? "DOWN" : null);

      const derivedAlerts = s?.alerts ?? s?.warnings ?? s?.issues ?? [];
      const derivedError =
        s?.error ?? s?.lastError ?? s?.exception ?? null;

      const serverId =
        s?.id ??
        s?.instanceId ??
        s?.nodeId ??
        s?.name ??
        s?.host ??
        `server-${serverIndex}`;

      const serverName =
        s?.name ??
        s?.nodeName ??
        s?.instanceName ??
        s?.host ??
        `Serveur ${serverIndex + 1}`;

      const serverHost = s?.host ?? s?.hostname ?? "host inconnu";
      const serverPort = s?.port ?? s?.httpPort ?? s?.solrPort ?? "-";

      const serverDate =
        s?.lastHealthCheckTime ??
        s?.lastCheck ??
        s?.checkedAt ??
        s?.timestamp ??
        s?.updatedAt ??
        data?.generatedAt ??
        new Date().toISOString();

      if (derivedStatus === "DOWN") {
        alerts.push({
          id: `solr-down-${serverId}`,
          backendId: null,
          type: "alert",
          level: "critical",
          title: `Serveur ${serverName} indisponible`,
          message: `${serverHost}:${serverPort} est DOWN`,
          source: "Solr Cluster",
          status: "unread",
          date: formatDate(serverDate),
          rawDate: serverDate,
          origin: "solr",
        });
      }

      if (Array.isArray(derivedAlerts) && derivedAlerts.length > 0) {
        derivedAlerts.forEach((alertItem, index) => {
          const message =
            typeof alertItem === "string"
              ? alertItem
              : alertItem?.message ??
                alertItem?.text ??
                alertItem?.description ??
                JSON.stringify(alertItem);

          alerts.push({
            id: `solr-alert-${serverId}-${index}`,
            backendId: null,
            type: "alert",
            level: "warning",
            title: `Alerte serveur ${serverName}`,
            message,
            source: "Solr Cluster",
            status: "unread",
            date: formatDate(serverDate),
            rawDate: serverDate,
            origin: "solr",
          });
        });
      }

      if (derivedError) {
        const errorMessage =
          typeof derivedError === "string"
            ? derivedError
            : derivedError?.message ?? JSON.stringify(derivedError);

        alerts.push({
          id: `solr-error-${serverId}`,
          backendId: null,
          type: "alert",
          level: "critical",
          title: `Erreur serveur ${serverName}`,
          message: errorMessage,
          source: "Solr Cluster",
          status: "unread",
          date: formatDate(serverDate),
          rawDate: serverDate,
          origin: "solr",
        });
      }
    });

    return alerts;
  };

  const normalizeNotifications = (data) => {
    const notifications =
      data?.notifications ??
      data?.items ??
      data?.data ??
      (Array.isArray(data) ? data : []);

    return notifications.map((n, index) => {
      const rawDate =
        n?.date ??
        n?.createdAt ??
        n?.created_at ??
        n?.timestamp ??
        new Date().toISOString();

      return {
        id: `notif-${n?.id ?? index}`,
        backendId: n?.id ?? null,
        type: (n?.type ?? "notification").toLowerCase(),
        level: (n?.level ?? "info").toLowerCase(),
        title: n?.title ?? "Notification",
        message: n?.message ?? "",
        source: n?.source ?? "Administration",
        status: (n?.status ?? "unread").toLowerCase(),
        date: formatDate(rawDate),
        rawDate,
        origin: "notification",
      };
    });
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const [monitoringData, notificationsData] = await Promise.all([
        SolrInstanceApi.monitoring(),
        NotificationsApi.list(),
      ]);

      const solrItems = normalizeMonitoringData(monitoringData);
      const notificationItems = normalizeNotifications(notificationsData);

      const merged = [...solrItems, ...notificationItems].sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );

      setItems(merged);
    } catch (error) {
      console.error("Erreur chargement alertes/notifications :", error);
      setErrorMsg("Erreur lors du chargement des alertes et notifications.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const search = q.trim().toLowerCase();

    return items.filter((item) => {
      const matchType = typeFilter === "ALL" || item.type === typeFilter;
      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const matchLevel = levelFilter === "ALL" || item.level === levelFilter;

      const haystack =
        `${item.title} ${item.message} ${item.source}`.toLowerCase();

      const matchSearch = !search || haystack.includes(search);

      return matchType && matchStatus && matchLevel && matchSearch;
    });
  }, [items, q, typeFilter, statusFilter, levelFilter]);

  const markAsRead = async (item) => {
    if (item.origin === "notification" && item.backendId) {
      try {
        await NotificationsApi.markAsRead(item.backendId);
      } catch (error) {
        console.error("Erreur markAsRead :", error);
      }
    }

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, status: "read" } : current
      )
    );
  };

  const markAllAsRead = async () => {
    try {
      await NotificationsApi.markAllAsRead();
    } catch (error) {
      console.error("Erreur markAllAsRead :", error);
    }

    setItems((prev) => prev.map((item) => ({ ...item, status: "read" })));
  };

  const deleteItem = async (item) => {
    if (item.origin === "notification" && item.backendId) {
      try {
        await NotificationsApi.remove(item.backendId);
      } catch (error) {
        console.error("Erreur delete notification :", error);
      }
    }

    setItems((prev) => prev.filter((current) => current.id !== item.id));
  };

  const getAccentClass = (item) => {
    if (item.level === "critical") return "critical";
    if (item.level === "warning") return "warning";
    if (item.level === "success") return "success";
    if (item.type === "notification") return "notification";
    return "info";
  };

  const getTypeLabel = (type) => {
    return type === "alert" ? "ALERTE" : "NOTIFICATION";
  };

  const getIcon = (item) => {
    if (item.level === "critical") return "⚠️";
    if (item.level === "warning") return "🔔";
    if (item.level === "success") return "✅";
    if (item.type === "alert") return "🚨";
    return "🔔";
  };

  return (
    <div className="alertsPage">
      <div className="alertsContainer">
        <div className="alertsHeader">
          <h1 className="alertsTitle">
            Vos <span>Notifications</span>
          </h1>
          <p className="alertsSub">
            Consultez vos notifications récentes
          </p>
        </div>

        <div className="alertsToolbar">
          <div className="alertsSearch">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="alertsSelect"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tous</option>
            <option value="alert">Alertes</option>
            <option value="notification">Notifications</option>
          </select>

          <select
            className="alertsSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tous statuts</option>
            <option value="unread">Non lues</option>
            <option value="read">Lues</option>
          </select>

          <select
            className="alertsSelect"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">Tous niveaux</option>
            <option value="critical">Critique</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
          </select>

          <button
            className="alertsActionBtn ghost"
            onClick={markAllAsRead}
            disabled={items.length === 0}
          >
            Tout lire
          </button>

          <button
            className="alertsActionBtn primary"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>

        <div className="alertsList">
          {errorMsg ? (
            <div className="alertsEmpty">{errorMsg}</div>
          ) : loading ? (
            <div className="alertsEmpty">Chargement des alertes...</div>
          ) : filteredItems.length === 0 ? (
            <div className="alertsEmpty">Aucune notification trouvée.</div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`notificationCard ${getAccentClass(item)}`}
              >
                <div className="notificationAccent" />

                <div className="notificationIcon">{getIcon(item)}</div>

                <div className="notificationContent">
                  <div className="notificationMeta">
                    <span className="notificationType">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="notificationDate">{item.date}</span>
                  </div>

                  <div className="notificationTitle">{item.title}</div>
                  <div className="notificationMessage">{item.message}</div>
                  <div className="notificationSource">{item.source}</div>
                </div>

                <div className="notificationActions">
                  {item.status === "unread" ? (
                    <button
                      className="iconAction"
                      title="Marquer comme lue"
                      onClick={() => markAsRead(item)}
                    >
                      ✓
                    </button>
                  ) : (
                    <span className="doneMark">✓</span>
                  )}

                  <button
                    className="iconAction delete"
                    title="Supprimer"
                    onClick={() => deleteItem(item)}
                  >
                    •
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}