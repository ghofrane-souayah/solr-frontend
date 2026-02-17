import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");

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
      // option : rediriger vers login après 2s
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (e2) {
      setErr(e2?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Création du compte</h2>

        <label style={styles.label}>Username</label>
        <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label style={styles.label}>Email</label>
        <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <label style={styles.label}>Company Code</label>
        <input style={styles.input} value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} required />

        {err && <div style={styles.err}>{err}</div>}
        {ok && <div style={styles.ok}>{ok}</div>}

        <button style={styles.btn} disabled={loading}>
          {loading ? "Création..." : "Créer"}
        </button>

        <button type="button" style={styles.btnSecondary} onClick={() => navigate("/login")}>
          Retour login
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#0b1220" },
  card: { width: 420, padding: 20, border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, background: "rgba(15,23,42,.9)", color: "#e5e7eb" },
  label: { display: "block", marginTop: 12, marginBottom: 6, fontSize: 13, color: "rgba(226,232,240,.85)" },
  input: { width: "100%", padding: 10, border: "1px solid rgba(148,163,184,.22)", borderRadius: 10, background: "rgba(2,6,23,.55)", color: "#e5e7eb", outline: "none" },
  btn: { width: "100%", padding: 10, marginTop: 16, borderRadius: 10, border: "1px solid rgba(59,130,246,.35)", background: "rgba(37,99,235,.9)", color: "white", cursor: "pointer", fontWeight: 700 },
  btnSecondary: { width: "100%", padding: 10, marginTop: 10, borderRadius: 10, border: "1px solid rgba(148,163,184,.22)", background: "transparent", color: "rgba(226,232,240,.85)", cursor: "pointer" },
  err: { marginTop: 10, color: "#fecaca", fontSize: 13, background: "rgba(220,38,38,.14)", padding: 10, borderRadius: 10 },
  ok: { marginTop: 10, color: "#bbf7d0", fontSize: 13, background: "rgba(34,197,94,.12)", padding: 10, borderRadius: 10 },
};
