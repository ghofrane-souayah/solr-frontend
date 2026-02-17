import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { redirectAfterAuth } from "../auth/redirect";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      const res = await api("/api/auth/login", {
        method: "POST",
        body: { email: cleanEmail, password },
      });

      // ✅ Stocker token + infos
      localStorage.setItem("token", res.token);
      localStorage.setItem("username", res.username || "");
      localStorage.setItem("roles", JSON.stringify(res.roles || []));

      // ✅ optionnel : stocker user complet
      const user = {
        id: res.id ?? null,
        email: res.email ?? cleanEmail,
        username: res.username ?? null,
        roles: res.roles ?? [],
        companyId: res.companyId ?? null,
        companyCode: res.companyCode ?? null,
      };
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ UNE SEULE redirection centralisée
      redirectAfterAuth(nav);
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form
        onSubmit={submit}
        autoComplete="off"
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
          type="email"
          name="email"
          autoComplete="off"
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
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inpStyle}
        />

        {error && <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 13 }}>{error}</div>}

        <button disabled={loading} style={btnStyle}>
          {loading ? "..." : "Login"}
        </button>

        <button type="button" style={btnSecondary} onClick={() => nav("/register")}>
          Créer un compte
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

const btnSecondary = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.15)",
  background: "transparent",
  color: "#eaf2ff",
  cursor: "pointer",
};
