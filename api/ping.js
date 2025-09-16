// Edge ping with loud CORS so you can verify headers
export const config = { runtime: "edge" };

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "*"; // reflect for testing
  const acrh = req.headers.get("access-control-request-headers") || "Content-Type, Authorization";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Debug-Edge": "true"
  };
}

export default async function handler(req) {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });
  return new Response(JSON.stringify({ ok: true, runtime: "edge" }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}
