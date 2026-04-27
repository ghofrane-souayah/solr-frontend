import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const BASE_URL = "http://localhost:8081";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectAfterAuth = (roles) => {
    const normalized = (Array.isArray(roles) ? roles : [])
      .map((r) => {
        if (typeof r === "string") return r;
        if (r?.name) return r.name;
        if (r?.authority) return r.authority;
        return "";
      })
      .map((r) => String(r || "").replace("ROLE_", "").toUpperCase())
      .filter(Boolean);

    if (
      normalized.includes("SUPER_ADMIN") ||
      normalized.includes("ADMIN") ||
      normalized.includes("USER")
    ) {
      nav("/solr-cluster");
      return;
    }

    nav("/forbidden");
  };

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return "L'adresse email est obligatoire";
    }

    if (!validateEmail(cleanEmail)) {
      return "Veuillez saisir une adresse email valide";
    }

    if (!password.trim()) {
      return "Le mot de passe est obligatoire";
    }

    if (password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères";
    }

    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      const cleanEmail = email.trim().toLowerCase();

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
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
        throw new Error(res?.message || `HTTP ${response.status}`);
      }

      const token = res?.token;
      if (!token) {
        throw new Error("Token manquant dans la réponse login");
      }

      const extractedRolesRaw =
        res?.roles ??
        res?.role ??
        res?.authorities ??
        res?.user?.roles ??
        res?.user?.role ??
        [];

      const roles = Array.isArray(extractedRolesRaw)
        ? extractedRolesRaw
        : [extractedRolesRaw];

      const companyId =
        res?.companyId ??
        res?.company?.id ??
        res?.user?.companyId ??
        null;

      const companyCode =
        res?.companyCode ??
        res?.company?.code ??
        res?.user?.companyCode ??
        null;

      const user = {
        id: res?.id ?? res?.user?.id ?? null,
        email: res?.email ?? res?.user?.email ?? cleanEmail,
        username: res?.username ?? res?.user?.username ?? "",
        roles,
        companyId,
        companyCode,
      };

      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("roles");
      localStorage.removeItem("companyId");
      localStorage.removeItem("companyCode");
      localStorage.removeItem("user");

      localStorage.setItem("token", token);
      localStorage.setItem("username", user.username || "");
      localStorage.setItem("roles", JSON.stringify(roles));
      localStorage.setItem("user", JSON.stringify(user));

      if (companyId != null) {
        localStorage.setItem("companyId", String(companyId));
      }

      if (companyCode != null) {
        localStorage.setItem("companyCode", String(companyCode));
      }

      if (rememberMe) {
        localStorage.setItem("rememberEmail", cleanEmail);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      redirectAfterAuth(roles);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <div className="brand-icon">
            <DatabaseIcon />
          </div>

          <h1>Solr Admin</h1>
          <p>Sign in to your monitoring platform</p>
        </div>

        <div className="login-container">
          <h2>Connexion</h2>
          <p className="login-subtitle">
            Connectez-vous à votre plateforme de monitoring
          </p>

          <form className="login-form" onSubmit={submit} autoComplete="off">
            <label>EMAIL</label>
            <input
              type="email"
              name="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@company.com"
            />

            <div className="password-label-row">
              <label>MOT DE PASSE</label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => nav("/forgot-password")}
              >
                Mot de passe oublié?
              </button>
              
            </div>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mot de passe"
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && <div className="login-error">{"mot de passe invalide"}</div>}

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Se souvenir de moi</span>
              </label>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <p className="signup-text">
              Vous n'avez pas de compte?{" "}
              <button
                type="button"
                className="signup-link"
                onClick={() => nav("/register")}
              >
                S'inscrire
              </button>
            </p>
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
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
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
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
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