const timeoutMs = () => Number(process.env.LLM_TIMEOUT_MS) || 25000;

const config = () => ({
  gemini: {
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  },
  groq: {
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** POST JSON with a timeout and one short retry on 429/503. */
async function postJSON(url, headers, body, label) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs()),
    });

    if (res.ok) return res.json();

    if ((res.status === 429 || res.status === 503) && attempt === 0) {
      const retryAfter = Number(res.headers.get("retry-after")) * 1000;
      await sleep(Math.min(retryAfter || 1000, 3000));
      continue;
    }

    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`${label} HTTP ${res.status} ${detail}`.trim());
  }
}

// JSON mode on OpenAI-style APIs expects the word "JSON" in the prompt
const withJsonHint = (system) => (/json/i.test(system) ? system : `${system}\nRespond with valid JSON only.`);

// Optional: tame "thinking" latency on newer Gemini models, e.g. in .env
//   GEMINI_THINKING={"thinkingBudget":0}        (2.5-style models)
//   GEMINI_THINKING={"thinkingLevel":"minimal"} (3-style models)
// Run `node scripts/diagnoseGemini.js` to see which form your model accepts.
function geminiThinking() {
  const raw = process.env.GEMINI_THINKING;
  if (!raw) return {};
  try {
    return { thinkingConfig: JSON.parse(raw) };
  } catch {
    console.warn("[llm] GEMINI_THINKING is not valid JSON, ignoring it");
    return {};
  }
}

// ---------------------------------------------------------------- Gemini
async function callGemini(system, prompt) {
  const { key, model } = config().gemini;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const data = await postJSON(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { "x-goog-api-key": key },
    {
      systemInstruction: { parts: [{ text: withJsonHint(system) }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        ...geminiThinking(),
      },
    },
    "Gemini"
  );

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("");
  if (!text) throw new Error(`Gemini returned no text (${candidate?.finishReason || data.promptFeedback?.blockReason || "unknown"})`);
  return { text, model };
}

// ---------------------------------------------------------------- Groq (OpenAI-compatible)
async function callGroq(system, prompt) {
  const { key, model } = config().groq;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const data = await postJSON(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${key}` },
    {
      model,
      messages: [
        { role: "system", content: withJsonHint(system) },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    },
    "Groq"
  );

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return { text, model };
}

const PROVIDERS = { gemini: callGemini, groq: callGroq };

/** Parse model output; tolerate ```json fences or stray text around the object. */
function parseJSON(text) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Response was not valid JSON");
    return JSON.parse(match[0]);
  }
}

export class LLMError extends Error {
  constructor(attempts) {
    super(`All LLM providers failed: ${attempts.join(" | ")}`);
    this.name = "LLMError";
    this.attempts = attempts;
  }
}

/**
 * Ask the LLM for a JSON object. Tries providers in order; a network error,
 * rate limit, timeout, blocked response or invalid JSON all trigger the next one.
 * @returns {{ data: object, provider: "gemini"|"groq", model: string }}
 */
export async function generateJSON(system, prompt) {
  const order = (process.env.LLM_PROVIDER_ORDER || "gemini,groq")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((name) => PROVIDERS[name]);

  const attempts = [];
  for (const name of order) {
    const started = Date.now();
    try {
      const { text, model } = await PROVIDERS[name](system, prompt);
      const data = parseJSON(text);
      if (process.env.LLM_DEBUG) console.log(`[llm] ${name} (${model}) ok in ${Date.now() - started}ms`);
      return { data, provider: name, model };
    } catch (err) {
      const ms = Date.now() - started;
      const reason = err.name === "TimeoutError" ? `timed out after ${ms}ms` : `${err.message} (${ms}ms)`;
      attempts.push(`${name}: ${reason}`);
      console.warn(`[llm] ${name} failed -> ${reason}`);
    }
  }
  throw new LLMError(attempts);
}