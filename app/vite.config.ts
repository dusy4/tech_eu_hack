import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";

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
          const r = await fetch("https://api.reson8.dev/v1/auth/token", { method: "POST", headers: { Authorization: `ApiKey ${key}` } });
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), reson8Token(env.RESON8_API_KEY)],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  };
});
