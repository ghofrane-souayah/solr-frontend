import { useEffect, useState } from "react";
import "./companies.css";
import { api } from "../services/api";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const loadCompanies = async () => {
    setLoading(true);
    resetMessages();

    try {
      const data = await api("/api/companies");
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setCompanies(items);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors du chargement des compagnies.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Le nom de la compagnie est obligatoire.");
      return;
    }

    setCreating(true);

    try {
      await api("/api/companies", {
        method: "POST",
        body: { name: trimmedName },
      });

      setSuccessMsg("Compagnie créée avec succès.");
      setName("");
      await loadCompanies();
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de la création de la compagnie.");
    } finally {
      setCreating(false);
    }
  };

  const openDeleteConfirm = (company) => {
    setSelectedCompany(company);
  };

  const closeDeleteConfirm = () => {
    setSelectedCompany(null);
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;

    resetMessages();

    try {
      await api(`/api/companies/${selectedCompany.id}`, {
        method: "DELETE",
      });

      setSuccessMsg("Compagnie supprimée avec succès.");
      setSelectedCompany(null);
      await loadCompanies();
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de la suppression de la compagnie.");
    }
  };

  return (
    <div className="companiesPage">
      <div className="companiesTop">
        <div>
   
          <p className="companiesSub">
            Ajoute, consulte et supprime les compagnies de la plateforme.
          </p>
        </div>

        <div className="companiesTopActions">
          <button
            className="btn ghost sm"
            type="button"
            onClick={loadCompanies}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {errorMsg && <div className="companiesMessage error">{errorMsg}</div>}
      {successMsg && <div className="companiesMessage success">{successMsg}</div>}

      <div className="companiesPanel">
        <div className="companiesPanelHead">
          <div>
            <div className="companiesPanelTitle">Créer une compagnie</div>
            <div className="companiesPanelSub">
              Ajoute une nouvelle compagnie à la plateforme.
            </div>
          </div>
        </div>

        <form className="companiesForm" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Nom de la compagnie (ex: Company A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button className="btn primary sm" type="submit" disabled={creating}>
            {creating ? "Création..." : "+ Créer"}
          </button>
        </form>
      </div>

      <div className="companiesPanel">
        <div className="companiesPanelHead">
          <div>
            <div className="companiesPanelTitle">Liste des compagnies</div>
            <div className="companiesPanelSub">
              Consulte et supprime les compagnies existantes.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="companiesEmpty">Chargement des compagnies...</div>
        ) : companies.length === 0 ? (
          <div className="companiesEmpty">Aucune compagnie trouvée.</div>
        ) : (
          <div className="companiesTableWrap">
            <table className="companiesTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NOM</th>
                  <th>CODE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.id}</td>
                    <td>{company.name}</td>
                    <td>{company.code ?? "-"}</td>
                    <td>
                      <div className="tableActions">
                        <button
                          className="btn danger sm"
                          type="button"
                          onClick={() => openDeleteConfirm(company)}
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

      {selectedCompany && (
        <div className="logoutModalOverlay" onClick={closeDeleteConfirm}>
          <div
            className="logoutModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logoutModalTitle">Confirmation</div>
            <div className="logoutModalText">
              Voulez-vous vraiment supprimer la compagnie{" "}
              <strong>{selectedCompany.name}</strong> ?
            </div>

            <div className="logoutModalActions">
              <button
                type="button"
                className="modalBtn ghost"
                onClick={closeDeleteConfirm}
              >
                Annuler
              </button>

              <button
                type="button"
                className="modalBtn danger"
                onClick={handleDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}