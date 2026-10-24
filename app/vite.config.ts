import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { roomHandler, type RoomConfig } from "./server/room.ts";

/**
 * Reson8 speech-to-text needs a short-lived browser token minted with the secret key.
 * This dev-server route does that, so RESON8_API_KEY (in .env.local) never reaches the page.
 * GET /api/reson8-token → { access_token, expires_in } or 503 when no key is set.
 */
function reson8Token(key: string | undefined): Plugin {
  return {
    name: "reson8-token",
    configureServer(server) {
      server.middlewares.use("/api/reson8-token", async (_req, res) => {
        res.setHeader("content-type", "application/json");
        if (!key) {
          res.statusCode = 503;
          return res.end(JSON.stringify({ error: "RESON8_API_KEY is not set" }));
        }
        try {
          const r = await fetch("https://api.reson8.dev/v1/auth/token", { method: "POST", headers: { Authorization: `ApiKey ${key}` }, signal: AbortSignal.timeout(8000) });
          res.statusCode = r.status;
          res.end(await r.text());
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

/** The listener (Claude Haiku 5.5 + the MCP tools) at /api/room; see server/room.ts. */
function room(cfg: RoomConfig): Plugin {
  return {
    name: "spelunk-room",
    configureServer(server) {
      server.middlewares.use("/api/room", roomHandler(cfg));
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Server-side only: none of these reach the page. The page talks to /api/* on its own origin.
  const cfg: RoomConfig = {
    anthropicKey: env.ANTHROPIC_API_KEY || undefined,
    mcpUrl: env.SPELUNK_MCP_URL || "http://127.0.0.1:8788",
    graphUrl: env.SPELUNK_GRAPH_URL || "http://127.0.0.1:18790",
    repo: env.SPELUNK_REPO || "rust-agent-framework",
  };
  return {
    plugins: [react(), tailwindcss(), reson8Token(env.RESON8_API_KEY), room(cfg)],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    define: { __SPELUNK_REPO__: JSON.stringify(cfg.repo) },
    server: {
      proxy: {
        // Graph views and symbol bodies from repo-graph-api.
        "/api/graph": { target: cfg.graphUrl, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/graph/, "/api/v1") },
        // Handoffs live on the MCP server, so the team's coding agent reads the same documents.
        "/api/handoffs": { target: cfg.mcpUrl, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/handoffs/, "/handoffs") },
      },
    },
  };
});
