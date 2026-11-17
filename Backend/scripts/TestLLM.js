// Quick check that your API keys work:  node scripts/testLLM.js
// Add --force-groq to skip Gemini and test only the backup.
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { generateJSON } from "../services/llm.js";
 
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
if (process.argv.includes("--force-groq")) process.env.LLM_PROVIDER_ORDER = "groq";
 
try {
  const out = await generateJSON(
    'Return ONLY JSON: {"classification": "assistant_reply" | "client_reply" | "no_reply", "reason": string}',
    "Email: 'Please review the attached proposal and confirm your approval by tomorrow.' Who should reply: the assistant or the client?"
  );
  console.log(`OK via ${out.provider} (${out.model})`);
  console.log(out.data);
} catch (err) {
  console.error("FAILED:", err.message);
  process.exitCode = 1;
}