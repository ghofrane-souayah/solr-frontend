import { useEffect, useMemo, useState } from "react";
import "./Users.css";
import { api } from "../services/api";

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

export default function UsersPage() {
  const roles = useMemo(() => getRoles(), []);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = roles.includes("ADMIN") || isSuperAdmin;

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
    companyId: "",
  });

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const resetForm = (companyId = "") => {
    setForm({
      username: "",
      email: "",
      password: "",
      role: "USER",
      companyId: companyId || "",
    });
    setEditingUserId(null);
  };

  const loadCompaniesForSuperAdmin = async () => {
    setLoadingCompanies(true);
    resetMessages();

    try {
      const data = await api("/api/companies");
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setCompanies(items);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors du chargement des compagnies.");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadMyCompanyForAdmin = async () => {
    setLoadingCompanies(true);
    resetMessages();

    try {
      const company = await api("/api/companies/me");

      if (company) {
        setCompanies([company]);
        setSelectedCompanyId(String(company.id));
        setSelectedCompany(company);
        resetForm(String(company.id));
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors du chargement de la compagnie.");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadUsers = async (companyId) => {
    if (!companyId) {
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    resetMessages();

    try {
      const data = await api(`/api/users?companyId=${companyId}`);
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setUsers(items);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors du chargement des utilisateurs.");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadCompaniesForSuperAdmin();
    } else if (isAdmin) {
      loadMyCompanyForAdmin();
    }
  }, [isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setUsers([]);
      return;
    }

    const company =
      companies.find((c) => String(c.id) === String(selectedCompanyId)) || null;

    setSelectedCompany(company);
    setForm((prev) => ({
      ...prev,
      companyId: String(selectedCompanyId),
    }));

    loadUsers(selectedCompanyId);
  }, [selectedCompanyId, companies]);

  const handleCompanyClick = (company) => {
    setSelectedCompanyId(String(company.id));
    setSelectedCompany(company);
    setShowForm(false);
    resetMessages();
    resetForm(String(company.id));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    resetMessages();
    resetForm(selectedCompanyId);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    resetMessages();
    setEditingUserId(user.id);
    setForm({
      username: user.username ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role ?? "USER",
      companyId: String(selectedCompanyId || ""),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    const companyIdToUse = form.companyId || selectedCompanyId;

    if (!companyIdToUse) {
      setErrorMsg("Tu dois choisir une compagnie.");
      return;
    }

    setSaving(true);

    try {
      if (editingUserId) {
        await api(`/api/users/${editingUserId}`, {
          method: "PUT",
          body: {
            username: form.username,
            email: form.email,
            password: form.password || undefined,
            role: form.role,
            companyId: Number(companyIdToUse),
          },
        });

        setSuccessMsg("Utilisateur modifié avec succès.");
      } else {
        await api("/api/users", {
          method: "POST",
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
            role: form.role,
            companyId: Number(companyIdToUse),
          },
        });

        setSuccessMsg("Utilisateur créé avec succès.");
      }

      setShowForm(false);
      resetForm(companyIdToUse);
      await loadUsers(companyIdToUse);
    } catch (error) {
      console.error(error);
      setErrorMsg(
        editingUserId
          ? "Erreur lors de la modification de l'utilisateur."
          : "utilisateur existe déja."
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user) => {
    setUserToDelete(user);
  };

  const closeDeleteConfirm = () => {
    setUserToDelete(null);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    resetMessages();

    try {
      await api(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      setSuccessMsg("Utilisateur supprimé avec succès.");
      setUserToDelete(null);
      await loadUsers(selectedCompanyId);
    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de la suppression de l'utilisateur.");
    }
  };

  const canShowUsers = !!selectedCompanyId;
  const companyLabel = selectedCompany?.name || "Aucune compagnie sélectionnée";

  return (
    <div className="usersPage">
      <div className="usersTop">
        <div>
        
         
          <p className="usersSub">
            {isSuperAdmin
              ? "Sélectionne une compagnie pour afficher et gérer ses utilisateurs."
              : "Gère les utilisateurs de ta compagnie."}
          </p>
        </div>

        <div className="usersTopActions">
          <button
            className="btn ghost sm"
            onClick={() => selectedCompanyId && loadUsers(selectedCompanyId)}
            disabled={!selectedCompanyId || loadingUsers}
            type="button"
          >
            {loadingUsers ? "Chargement..." : "Actualiser"}
          </button>

          <button
            className="btn primary sm"
            onClick={openCreateForm}
            disabled={!selectedCompanyId}
            type="button"
          >
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {errorMsg && <div className="usersMessage error">{errorMsg}</div>}
      {successMsg && <div className="usersMessage success">{successMsg}</div>}

      <div className="usersLayout">
        <aside className="companiesPanel">
          <div className="panelTitle">Compagnies</div>

          {loadingCompanies ? (
            <div className="panelEmpty">Chargement des compagnies...</div>
          ) : companies.length === 0 ? (
            <div className="panelEmpty">Aucune compagnie trouvée.</div>
          ) : (
            <div className="companyList">
              {companies.map((company) => {
                const active = String(company.id) === String(selectedCompanyId);

                return (
                  <button
                    key={company.id}
                    type="button"
                    className={`companyItem ${active ? "active" : ""}`}
                    onClick={() => handleCompanyClick(company)}
                  >
                    <div className="companyName">{company.name}</div>
                    <div className="companyCode">{company.code}</div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="usersPanel">
          <div className="panelTitle">
            {canShowUsers ? `Utilisateurs - ${companyLabel}` : "Utilisateurs"}
          </div>

          {!canShowUsers && isSuperAdmin && (
            <div className="panelEmpty">
              Sélectionne une compagnie pour voir les utilisateurs.
            </div>
          )}

          {showForm && canShowUsers && (
            <form className="userForm" onSubmit={handleSubmit}>
              <div className="formGrid">
                <div className="formField">
                  <label>Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="formField">
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="formField">
                  <label>Mot de passe</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editingUserId ? "Laisser vide si inchangé" : ""}
                    required={!editingUserId}
                  />
                </div>

                <div className="formField">
                  <label>Rôle</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="formField">
                  <label>Compagnie</label>
                  <select
                    name="companyId"
                    value={form.companyId}
                    onChange={handleChange}
                    required
                    disabled={!isSuperAdmin}
                  >
                    <option value="">Choisir une compagnie</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formActions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setShowForm(false);
                    resetForm(selectedCompanyId);
                    resetMessages();
                  }}
                >
                  Annuler
                </button>

                <button type="submit" className="btn primary" disabled={saving}>
                  {saving
                    ? editingUserId
                      ? "Modification..."
                      : "Création..."
                    : editingUserId
                    ? "Modifier utilisateur"
                    : "Créer utilisateur"}
                </button>
              </div>
            </form>
          )}

          {canShowUsers && loadingUsers ? (
            <div className="panelEmpty">Chargement des utilisateurs...</div>
          ) : canShowUsers && users.length === 0 ? (
            <div className="panelEmpty">Aucun utilisateur dans cette compagnie.</div>
          ) : canShowUsers ? (
            <div className="usersTableWrap">
              <table className="usersTable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username ?? "-"}</td>
                      <td>{user.email ?? "-"}</td>
                      <td>{user.role ?? "-"}</td>
                      <td>{user.active ? "Actif" : "Inactif"}</td>
                      <td>
                        <div className="tableActions">
                          <button
                            className="btn ghost sm"
                            onClick={() => openEditForm(user)}
                            type="button"
                          >
                            Modifier
                          </button>
                          <button
                            className="btn danger sm"
                            onClick={() => openDeleteConfirm(user)}
                            type="button"
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
          ) : null}
        </section>
      </div>

      {userToDelete && (
        <div className="logoutModalOverlay" onClick={closeDeleteConfirm}>
          <div
            className="logoutModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logoutModalTitle">Confirmation</div>
            <div className="logoutModalText">
              Voulez-vous vraiment supprimer l'utilisateur{" "}
              <strong>{userToDelete.username}</strong> ?
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