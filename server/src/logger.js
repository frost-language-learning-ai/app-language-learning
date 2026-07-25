import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info");

export const logger = pino({
  level,
  base: { service: "language-learning-api" },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "token", "apiKey"],
    remove: true
  }
});

export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.trim() ? incoming : randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customSuccessMessage(req, res) {
    return `request completed: ${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `request failed: ${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customProps(req) {
    return { requestId: req.id };
  }
});
