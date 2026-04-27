import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      await register({ username, email, password, companyCode });
      setOk("Compte créé ✅ Vérifie ton email pour activer le compte.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (e2) {
      setErr(e2?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-shell">
        <div className="register-brand">
          <div className="brand-icon">
            <DatabaseIcon />
          </div>
          <h1>Solr Admin</h1>
          <p>Create your monitoring platform account</p>
        </div>

        <div className="register-container">
          <h2>Créer un compte</h2>
          <p className="register-subtitle">
  Rejoignez notre communauté dès aujourd'hui
</p>

          <form className="register-form" onSubmit={onSubmit} autoComplete="off">
            <label>Nom Utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />

            <label>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              required
            />

            <label>Mot de Passe</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <label>Code Company </label>
            <input
              type="text"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="Company code"
              required
            />

            {err && <div className="register-error">{err}</div>}
            {ok && <div className="register-success">{ok}</div>}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/login")}
            >
              Retour login
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