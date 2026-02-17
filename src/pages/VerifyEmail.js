import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API = "http://localhost:8081/api/auth/verify";

export default function VerifyEmail() {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const token = sp.get("token") || "";
  const [status, setStatus] = useState("loading"); // loading | ok | fail
  const [msg, setMsg] = useState("");

  const headers = useMemo(() => ({ "Content-Type": "application/json" }), []);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("fail");
        setMsg("Token manquant.");
        return;
      }

      try {
        const res = await fetch(`${API}?token=${encodeURIComponent(token)}`, { headers });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        setStatus("ok");
        setMsg("Compte activé ✅ Vous pouvez vous connecter.");
      } catch (e) {
        setStatus("fail");
        setMsg(e.message || "Erreur validation.");
      }
    };
    run();
  }, [token, headers]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 520, maxWidth: "95vw", padding: 18, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)" }}>
        <h2 style={{ margin: 0 }}>Vérification Email</h2>
        <p style={{ opacity: 0.85 }}>{status === "loading" ? "Validation..." : msg}</p>

        {status !== "loading" && (
          <button onClick={() => nav("/login")} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(37,99,235,.22)", color: "white", cursor: "pointer", fontWeight: 800 }}>
            Aller au Login
          </button>
        )}
      </div>
    </div>
  );
}
