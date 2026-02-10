import { api } from "./api";

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const register = (payload) =>
  api.post("/auth/register", payload); 
// payload: { username, email, password, role: "ADMIN" | "USER" }
