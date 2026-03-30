import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const roles = useMemo(() => getRoles(), []);
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const headers = useMemo(() => getAuthHeaders(), []);

  const loadMe = async () => {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const res = await fetch(`${API}/me`, { headers });
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setMe(data);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data?.id ?? null,
          email: data?.email ?? "",
          username: data?.username ?? "",
          companyId: data?.companyId ?? null,
          companyName: data?.companyName ?? "",
          role: data?.role ?? roles?.[0] ?? "ADMIN",
        })
      );
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

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = useMemo(() => {
    const u = me?.username || me?.email || "U";
    const parts = String(u).split(/[\s.@_:-]+/).filter(Boolean);
    return (
      (parts[0]?.[0] || "U").toUpperCase() +
      (parts[1]?.[0] || "").toUpperCase()
    );
  }, [me]);

  const displayRole =
    me?.role ||
    roles[0] ||
    "ADMIN";

  const canSave =
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
      const res = await fetch(`${API}/me/password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.status === 401) throw new Error("Ancien mot de passe incorrect.");
      if (res.status === 403) throw new Error("Accès refusé.");
      if (!res.ok) throw new Error("Erreur lors du changement de mot de passe.");

      setOldPassword("");
      setNewPassword("");
      setOk("Mot de passe modifié avec succès.");
    } catch (e) {
      setErr(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate(isAdmin ? "/dashboard" : "/profile", { replace: true });
  };

  return (
    <div className="accountPage">
      {(err || ok || loading) && (
        <div className="accountMessages">
          {err && <div className="alert danger">{err}</div>}
          {ok && <div className="alert success">{ok}</div>}
          {!err && loading && <div className="alert">Chargement…</div>}
        </div>
      )}

      <div className="accountCard">
        <div className="accountHeader">
          <div className="accountAvatar">{initials || "U"}</div>

          <div className="accountIdentity">
            <h2>{me?.username || me?.email || "—"}</h2>
            <div className="accountMainRole">{displayRole}</div>
          </div>
        </div>

        <div className="accountInfoList">
          <div className="accountInfoRow">
            <div className="accountInfoIcon">
              <UserIcon />
            </div>
            <div className="accountInfoText">
              <div className="accountInfoLabel">Username</div>
              <div className="accountInfoValue">{me?.username || "—"}</div>
            </div>
          </div>

          <div className="accountInfoRow">
            <div className="accountInfoIcon">
              <MailIcon />
            </div>
            <div className="accountInfoText">
              <div className="accountInfoLabel">Email</div>
              <div className="accountInfoValue">{me?.email || "—"}</div>
            </div>
          </div>

          <div className="accountInfoRow">
            <div className="accountInfoIcon">
              <ShieldIcon />
            </div>
            <div className="accountInfoText">
              <div className="accountInfoLabel">Roles</div>
              <div className="accountRoles">
                {(me?.role ? [me.role] : roles.length ? roles : ["ADMIN"]).map((role) => (
                  <span key={role} className="roleBadge">
                    {String(role).replace("ROLE_", "").toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="securityCard">
        <div className="securityHead">
          <div>
            <div className="securityTitle">Security</div>
            <div className="securityDesc">Changer le mot de passe</div>
          </div>

          <button className="miniActionBtn" type="button" onClick={loadMe} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="securityGrid">
          <label className="field">
            <span>Ancien mot de passe</span>
            <div className="passwordField">
              <input
                className="input"
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Entrer l'ancien mot de passe"
              />
              <button
                type="button"
                className="eyeBtn"
                onClick={() => setShowOld((p) => !p)}
              >
                {showOld ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Nouveau mot de passe</span>
            <div className="passwordField">
              <input
                className="input"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrer le nouveau mot de passe"
              />
              <button
                type="button"
                className="eyeBtn"
                onClick={() => setShowNew((p) => !p)}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        </div>

        <div className="pwdMeta">
          <div className="pwdLine">
            <span>Password strength</span>
            <b>{strengthLabel}</b>
          </div>

          <div className="strengthBar">
            <div
              className="strengthFill"
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>

          <div className="hint">
            8+ caractères, majuscule, minuscule, chiffre et symbole.
          </div>
        </div>

        <div className="securityActions">
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setOldPassword("");
              setNewPassword("");
            }}
          >
            Clear
          </button>

          <button
            className="btn primary"
            type="button"
            onClick={changePassword}
            disabled={!canSave}
          >
            Save password
          </button>
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 6h16v12H4z" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}