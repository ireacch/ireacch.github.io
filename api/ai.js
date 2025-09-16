// /api/ai.js — Vercel Serverless Function
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allowed front-end origins
const ALLOWED_ORIGINS = new Set([
  "https://ireacch.github.io",   // GitHub Pages prod
  "http://localhost:3000",       // local dev
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://ireacch.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin"); // so caches don't mix origins
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // cache preflight for 24h
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    // Preflight: return 200 with CORS headers
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Body may be a string (depending on Vercel config) — handle both
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt } = body;

    if (!surveyTitle || !kpis || !distribution) {
      return res.status(400).json({ error: "Missing surveyTitle/kpis/distribution" });
    }

    const sys = `
You are an analyst writing brief, executive-friendly insights for a research-culture survey (Likert 1–5; 4–5 positive, 1–2 negative, 3 neutral).
Always:
- Use only the numbers provided; do not invent data or trends.
- Start with a 2–3 sentence plain-English summary citing the exact numbers.
- Call out any risks (high 1–2) and strengths (many 5s).
- Then list 3 concise, actionable recommendations.
If a userPrompt is included, answer it directly in 1–3 sentences using ONLY the provided data; if it cannot be answered with the data, say so.
`.trim();

    const user = { surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt: userPrompt || "" };

    const rsp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user) }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "Insight",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              risks:   { type: "array", items: { type: "string" } },
              actions: { type: "array", items: { type: "string" } },
              answer:  { type: "string", description: "Direct answer to userPrompt if provided, else empty" }
            },
            required: ["summary", "actions"]
          }
        }
      }
    });

    const text = rsp?.output?.[0]?.content?.[0]?.text ?? "{}";
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    // Ensure CORS headers are present on the final response too
    applyCors(req, res);
    return res.status(200).json({
      ok: true,
      summary: data.summary || "",
      actions: Array.isArray(data.actions) ? data.actions : [],
      risks: Array.isArray(data.risks) ? data.risks : [],
      answer: data.answer || ""
    });
  } catch (err) {
    console.error(err);
    applyCors(req, res);
    return res.status(500).json({ error: "AI error", detail: String(err?.message || err) });
  }
}
