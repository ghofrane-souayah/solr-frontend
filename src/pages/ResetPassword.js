import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ResetPassword.css";

const BASE_URL = "http://localhost:8081";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const validateForm = () => {
    if (!token) {
      return "Token manquant dans le lien de réinitialisation";
    }

    if (!newPassword.trim()) {
      return "Le nouveau mot de passe est obligatoire";
    }

    if (newPassword.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (!confirmPassword.trim()) {
      return "La confirmation du mot de passe est obligatoire";
    }

    if (newPassword !== confirmPassword) {
      return "Les mots de passe ne correspondent pas";
    }

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    const validationError = validateForm();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const text = await response.text();
      let res = {};

      try {
        res = text ? JSON.parse(text) : {};
      } catch {
        res = {};
      }

      if (!response.ok) {
        throw new Error(res?.message || "Impossible de réinitialiser le mot de passe");
      }

      setOk("Mot de passe réinitialisé avec succès. Redirection vers la connexion...");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (e2) {
      setErr(e2?.message || "Impossible de réinitialiser le mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-shell">
        <div className="reset-brand">
          <div className="brand-icon">
            <DatabaseIcon />
          </div>
          <h1>Solr Admin</h1>
          <p>Choisissez un nouveau mot de passe</p>
        </div>

        <div className="reset-container">
          <h2>Réinitialiser le mot de passe</h2>
          <p className="reset-subtitle">
            Saisissez votre nouveau mot de passe pour finaliser la réinitialisation
          </p>

          <form className="reset-form" onSubmit={onSubmit} autoComplete="off">
            <label>NOUVEAU MOT DE PASSE</label>
            <div className="password-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword((p) => !p)}
                aria-label={
                  showNewPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={showNewPassword ? "Masquer" : "Afficher"}
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <label>CONFIRMER LE MOT DE PASSE</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword((p) => !p)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={showConfirmPassword ? "Masquer" : "Afficher"}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {err && <div className="reset-error">{err}</div>}
            {ok && <div className="reset-success">{ok}</div>}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Réinitialisation..." : "Réinitialiser"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/login")}
            >
              Retour connexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="7" ry="3.2" />
      <path d="M5 5v6c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V5" />
      <path d="M5 11v6c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.7-1.66 1.79-3.17 3.17-4.39" />
      <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
      <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a10.94 10.94 0 0 1-2.12 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}