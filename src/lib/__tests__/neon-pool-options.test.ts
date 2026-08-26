import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { neonPoolOptions } from "@/lib/prisma";

describe("neon pool options (scale-to-zero)", () => {
  it("closes idle sockets instead of pinning Neon compute", () => {
    expect(neonPoolOptions.max).toBeGreaterThan(0);
    expect(neonPoolOptions.max).toBeLessThanOrEqual(5);
    // pg: idleTimeoutMillis = 0 means never disconnect idle clients
    expect(neonPoolOptions.idleTimeoutMillis).toBeGreaterThan(0);
    expect(neonPoolOptions.idleTimeoutMillis).toBeLessThanOrEqual(30_000);
    expect(neonPoolOptions.allowExitOnIdle).toBe(true);
  });

  it("uses the Neon adapter and does not print connection strings", () => {
    const src = readFileSync(
      path.join(__dirname, "..", "prisma.ts"),
      "utf8"
    );
    expect(src).toContain("PrismaNeon");
    expect(src).toContain("@neondatabase/serverless");
    expect(src).toContain("poolQueryViaFetch");
    expect(src).not.toMatch(
      /console\.(log|info|debug|warn|error)\([^)]*DATABASE_URL/
    );
    expect(src).not.toMatch(/postgresql:\/\//);
  });
});
