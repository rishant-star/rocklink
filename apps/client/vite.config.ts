import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDirectory = existsSync(resolve(__dirname, "../../certs")) ? "../../certs" : "../../.certs";
const certPath = resolve(__dirname, certDirectory, certDirectory.endsWith("certs") && !certDirectory.endsWith(".certs") ? "localhost.pem" : "rocklink-lan.pem");
const keyPath = resolve(__dirname, certDirectory, certDirectory.endsWith("certs") && !certDirectory.endsWith(".certs") ? "localhost-key.pem" : "rocklink-lan-key.pem");
const https = existsSync(certPath) && existsSync(keyPath)
  ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
  : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  server: {
    host: true,
    port: 5173,
    https,
    proxy: {
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: { output: { manualChunks: { mediapipe: ["@mediapipe/hands"] } } },
  },
});
