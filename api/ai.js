// /api/ai.js — Edge Function with robust CORS (no Node SDK)
export const config = { runtime: "edge" };

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "https://ireacch.github.io"; // pin to your GH Pages domain
  const acrh = req.headers.get("access-control-request-headers") || "Content-Type, Authorization";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Max-Age": "86400"
  };
}

export default async function handler(req) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const { surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt } = body || {};

  if (!surveyTitle || !kpis || !distribution) {
    return new Response(JSON.stringify({ error: "Missing surveyTitle/kpis/distribution" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" }
    });
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

  const payload = {
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify({ surveyTitle, kpis, distribution, themes, sampleQuotes, userPrompt: userPrompt || "" }) }
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
            answer:  { type: "string" }
          },
          required: ["summary", "actions"]
        }
      }
    }
  };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const rsp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!rsp.ok) {
      const errTxt = await rsp.text();
      return new Response(JSON.stringify({ error: "OpenAI error", detail: errTxt }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const json = await rsp.json();
    const text = json?.output?.[0]?.content?.[0]?.text ?? "{}";
    let data; try { data = JSON.parse(text); } catch { data = {}; }

    return new Response(JSON.stringify({
      ok: true,
      summary: data.summary || "",
      actions: Array.isArray(data.actions) ? data.actions : [],
      risks: Array.isArray(data.risks) ? data.risks : [],
      answer: data.answer || ""
    }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "AI error", detail: String(e?.message || e) }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
}
