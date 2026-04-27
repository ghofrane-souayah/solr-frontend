const API_BASE = "http://localhost:8081";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.message || data?.error || `HTTP ${res.status}`;

    const error = new Error(msg);
    error.status = res.status;
    error.response = { data };
    throw error;
  }

  return data;
}