// /api/ping.js — Edge Function (Web API) with CORS that handles OPTIONS
export const config = { runtime: "edge" };

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "*";
  const acrh = req.headers.get("access-control-request-headers") || "Content-Type, Authorization";
  return {
    "Access-Control-Allow-Origin": origin,     // reflect for testing; you can pin to https://ireacch.github.io
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Max-Age": "86400"
  };
}

export default async function handler(req) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use GET/POST" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, msg: "pong" }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}
