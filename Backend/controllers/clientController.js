import User from "../Models/User.js";
import Email from "../Models/Email.js";
import { handle, fail } from "../utils/handle.js";
import { isId } from "../utils/scope.js";
import { analyzePending } from "../services/analysisRunner.js";
import { MOCK_INBOX } from "../services/mockInbox.js";

const PROVIDERS = ["gmail", "outlook"];

// ---------------------------------------------------------------- list my clients (+ open counts)
export const listClients = handle(async (req, res) => {
  const clients = await User.find({ role: "client", managedBy: req.user._id })
    .select("name email emailAccount createdAt")
    .sort({ name: 1 })
    .lean();

  const rows = await Email.aggregate([
    { $match: { assistant: req.user._id, status: "open" } },
    { $group: { _id: { client: "$client", c: "$classification" }, n: { $sum: 1 } } },
  ]);

  const byClient = {};
  for (const { _id, n } of rows) {
    const key = String(_id.client);
    byClient[key] ||= { assistantReply: 0, clientReply: 0, noReply: 0, unclassified: 0 };
    const field = { assistant_reply: "assistantReply", client_reply: "clientReply", no_reply: "noReply" }[_id.c] || "unclassified";
    byClient[key][field] += n;
  }

  res.json({
    success: true,
    clients: clients.map((c) => ({
      ...c,
      counts: byClient[String(c._id)] || { assistantReply: 0, clientReply: 0, noReply: 0, unclassified: 0 },
    })),
  });
});

// ---------------------------------------------------------------- link a signed-up client by email
export const linkClient = handle(async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  if (!email) return fail(res, 400, "Client email is required");

  const client = await User.findOne({ email, role: "client" });
  if (!client) return fail(res, 404, "No client account found with that email. Ask them to sign up first.");

  if (client.managedBy && !client.managedBy.equals(req.user._id)) {
    return fail(res, 409, "This client is already managed by another assistant");
  }

  client.managedBy = req.user._id;
  await client.save();
  res.json({ success: true, client: { _id: client._id, name: client.name, email: client.email } });
});

// ---------------------------------------------------------------- simulated "connect + sync" of a mailbox
export const syncClient = handle(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, "Invalid client id");

  const client = await User.findOne({ _id: req.params.id, role: "client", managedBy: req.user._id });
  if (!client) return fail(res, 404, "Client not found");

  // first sync = "connect account"
  const wanted = req.body?.provider;
  if (wanted && !PROVIDERS.includes(wanted)) return fail(res, 400, "Provider must be gmail or outlook");
  if (!client.emailAccount?.provider || wanted) {
    client.emailAccount = {
      provider: wanted || client.emailAccount?.provider || "gmail",
      address: client.email,
      connectedAt: client.emailAccount?.connectedAt || new Date(),
    };
    await client.save();
  }

  // 3-5 "new" emails arrive
  const count = 3 + Math.floor(Math.random() * 3);
  const picks = [...MOCK_INBOX].sort(() => Math.random() - 0.5).slice(0, count);
  const first = client.name.split(" ")[0];

  const docs = picks.map((t, i) => {
    const [senderName, senderEmail] = t.sender;
    const fill = (s) => s.replaceAll("{{client}}", first).replaceAll("{{sender}}", senderName);
    return {
      assistant: req.user._id,
      client: client._id,
      threadId: `sync_${client._id}_${Date.now()}_${i}`,
      from: { name: senderName, email: senderEmail },
      to: [{ name: client.name, email: client.email }],
      subject: t.subject,
      body: fill(t.body),
      receivedAt: new Date(Date.now() - (5 + Math.random() * 175) * 60000),
      aiStatus: "pending",
    };
  });
  const created = await Email.insertMany(docs);

  // run the AI pipeline in the background; the UI polls /api/emails/counts (aiPending)
  analyzePending({ assistantId: req.user._id, clientId: client._id }).catch((err) =>
    console.error("[sync] background analysis failed:", err.message)
  );

  res.status(201).json({ success: true, created: created.length, emailAccount: client.emailAccount });
});