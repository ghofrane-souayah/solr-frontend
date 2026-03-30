import { api } from "../services/api";

export const SolrInstanceApi = {
  list: () => api("/api/solr/instances"),

  create: (payload) =>
    api("/api/solr/instances", {
      method: "POST",
      body: payload,
    }),

  update: (id, payload) =>
    api(`/api/solr/instances/${id}`, {
      method: "PUT",
      body: payload,
    }),

  remove: (id) =>
    api(`/api/solr/instances/${id}`, {
      method: "DELETE",
    }),

  copy: (id, payload) =>
    api(`/api/solr/instances/${id}/copy`, {
      method: "POST",
      body: payload,
    }),

  start: (id) =>
    api(`/api/solr/instances/${id}/start`, {
      method: "POST",
    }),
};