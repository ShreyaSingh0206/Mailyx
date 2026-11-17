// services/emailService.js
import API from "./api";
export const getEmails = (params) => API.get("/emails", { params }).then((r) => r.data);
export const getEmail = (id) => API.get(`/emails/${id}`).then((r) => r.data.email);
export const getStats = () => API.get("/emails/stats").then((r) => r.data);
export const getClients = () => API.get("/clients").then((r) => r.data.clients);
export const analyzeEmail = (id) => API.post(`/emails/${id}/analyze`).then((r) => r.data);
export const draftReply = (id, tone) => API.post(`/emails/${id}/draft`, { tone }).then((r) => r.data);