import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

const BASE_URL = "http://localhost:8081";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("L'adresse email est obligatoire");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError("Veuillez saisir une adresse email valide");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const text = await response.text();
      let res = {};

      try {
        res = text ? JSON.parse(text) : {};
      } catch {
        res = {};
      }

      if (!response.ok) {
        throw new Error(
          res?.message || "Impossible d'envoyer le lien de réinitialisation"
        );
      }

      setSuccess(
        "Un lien de réinitialisation a été envoyé à votre adresse email."
      );
      setEmail("");
    } catch (err) {
      setError(
        err?.message || "Impossible d'envoyer le lien de réinitialisation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-shell">
        <div className="forgot-brand">
          <div className="brand-icon">
            <DatabaseIcon />
          </div>

          <h1>Solr Admin</h1>
          <p>Réinitialisez votre mot de passe</p>
        </div>

        <div className="forgot-container">
          <h2>Mot de passe oublié</h2>
          <p className="forgot-subtitle">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </p>

          <form className="forgot-form" onSubmit={onSubmit} autoComplete="off">
            <label>EMAIL</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              required
            />


            {error && <div className="forgot-error">{  "mail n'est pas trouvée" }</div>}
            {success && <div className="forgot-success">{success}</div>}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
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