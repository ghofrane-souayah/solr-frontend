import { api } from "./api";

export const getUsers = () => api.get("/api/users");

export const deleteUser = (id) => api.delete(`/api/users/${id}`);
