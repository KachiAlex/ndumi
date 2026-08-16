import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", proxy: "gemini" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const path = req.query.path as string[];
  const endpoint = path.join("/");
  const targetUrl = `${GEMINI_BASE}/${endpoint}?key=${API_KEY}`;

  try {
    const body = JSON.stringify(req.body);
    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await resp.text();
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (err) {
    console.error("[gemini-proxy] Error:", err);
    res.status(502).json({ error: "Proxy request failed" });
  }
}
