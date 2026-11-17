import API from "./api";

const data = (p) => p.then((r) => r.data);

// ---- shared
export const getCounts = () => data(API.get("/emails/counts")).then((d) => d.counts);
export const getEmail = (id) => data(API.get(`/emails/${id}`)).then((d) => d.email);
export const markHandled = (id, body = {}) => data(API.patch(`/emails/${id}/handled`, body));
export const addNote = (id, text) => data(API.post(`/emails/${id}/notes`, { text }));

// ---- assistant
export const getClients = () => data(API.get("/clients")).then((d) => d.clients);
export const linkClient = (email) => data(API.post("/clients/link", { email }));
export const syncClient = (id, provider) => data(API.post(`/clients/${id}/sync`, provider ? { provider } : {}));
export const listEmails = (params) => data(API.get("/emails", { params }));
export const analyzeEmail = (id, force = false) =>
  data(API.post(`/emails/${id}/analyze`, null, { params: force ? { force: true } : {} }));
// can take minutes (one AI call per email), so no timeout
export const analyzePending = (retryFailed = true) =>
  data(API.post("/emails/analyze-pending", null, { params: retryFailed ? { retryFailed: true } : {}, timeout: 0 }));
export const updateClassification = (id, body) => data(API.patch(`/emails/${id}/classification`, body));
export const saveDraft = (id, body) => data(API.put(`/emails/${id}/draft`, body));
export const generateDraft = (id, body) => data(API.post(`/emails/${id}/draft/generate`, body));
export const sendReply = (id, body) => data(API.post(`/emails/${id}/send`, body));
export const askAI = (id, question) => data(API.post(`/emails/${id}/ask`, { question }));

// ---- client
export const listMyEmails = (tab) => data(API.get("/emails/mine", { params: { tab } }));
export const requestTakeover = (id, note) => data(API.post(`/emails/${id}/takeover`, { note }));