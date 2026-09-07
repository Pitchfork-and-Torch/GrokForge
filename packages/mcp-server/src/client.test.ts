import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_API_BASE,
  buildUrl,
  listTasksQuery,
  loadConfig,
  peekWorkQuery,
  siteOriginFromApiBase,
} from "./client.js";

describe("loadConfig", () => {
  it("defaults to production Agent API and ignores blank token", () => {
    const cfg = loadConfig({} as NodeJS.ProcessEnv);
    assert.equal(cfg.apiBase, DEFAULT_API_BASE);
    assert.equal(cfg.token, undefined);
    assert.equal(cfg.defaultProject, undefined);
  });

  it("trims token and default project; strips trailing slash on API", () => {
    const cfg = loadConfig({
      GROKFORGE_API: "https://example.test/api/v1/",
      GROKFORGE_TOKEN: "  gf_exampletokenvalue  ",
      GROKFORGE_DEFAULT_PROJECT: "  anvil-infinity  ",
    } as NodeJS.ProcessEnv);
    assert.equal(cfg.apiBase, "https://example.test/api/v1");
    assert.equal(cfg.token, "gf_exampletokenvalue");
    assert.equal(cfg.defaultProject, "anvil-infinity");
  });
});

describe("siteOriginFromApiBase", () => {
  it("strips /api/v1 for forge-health", () => {
    assert.equal(siteOriginFromApiBase("https://grokforge.app/api/v1"), "https://grokforge.app");
    assert.equal(siteOriginFromApiBase("https://grokforge.app/api/v1/"), "https://grokforge.app");
  });
});

describe("Agent API query mapping", () => {
  it("peek_work uses `project` (live GET /agent/work), not projectSlug", () => {
    assert.deepEqual(peekWorkQuery("anvil-infinity"), { project: "anvil-infinity" });
    assert.deepEqual(peekWorkQuery(undefined), { project: undefined });
    assert.deepEqual(peekWorkQuery(""), { project: undefined });
    assert.equal("projectSlug" in peekWorkQuery("x"), false);
  });

  it("list_open_leaves uses status/project/limit", () => {
    assert.deepEqual(listTasksQuery({}), { status: "OPEN", project: undefined, limit: 20 });
    assert.deepEqual(listTasksQuery({ project: "civic-toolkit", limit: 5, status: "CLAIMED" }), {
      status: "CLAIMED",
      project: "civic-toolkit",
      limit: 5,
    });
  });

  it("buildUrl drops empty query values and joins Agent API paths", () => {
    const url = buildUrl("https://grokforge.app/api/v1", "/agent/work", peekWorkQuery("anvil-infinity"));
    assert.equal(url, "https://grokforge.app/api/v1/agent/work?project=anvil-infinity");

    const open = buildUrl("https://grokforge.app/api/v1", "/tasks", listTasksQuery({}));
    assert.equal(open, "https://grokforge.app/api/v1/tasks?status=OPEN&limit=20");
    assert.equal(open.includes("project="), false);
  });
});
