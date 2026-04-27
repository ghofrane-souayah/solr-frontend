import { api } from "../services/api";

export const NotificationsApi = {
  list: () => api("/api/notifications"),

  markAsRead: (id) =>
    api(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllAsRead: () =>
    api("/api/notifications/read-all", {
      method: "PATCH",
    }),

  remove: (id) =>
    api(`/api/notifications/${id}`, {
      method: "DELETE",
    }),
};