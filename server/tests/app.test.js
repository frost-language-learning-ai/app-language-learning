import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("health endpoint", () => {
  it("returns service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
