import { useEffect, useState } from "react";
import "./reports.css";
import { ReportsApi } from "../api/ReportsApi";
import { api } from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [instances, setInstances] = useState([]);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "INCIDENT",
    companyId: "",
    solrInstanceId: "",
    content: "",
  });

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const loadReports = async () => {
    setLoading(true);
    resetMessages();

    try {
      const data = await ReportsApi.list();
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setReports(items);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors du chargement des rapports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await api("/api/companies");
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setCompanies(items);
    } catch (error) {
      console.error(error);
    }
  };

  const loadInstances = async () => {
    try {
      const data = await api("/api/solr/instances");
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setInstances(items);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadReports();
    loadCompanies();
    loadInstances();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearForm = () => {
    setForm({
      name: "",
      type: "INCIDENT",
      companyId: "",
      solrInstanceId: "",
      content: "",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!form.name.trim()) {
      setErrorMsg("Le nom du rapport est obligatoire.");
      return;
    }

    if (!form.companyId) {
      setErrorMsg("La compagnie est obligatoire.");
      return;
    }

    if (!form.content.trim()) {
      setErrorMsg("Le contenu du rapport est obligatoire.");
      return;
    }

    setCreating(true);

    try {
      await ReportsApi.create({
        name: form.name.trim(),
        type: form.type,
        companyId: Number(form.companyId),
        solrInstanceId: form.solrInstanceId ? Number(form.solrInstanceId) : null,
        content: form.content.trim(),
      });

      setSuccessMsg("Rapport créé avec succès.");
      clearForm();
      await loadReports();
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de la création du rapport.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Supprimer ce rapport ?");
    if (!ok) return;

    resetMessages();

    try {
      await ReportsApi.remove(id);
      setSuccessMsg("Rapport supprimé avec succès.");
      await loadReports();
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de la suppression du rapport.");
    }
  };

  const companyName = (companyId) => {
    const company = companies.find((c) => String(c.id) === String(companyId));
    return company?.name || companyId || "-";
  };

  const instanceName = (instanceId) => {
    const instance = instances.find((i) => String(i.id) === String(instanceId));
    return (
      instance?.name ||
      instance?.instanceName ||
      instance?.host ||
      instanceId ||
      "-"
    );
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("fr-FR");
    } catch {
      return value;
    }
  };

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const exportOneExcel = (report) => {
    const headers = [
      "ID",
      "Nom",
      "Type",
      "Compagnie",
      "Instance",
      "Date",
      "Contenu",
    ];

    const row = [
      report.id ?? "",
      report.name ?? "",
      report.type ?? "",
      companyName(report.companyId),
      instanceName(report.solrInstanceId),
      formatDate(report.createdAt),
      (report.content ?? "").replace(/\n/g, " "),
    ];

    const csvContent = [
      headers.join(";"),
      row.map(escapeCsv).join(";"),
    ].join("\n");

    const safeName = (report.name || `report-${report.id || "export"}`)
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "_");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportOnePdf = (report) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");

      const company = companyName(report.companyId);
      const instance = instanceName(report.solrInstanceId);
      const createdAt = formatDate(report.createdAt);

      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("SOLR ADMIN - RAPPORT", 14, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Document exporte automatiquement", 14, 22);

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(report.name || "Rapport", 14, 44);

      autoTable(doc, {
        startY: 52,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 3,
          textColor: [31, 41, 55],
          lineColor: [209, 213, 219],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        body: [
          ["ID", String(report.id ?? "-")],
          ["Type", String(report.type ?? "-")],
          ["Compagnie", String(company)],
          ["Instance", String(instance)],
          ["Date", String(createdAt)],
        ],
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 140 },
        },
      });

      let y = doc.lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Contenu du rapport", 14, y);

      y += 6;

      const content = report.content || "-";
      const splitText = doc.splitTextToSize(content, 180);

      doc.setDrawColor(209, 213, 219);
      doc.setFillColor(249, 250, 251);
      const textHeight = Math.max(20, splitText.length * 6 + 8);
      doc.roundedRect(14, y, 182, textHeight, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(splitText, 18, y + 8);

      const footerY = 285;
      doc.setDrawColor(229, 231, 235);
      doc.line(14, footerY - 6, 196, footerY - 6);

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Genere le ${new Date().toLocaleString("fr-FR")}`,
        14,
        footerY
      );
      doc.text("Solr Admin Platform", 160, footerY);

      const safeName = (report.name || `report-${report.id || "export"}`)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "_");

      doc.save(`${safeName}.pdf`);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de l'export PDF.");
    }
  };

  return (
    <div className="reportsPage">
      

      {errorMsg && <div className="reportsMessage error">{errorMsg}</div>}
      {successMsg && <div className="reportsMessage success">{successMsg}</div>}

      <div className="reportsPanel">
        <div className="reportsPanelHead">
          <div>
            <div className="reportsPanelTitle">Créer un rapport</div>
            <div className="reportsPanelSub">
              Ajoute un nouveau rapport d’incident, d’intervention ou de monitoring.
            </div>
          </div>
        </div>

        <form className="reportsForm" onSubmit={handleCreate}>
          <div className="reportsFormGrid">
            <div className="fieldGroup">
              <label>NOM</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Rapport incident solr-prod-1"
              />
            </div>

            <div className="fieldGroup">
              <label>TYPE</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="INCIDENT">INCIDENT</option>
                <option value="INTERVENTION">INTERVENTION</option>
                <option value="MONITORING">MONITORING</option>
              </select>
            </div>

            <div className="fieldGroup">
              <label>COMPAGNIE</label>
              <select
                name="companyId"
                value={form.companyId}
                onChange={handleChange}
              >
                <option value="">Choisir une compagnie</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="fieldGroup">
              <label>INSTANCE SOLR</label>
              <select
                name="solrInstanceId"
                value={form.solrInstanceId}
                onChange={handleChange}
              >
                <option value="">Aucune</option>
                {instances
                  .filter((instance) =>
                    !form.companyId
                      ? true
                      : String(instance.companyId) === String(form.companyId)
                  )
                  .map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name || instance.instanceName || instance.host || `Instance ${instance.id}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="fieldGroup fullWidth">
            <label>CONTENU</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={7}
              placeholder="Décris ici l’incident, l’erreur rencontrée, l’action effectuée et le statut final..."
            />
          </div>

          <div className="reportsActions">
            <button
              type="button"
              className="btn ghost sm"
              onClick={clearForm}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="btn primary sm"
              disabled={creating}
            >
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>

      <div className="reportsPanel">
        <div className="reportsPanelHead">
          <div>
            <div className="reportsPanelTitle">Liste des rapports</div>
            <div className="reportsPanelSub">
              Consulte les rapports enregistrés, exporte chaque rapport et supprime ceux qui ne sont plus utiles.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="reportsEmpty">Chargement des rapports...</div>
        ) : reports.length === 0 ? (
          <div className="reportsEmpty">Aucun rapport trouvé.</div>
        ) : (
          <div className="reportsTableWrap">
            <table className="reportsTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NOM</th>
                  <th>TYPE</th>
                  <th>COMPAGNIE</th>
                  <th>INSTANCE</th>
                  <th>DATE</th>
                  <th>CONTENU</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
                    <td>{report.name}</td>
                    <td>{report.type}</td>
                    <td>{companyName(report.companyId)}</td>
                    <td>{instanceName(report.solrInstanceId)}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td className="reportContentCell">{report.content}</td>
                    <td>
                      <div className="tableActions">
                        <button
                          className="btn ghost sm"
                          type="button"
                          onClick={() => exportOnePdf(report)}
                        >
                          PDF
                        </button>

                        <button
                          className="btn primary sm"
                          type="button"
                          onClick={() => exportOneExcel(report)}
                        >
                          Excel
                        </button>

                        <button
                          className="btn danger sm"
                          type="button"
                          onClick={() => handleDelete(report.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}