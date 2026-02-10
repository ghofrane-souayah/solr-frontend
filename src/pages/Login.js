import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api"; // adapte si ton fichier s'appelle autrement

import "./Auth.css"; // si tu n’as pas ce fichier, supprime cette ligne

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });

      // res.data = { id, email, role }
      localStorage.setItem("user", JSON.stringify(res.data));

      navigate("/solr-cluster");
    } catch (e2) {
      setErr("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <div className="label">Email</div>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: admin@solr.com"
              required
            />
          </div>

          <div className="field">
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••"
              required
            />
          </div>

          {err && <div className="err">{err}</div>}

          <div className="auth-actions">
            <button className="primary" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <Link to="/register" style={{ textDecoration: "none" }}>
              <button type="button" className="secondary">
                Créer un compte
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
