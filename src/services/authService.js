// src/services/authService.js
import { api } from "../api/http";

export async function register(payload) {
  // api() doit renvoyer soit JSON, soit throw sur !ok.
  // Ici on veut accepter un 201 sans JSON.
  const res = await fetch("http://localhost:8081/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // si backend renvoie 409 (email existe), 403, etc.
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  // 201 avec body vide => ok
  return { ok: true };
}
