/**
 * The single source of truth for "who can see which emails".
 * Spread it into EVERY Email query, including findOne by id:
 *   Email.findOne({ _id: id, ...scopeFor(req.user) })
 */
export const scopeFor = (user) =>
  user.role === "assistant" ? { assistant: user._id } : { client: user._id };

export const isId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");