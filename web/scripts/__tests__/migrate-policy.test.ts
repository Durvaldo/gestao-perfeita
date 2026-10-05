import { describe, expect, it } from "vitest";
import { shouldMigrateOnBuild } from "../migrate-policy";

describe("shouldMigrateOnBuild", () => {
  it("migrates on production deploys", () => {
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("does not migrate on preview deploys, which share the homolog database", () => {
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("does not migrate outside Vercel", () => {
    expect(shouldMigrateOnBuild({})).toBe(false);
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "development" })).toBe(false);
  });
});
