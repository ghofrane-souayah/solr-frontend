import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await register({ username, email, password, role });
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/users");
    } catch (e2) {
  console.log("REGISTER ERROR:", e2?.response?.status, e2?.response?.data);
  setErr(
    `Erreur register: ${e2?.response?.status || ""} ${
      typeof e2?.response?.data === "string" ? e2.response.data : ""
    }`
  );
}
 finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Register</h2>

        <label style={styles.label}>Username</label>
        <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} />

        <label style={styles.label}>Email</label>
        <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label style={styles.label}>Role</label>
        <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        {err && <div style={styles.err}>{err}</div>}

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
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 },
  card: {
    width: 380,
    padding: 20,
    border: "1px solid #ddd",
    borderRadius: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    background: "#fff",
  },
  label: { display: "block", marginTop: 12, marginBottom: 6, fontSize: 13 },
  input: { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 10 },
  btn: { width: "100%", padding: 10, marginTop: 16, borderRadius: 10, border: "none", cursor: "pointer" },
  btnSecondary: { width: "100%", padding: 10, marginTop: 10, borderRadius: 10, border: "1px solid #ddd", background: "transparent", cursor: "pointer" },
  err: { marginTop: 10, color: "crimson", fontSize: 13 },
};
