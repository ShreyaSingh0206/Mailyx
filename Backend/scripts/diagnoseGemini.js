// Figures out why Gemini fails on your machine:  node scripts/diagnoseGemini.js
//  1. lists the model names your key can actually use
//  2. sends a tiny request with a LONG timeout (90s) and prints how long it takes
//  3. tries the "thinking" settings that make newer models faster
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
if (!key) {
  console.error("GEMINI_API_KEY is missing in Backend/.env");
  process.exit(1);
}

const timed = async (label, fn) => {
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`${label}: ${Date.now() - t}ms  ${out}`);
  } catch (e) {
    const why = e.name === "TimeoutError" ? "TIMED OUT" : `${e.name}: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ""}`;
    console.log(`${label}: ${Date.now() - t}ms  FAILED -> ${why}`);
  }
};

console.log(`Using GEMINI_MODEL=${model}\n`);

// 1. which models can this key use?
await timed("1. list models", async () => {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 150)}`);
  const { models = [] } = await res.json();
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini/i.test(m.name))
    .map((m) => m.name.replace("models/", ""));
  console.log(`\n   Models you can use:\n   ${usable.join("\n   ")}\n`);
  return usable.includes(model) ? `(your model "${model}" is in the list)` : `WARNING: "${model}" is NOT in the list, change GEMINI_MODEL`;
});

// 2 + 3. one tiny request per thinking setting
const variants = [
  ["default settings", {}],
  ['thinkingBudget: 0', { thinkingConfig: { thinkingBudget: 0 } }],
  ['thinkingLevel: "minimal"', { thinkingConfig: { thinkingLevel: "minimal" } }],
  ['thinkingLevel: "low"', { thinkingConfig: { thinkingLevel: "low" } }],
];

for (const [name, extra] of variants) {
  await timed(`2. ${name}`.padEnd(34), async () => {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Return JSON: {"ok": true}' }] }],
        generationConfig: { responseMimeType: "application/json", ...extra },
      }),
      signal: AbortSignal.timeout(90000),
    });
    const body = await res.text();
    if (!res.ok) return `HTTP ${res.status} ${body.replace(/\s+/g, " ").slice(0, 140)}`;
    return `HTTP 200 OK`;
  });
}

console.log(`
How to read this:
 - A line that says HTTP 200 in a few seconds -> put that setting in .env, e.g. GEMINI_THINKING={"thinkingBudget":0}
 - Everything 200 but slow (over ~20s)       -> raise LLM_TIMEOUT_MS=60000, or make groq the first provider
 - Everything TIMED OUT / fetch failed       -> network problem from your PC (see the IPv4 / VPN tips)
 - HTTP 404 / 400                            -> wrong model name or unsupported setting`);