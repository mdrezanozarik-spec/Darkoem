export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("TARGET_DOMAIN not set", { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    const headers = new Headers();

    let clientIp;

    for (const [key, value] of req.headers) {
      const k = key.toLowerCase();

      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;

      if (k === "x-real-ip") clientIp = value;
      else if (k === "x-forwarded-for") clientIp ||= value;
      else headers.set(key, value);
    }

    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const isBody = req.method !== "GET" && req.method !== "HEAD";

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: isBody ? req.body : undefined,
      redirect: "manual",
    });

    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error(err);
    return new Response("Bad Gateway", { status: 502 });
  }
}
