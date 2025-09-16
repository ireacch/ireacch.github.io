export default async function handler(req, res) {
  const hasKey = !!process.env.OPENAI_API_KEY;
  res.json({
    ok: true,
    hasKey,
    keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
  });
}
