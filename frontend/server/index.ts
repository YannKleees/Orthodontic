import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { router as patientsRouter } from "./routes/patients";
import { router as parComponentsRouter } from "./routes/par-components";
import { router as visitsRouter } from "./routes/visits";
import { router as reportsRouter } from "./routes/reports";
import { router as similarPatientsRouter } from "./routes/similar-patients";
import { router as uploadsRouter } from "./routes/uploads";
import { DATA_DIR }        from "../../backend/config.js";
import path from "path";
export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  // Legacy demo route
  app.get("/api/demo", handleDemo);

  // Main API routes
  app.use("/api/patients", patientsRouter);
  app.use("/api/par-components", parComponentsRouter);
  app.use("/api/visits", visitsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/similar-patients", similarPatientsRouter);
  app.use("/static", express.static(DATA_DIR));

  return app;
}
