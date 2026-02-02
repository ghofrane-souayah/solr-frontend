import axios from "axios";

const API_URL = "http://localhost:8081";

// récupérer les serveurs Solr
export const fetchSolrServers = async () => {
  const response = await axios.get(`${API_URL}/solr/servers`);
  return response.data;
};
