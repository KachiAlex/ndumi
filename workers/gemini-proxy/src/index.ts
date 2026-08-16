export interface Env {
  GEMINI_API_KEY: string;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", proxy: "gemini" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const path = url.pathname;
    const targetUrl = `${GEMINI_BASE}${path}?key=${env.GEMINI_API_KEY}`;

    const body = await request.text();

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const respBody = await resp.text();

    return new Response(respBody, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
