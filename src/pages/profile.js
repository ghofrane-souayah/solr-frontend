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

function pillClass(role) {
  const r = String(role || "").toUpperCase();
  if (r.includes("SUPER")) return "pill pillPurple";
  if (r.includes("ADMIN")) return "pill pillBlue";
  return "pill pillGray";
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

  const [tab, setTab] = useState("account"); // account | security

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
      setMe(await res.json());
    } catch (e) {
      setMe(null);
      setErr(e?.message === "UNAUTHORIZED" ? "Session expirée. Reconnectez-vous." : "Erreur chargement profil.");
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
    return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }, [me]);

  const goBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate(isAdmin ? "/dashboard" : "/profile", { replace: true });
  };

  const strength = strengthScore(newPassword);
  const strengthLabel =
    strength <= 1 ? "Faible" : strength === 2 ? "Moyen" : strength === 3 ? "Bon" : strength === 4 ? "Fort" : "Très fort";

  const canSave = oldPassword.trim() && newPassword.trim() && newPassword.trim().length >= 8 && !loading;

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
      setOk("Mot de passe modifié ✅");
      setTab("account");
    } catch (e) {
      setErr(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="setPage">
    {/* Header */}
    <div className="setHeader">
      <div className="setHeaderLeft">
        <button className="iconBtn" onClick={goBack} title="Retour">
          ←
        </button>
        <div>
          <div className="setTitle">Account settings</div>
          <div className="setSub">Manage your account information and security preferences.</div>
        </div>
      </div>

      <div className="setHeaderActions">
    
        <button className="btn ghost" onClick={loadMe} disabled={loading}>
          ⟳ Refresh
        </button>
      </div>
    </div>

    {err && <div className="alert danger">{err}</div>}
    {ok && <div className="alert success">{ok}</div>}
    {!err && loading && <div className="alert">Chargement…</div>}

    <div className="setGrid">
      {/* LEFT */}
      <div className="setMain">
        <div className="section">
          <div className="sectionHead">
            <div className="sectionTitle">Compte</div>
            <div className="sectionDesc">Informations de base</div>
          </div>

          <div className="kv2">
            <div className="kvRow">
              <div className="k">Username</div>
              <div className="v">{me?.username || "—"}</div>
            </div>
            <div className="kvRow">
              <div className="k">Email</div>
              <div className="v">{me?.email || "—"}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="sectionHead">
            <div className="sectionTitle">Organisation</div>
            <div className="sectionDesc">Entreprise et affectation</div>
          </div>

          <div className="kv2">
            <div className="kvRow">
              <div className="k">Company</div>
              <div className="v">{me?.companyName || "—"}</div>
            </div>
            <div className="kvRow">
              <div className="k">Company ID</div>
              <div className="v">#{me?.companyId ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="section compact">
          <div className="sectionHead">
            <div className="sectionTitle">Identifiants</div>
            <div className="sectionDesc">Informations internes</div>
          </div>

          <div className="kv2">
            <div className="kvRow">
              <div className="k">User ID</div>
              <div className="v">{me?.id ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Security inline */}
        <div className="section">
          <div className="sectionHead">
            <div className="sectionTitle">Sécurité</div>
            <div className="sectionDesc">Changer le mot de passe</div>
          </div>

          <div className="formStack">
            <label className="label">
              Ancien mot de passe
              <input
                className="input"
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </label>

            <label className="label">
              Nouveau mot de passe
              <input
                className="input"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <div className="inlineTools">
              <button className="miniBtn" type="button" onClick={() => setShowOld(p => !p)}>
                {showOld ? "Hide old" : "Show old"}
              </button>
              <button className="miniBtn" type="button" onClick={() => setShowNew(p => !p)}>
                {showNew ? "Hide new" : "Show new"}
              </button>
            </div>

            <div className="pwdMeta">
              <div className="pwdLine">
                <span>Strength</span>
                <b>{strengthLabel}</b>
              </div>
              <div className="strengthBar">
                <div className="strengthFill" style={{ width: `${(strength / 5) * 100}%` }} />
              </div>
              <div className="hint">8+ chars, uppercase, lowercase, number, symbol.</div>
            </div>

            <div className="sectionFoot">
              <button className="btn ghost" type="button" onClick={() => { setOldPassword(""); setNewPassword(""); }}>
                Clear
              </button>
              <button className="btn primary" type="button" onClick={changePassword} disabled={!canSave}>
                Save password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT (ACTIONS ONLY) */}
      <aside className="setSide">
        <div className="sideCard">
          <div className="sideTop">
            <div className="avatar">{initials}</div>
            <div>
              <div className="sideName">{me?.username || "—"}</div>
              <div className="sideEmail">{me?.email || "—"}</div>
            </div>
          </div>

          <div className="sidePills">
            <span className={pillClass(me?.role)}>{me?.role || "—"}</span>
            <span className={me?.enabled ? "pill pillGreen" : "pill pillRed"}>
              {me?.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

         

          <div className="sideNote">
            <div className="noteTitle">Password policy</div>
            <div className="noteText">
              Use a unique password. Avoid reused credentials. Change it regularly.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
);

}
