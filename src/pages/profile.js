import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./profile.css";

const API = "http://localhost:8081/api/users";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function strengthScore(pwd) {
  const p = String(pwd || "");
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 5);
}

export default function Profile() {
  const location = useLocation();
  const roles = useMemo(() => getRoles(), []);
  const currentUser = useMemo(() => getSavedUser(), []);
  const currentUserId = currentUser?.id;

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const headers = useMemo(() => getAuthHeaders(), []);

  const currentSection =
    location.hash === "#security" ? "security" : "personal";
const loadMe = async () => {
  setLoading(true);
  setErr("");
  setOk("");

  try {
    const res = await fetch(`${API}/me`, { headers });

    if (res.status === 401 || res.status === 403) {
      throw new Error("UNAUTHORIZED");
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    setMe(data);

    setFirstName(data?.firstName || "");
    setLastName(data?.lastName || "");
    setUsername(data?.username || "");
    setEmail(data?.email || "");
  } catch (e) {
    setMe(null);
    setErr(
      e?.message === "UNAUTHORIZED"
        ? "Session expirée. Reconnectez-vous."
        : "Erreur chargement profil."
    );
  } finally {
    setLoading(false);
  }
};
  const displayRole = me?.role || roles[0] || "ADMIN";

  const canSaveProfile =
    username.trim() &&
    email.trim() &&
    !loading;

  const canSavePassword =
    oldPassword.trim() &&
    newPassword.trim() &&
    newPassword.trim().length >= 8 &&
    !loading;

  const strength = strengthScore(newPassword);
  const strengthLabel =
    strength <= 1
      ? "Faible"
      : strength === 2
      ? "Moyen"
      : strength === 3
      ? "Bon"
      : strength === 4
      ? "Fort"
      : "Très fort";

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const saveProfile = async () => {
    setErr("");
    setOk("");

    if (!username.trim() || !email.trim()) {
      setErr("Veuillez remplir tous les champs du profil.");
      return;
    }

    if (!validateEmail(email.trim())) {
      setErr("Veuillez saisir une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      if (!currentUserId) throw new Error("Utilisateur introuvable.");

      const res = await fetch(`${API}/${currentUserId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("Accès refusé.");
      }

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour du profil.");
      }

      const updated = await res.json().catch(() => null);

      const nextUser = {
        ...(updated || me || {}),
        firstName: updated?.firstName ?? firstName.trim(),
        lastName: updated?.lastName ?? lastName.trim(),
        username: updated?.username ?? username.trim(),
        email: updated?.email ?? email.trim().toLowerCase(),
        role: updated?.role ?? me?.role ?? displayRole,
      };

      setMe(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setOk("Profil mis à jour avec succès.");
    } catch (e) {
      setErr(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setErr("");
    setOk("");

    if (!oldPassword || !newPassword) {
      setErr("Veuillez remplir les deux champs.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setErr("Nouveau mot de passe trop court (min 8).");
      return;
    }

    setLoading(true);
    try {
      if (!currentUserId) throw new Error("Utilisateur introuvable.");

      const res = await fetch(`${API}/${currentUserId}/password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.status === 401) throw new Error("Ancien mot de passe incorrect.");
      if (res.status === 403) throw new Error("Accès refusé.");
      if (!res.ok) throw new Error("Ancien mot de passe est incorrect.");

      setOldPassword("");
      setNewPassword("");
      setOk("Mot de passe modifié avec succès.");
    } catch (e) {
      setErr(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const clearProfile = () => {
    setFirstName(me?.firstName || "");
    setLastName(me?.lastName || "");
    setUsername(me?.username || "");
    setEmail(me?.email || "");
  };

  return (
    <div className="profile-page">
      {(err || ok || loading) && (
        <div className="profile-messages">
          {err && <div className="profile-alert danger">{err}</div>}
          {ok && <div className="profile-alert success">{ok}</div>}
          {!err && loading && <div className="profile-alert">Chargement...</div>}
        </div>
      )}

      {currentSection === "personal" && (
        <div className="simple-profile-card">
          <div className="simple-card-head">
            <div>
              <h2>Informations personnelles</h2>
              <p>Modifiez vos informations</p>
            </div>

            <div className="simple-head-right">
              

      
            </div>
          </div>

          <form
            className="simple-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile();
            }}
          >
            <div className="field-group">
              <label>NOM</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="field-group">
              <label>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre email"
              />
            </div>

            <div className="form-actions full-row">
              <button
                className="secondary-btn"
                type="button"
                onClick={clearProfile}
                disabled={loading}
              >
                Annuler
              </button>

              <button
                className="primary-btn"
                type="submit"
                disabled={!canSaveProfile}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {currentSection === "security" && (
        <div className="simple-profile-card">
          <div className="simple-card-head">
            <div>
              <h2>Sécurité</h2>
              <p>Changer le mot de passe</p>
            </div>
          </div>

          <div className="simple-form-grid">
            <div className="field-group">
              <label>ANCIEN MOT DE PASSE</label>
              <div className="password-wrapper">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Ancien mot de passe"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowOld((p) => !p)}
                >
                  {showOld ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label>NOUVEAU MOT DE PASSE</label>
              <div className="password-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNew((p) => !p)}
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="pwd-meta full-row">
              <div className="pwd-line">
                <span>Password strength</span>
                <b>{strengthLabel}</b>
              </div>

              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>

              <div className="hint">
                8+ caractères, majuscule, minuscule, chiffre et symbole.
              </div>
            </div>

            <div className="form-actions full-row">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setOldPassword("");
                  setNewPassword("");
                }}
              >
                Supprimer
              </button>

              <button
                className="primary-btn"
                type="button"
                onClick={changePassword}
                disabled={!canSavePassword}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}