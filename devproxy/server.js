import http from "node:http";

const PORT = process.env.PORT || 8787;
// Origin(s) allowed to call this proxy. Nuxt dev server default port is 3000.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function buildUrl(rawUrl, params) {
  const url = new URL(rawUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    }
  }
  return url;
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/proxy") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. POST to /proxy with a JSON body." }));
    return;
  }

  try {
    const raw = await readBody(req);
    const { url, method = "GET", headers = {}, params, body } = JSON.parse(raw);

    if (!url) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'url' in request body." }));
      return;
    }

    const targetUrl = buildUrl(url, params);

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
    });

    const text = await upstream.text();
    const responseHeaders = Object.fromEntries(upstream.headers.entries());

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: upstream.status,
        headers: responseHeaders,
        data: text,
      })
    );
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err && err.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`VueTube dev proxy listening on http://localhost:${PORT}`);
});
