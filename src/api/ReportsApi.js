import { api } from "../services/api";

export const ReportsApi = {
  list: () => api("/api/reports"),

  create: (payload) =>
    api("/api/reports", {
      method: "POST",
      body: payload,
    }),

  remove: (id) =>
    api(`/api/reports/${id}`, {
      method: "DELETE",
    }),
};