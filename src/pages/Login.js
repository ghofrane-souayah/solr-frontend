import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:8081/auth/login",
        {
          email,
          password,
        }
      );

      // ✅ Sauvegarder l'utilisateur connecté
      localStorage.setItem("user", JSON.stringify(response.data));

      // ✅ Redirection vers SolrCluster
      navigate("/solr-cluster");
    } catch (err) {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="login-container">
      <h2>Connexion</h2>

      {error && <p className="login-error">{error}</p>}

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}
