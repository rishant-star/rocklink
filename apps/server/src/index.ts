// Must be the very first import: config/index.ts reads process.env at
// module-evaluation time (its `config` object is a top-level const),
// so .env has to be loaded before that import below runs, or every
// value silently falls back to its hardcoded default — which was
// exactly the bug (CLIENT_ORIGIN in apps/server/.env was never being
// read, so CORS kept allowing only the localhost fallback).
import "dotenv/config";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config/index.js";
import { healthRoutes } from "./http/health.routes.js";
import { createSocketServer } from "./sockets/index.js";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(healthRoutes);

const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`RockLink server listening on port ${config.port}`);
});
