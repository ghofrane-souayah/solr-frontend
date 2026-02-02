import "./App.css";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:8081/users";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = () => {
    setError("");
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Erreur GET: HTTP " + res.status);
        return res.json();
      })
      .then((data) => setUsers(data))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.username || !form.email || !form.password) {
      setError("Remplis tous les champs.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur POST: HTTP " + res.status);

      setSuccess("Utilisateur ajouté ✅");
      setForm({ username: "", email: "", password: "" });
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur DELETE: HTTP " + res.status);

      setSuccess("Utilisateur supprimé ✅");
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Gestion des utilisateurs</h1>

        <h2>Ajouter un utilisateur</h2>
        <form onSubmit={onSubmit} className="form">
          <input
            className="input"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={onChange}
          />
          <input
            className="input"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
          />
          <input
            className="input"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange}
          />

          <button className="btn btnPrimary" type="submit" disabled={loading}>
            {loading ? "Ajout..." : "Ajouter"}
          </button>
        </form>

        {error && <p className="notice noticeError">{error}</p>}
        {success && <p className="notice noticeSuccess">{success}</p>}

        <h2>Liste</h2>
        <ul className="list">
          {users.map((u) => (
            <li key={u.id} className="item">
              <div>
                <div className="itemTitle">{u.username}</div>
                <div className="itemSub">{u.email}</div>
              </div>
              <button
                className="btn btnDanger"
                onClick={() => deleteUser(u.id)}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}