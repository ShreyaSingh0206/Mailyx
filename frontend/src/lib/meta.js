// Labels depend on who is looking at the screen.
//   amber = the viewer has to act, white = the other person has to act, green = nobody needs to reply.
const SHORT = {
  assistant: { assistant_reply: "You", client_reply: "Client", no_reply: "No reply" },
  client: { assistant_reply: "Assistant", client_reply: "You", no_reply: "No reply" },
};
const LONG = {
  assistant: { assistant_reply: "You to reply", client_reply: "Client to reply", no_reply: "No reply needed" },
  client: { assistant_reply: "Assistant to reply", client_reply: "You to reply", no_reply: "No reply needed" },
};
const TONE = {
  assistant: { assistant_reply: "amber", client_reply: "white", no_reply: "green" },
  client: { assistant_reply: "white", client_reply: "amber", no_reply: "green" },
};

export const CLASSES = ["assistant_reply", "client_reply", "no_reply"];
export const classShort = (value, viewer = "assistant") => SHORT[viewer]?.[value];
export const classLong = (value, viewer = "assistant") => LONG[viewer]?.[value];
export const classTone = (value, viewer = "assistant") => TONE[viewer]?.[value];

export const LABEL_META = {
  important: "Important",
  meeting: "Meeting",
  waiting: "Waiting",
  follow_up: "Follow-up",
};

export const LABELS = Object.keys(LABEL_META);
export const TONES = ["professional", "friendly", "concise", "formal"];

export const providerName = (p) => ({ seed: "Demo data", gemini: "Gemini", groq: "Groq" })[p] || p || "AI";