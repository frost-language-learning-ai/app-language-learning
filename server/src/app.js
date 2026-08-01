import express from "express";
import { assertRequiredConfig, config } from "./config.js";
import { languageRoutes } from "./routes/languageRoutes.js";
import { setupRoutes } from "./routes/setupRoutes.js";
import { AppError, toHttpError } from "./errors.js";
import { httpLogger, logger } from "./logger.js";
import "./db.js"; // Ensure database is initialized on app startup

const app = express();
app.use(httpLogger);
app.use((req, _res, next) => {
  req.requestId = req.id;
  next();
});

app.use(express.json({ limit: "15mb" }));

app.use((error, req, _res, next) => {
  if (error?.type === "entity.parse.failed") {
    next(new AppError("Malformed JSON body", { status: 400, code: "MALFORMED_JSON" }));
    return;
  }
  next(error);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "language-learning-api" });
});

app.use("/api", languageRoutes);
app.use("/api/setup", setupRoutes);

app.use((req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, { status: 404, code: "NOT_FOUND" }));
});

app.use((error, req, res, _next) => {
  const normalized = toHttpError(error);
  const status = Number(normalized?.status) || 500;
  const body = {
    ok: false,
    error: {
      code: normalized.code || "INTERNAL_ERROR",
      message: normalized.expose ? normalized.message : "Internal server error"
    }
  };

  if (normalized?.details) {
    body.error.details = normalized.details;
  }

  body.error.requestId = req.requestId;

  if (status >= 500) {
    req.log.error({ err: normalized.cause || error, requestId: req.requestId, status }, "Unhandled server error");
  }

  res.status(status).json(body);
});

if (process.env.NODE_ENV !== "test") {
  assertRequiredConfig();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "Language API listening");
  });
}

export default app;
