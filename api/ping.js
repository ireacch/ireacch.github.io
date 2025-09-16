// /api/ping.js — Edge runtime + loud CORS + runtime breadcrumb
export const config = { runtime: "edge" };

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "*";
  const acrh = req.headers.get("access-control-request-headers") || "Content-Type, Authorization";
  return {
    "Access-Control-Allow-Origin": origin,          // reflect or "*" when no Origin
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Debug-Edge": "true"                          // breadcrumb to confirm edge code ran
  };
}

export default async function handler(req) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      runtime: "edge",
      sawOrigin: req.headers.get("origin") || null,
      method: req.method
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}
