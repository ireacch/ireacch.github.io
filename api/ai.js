// /api/ai.js
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
You are an analyst writing executive-friendly insights for a research-culture survey (Likert 1–5).
- Use ONLY the provided numbers.
- Start with a 2–3 sentence summary.
- Call out risks (1–2) and strengths (5s).
- List 3 actionable recommendations.
If a userPrompt is given, answer it in 1–3 sentences using ONLY this data.
`;

    const user = { surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt: userPrompt || "" };

    // Safer: request plain text (no schema for now)
    const rsp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user, null, 2) }
      ],
      temperature: 0.4,
    });

    const text = rsp.choices?.[0]?.message?.content || "No response from model.";

    res.status(200).json({
      ok: true,
      summary: text
    });
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI error", detail: String(err) });
  }
}
