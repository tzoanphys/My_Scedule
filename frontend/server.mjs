import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = 1989;
const listenHost = "::";
const apiHost = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("The page build is missing. From the frontend folder, run: npm run build");
  process.exit(1);
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

function proxy(req, res) {
  const upstream = http.request(
    {
      hostname: apiHost,
      port: 8089,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${apiHost}:8089` },
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on("error", () => {
    send(res, 502, JSON.stringify({ error: "The planner is still starting." }), "application/json");
  });
  req.pipe(upstream);
}

function serve(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/api/")) {
    proxy(req, res);
    return;
  }

  const decoded = decodeURIComponent(url.pathname);
  const requested = path.resolve(root, `.${decoded}`);
  const relative = path.relative(root, requested);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    send(res, 403, "Forbidden");
    return;
  }

  let file = requested;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(decoded)) {
      send(res, 404, "Not found");
      return;
    }
    file = path.join(root, "index.html");
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=604800",
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    serve(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(res, 400, "Bad request");
  }
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") process.exit(0);
  console.error(error);
  process.exit(1);
});
server.listen({ port, host: listenHost, ipv6Only: false }, () => {
  console.log(`Weekly Orbit Planner at http://localhost:${port}`);
});
