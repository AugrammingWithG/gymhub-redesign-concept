// Zero-dependency static server for local preview: `npm run dev`
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT) || 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, url));
  if (!file.startsWith(root) || file.includes(`${root}\\.`) || file.includes(`${root}/.`)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

// Another app may already own the port; step up to the next free one.
function listen(p) {
  server.once("error", (err) => {
    server.removeAllListeners("listening");
    if (err.code === "EADDRINUSE" && p < port + 20) listen(p + 1);
    else throw err;
  });
  server.once("listening", () => {
    const actual = server.address().port;
    console.log(`GymHub concept running at http://localhost:${actual}`);
    console.log(`Pitch notes on:            http://localhost:${actual}/?notes=1`);
  });
  server.listen(p);
}
listen(port);
