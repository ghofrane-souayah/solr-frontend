import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");      // ✅ email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password }, // ✅ envoyer email
      });

      // ✅ token
      localStorage.setItem("token", res.token);

      // ✅ user object (utilisé partout)
      const user = {
        id: res.id ?? null,
        email: res.email ?? email.trim(),
        username: res.username ?? null,
        roles: res.roles ?? [],
      };
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ (optionnel) compat avec ton ancien code
      localStorage.setItem("username", user.username || user.email);
      localStorage.setItem("roles", JSON.stringify(user.roles));

      nav("/solr-cluster", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form
        onSubmit={submit}
        style={{
          width: 360,
          maxWidth: "100%",
          border: "1px solid rgba(255,255,255,.08)",
          background: "rgba(255,255,255,.03)",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Connexion</div>

        <label style={{ display: "block", fontSize: 12, color: "rgba(234,242,255,.68)", marginTop: 10 }}>
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inpStyle}
          placeholder="ghofrane@gmail.com"
        />

        <label style={{ display: "block", fontSize: 12, color: "rgba(234,242,255,.68)", marginTop: 10 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inpStyle}
        />

        {error && <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 13 }}>{error}</div>}

        <button disabled={loading} style={btnStyle}>
          {loading ? "..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const inpStyle = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(10,16,30,.55)",
  color: "#eaf2ff",
  outline: "none",
};

const btnStyle = {
  width: "100%",
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(37,99,235,.35)",
  background: "rgba(37,99,235,.22)",
  color: "#eaf2ff",
  cursor: "pointer",
  fontWeight: 700,
};
