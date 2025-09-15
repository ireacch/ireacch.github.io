// /api/ai.js — Vercel Serverless Function
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt } = req.body || {};
    if (!surveyTitle || !kpis || !distribution) {
      return res.status(400).json({ error: "Missing surveyTitle/kpis/distribution" });
    }

    const sys = `
You are an analyst writing brief, executive-friendly insights for a research culture survey (Likert 1–5, 4–5 positive).
- 2–3 sentence summary using the exact numbers provided.
- Call out risks (many 1–2) and strengths (many 5s).
- Then 3 concise, actionable recommendations.
- No invented numbers or trends; no fluff.
`;

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
              risks: { type: "array", items: { type: "string" } },
              actions: { type: "array", items: { type: "string" } }
            },
            required: ["summary", "actions"]
          }
        }
      }
    });

    const text = rsp.output?.[0]?.content?.[0]?.text ?? "{}";
    const data = JSON.parse(text);

    res.status(200).json({
      ok: true,
      summary: data.summary || "",
      actions: data.actions || [],
      risks: data.risks || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error", detail: String(err?.message || err) });
  }
}
