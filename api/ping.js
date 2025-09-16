// /api/ping.js — minimal CORS sanity check
export default function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = origin || "*"; // allow any origin for this ping
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({ ok: true, msg: "pong" });
}
