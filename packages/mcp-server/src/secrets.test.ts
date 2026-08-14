import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNoSecretLeak,
  looksLikeForgePat,
  looksLikeXaiKey,
  redactToken,
} from "./secrets.js";

describe("redactToken", () => {
  it("hides short values", () => {
    assert.equal(redactToken(""), "(empty)");
    assert.equal(redactToken("gf_ab"), "***");
  });

  it("keeps only prefix and suffix", () => {
    const redacted = redactToken("gf_abcdefghijklmnopqrstuvwxyz");
    assert.match(redacted, /^gf_a…wxyz \(len=29\)$/);
    assert.equal(redacted.includes("fghijklmnop"), false);
  });
});

describe("looksLikeXaiKey", () => {
  it("allows clean markdown and gf_ PAT mentions that are too short to be keys", () => {
    assert.equal(looksLikeXaiKey("# Deliverable\nUsed public data only."), false);
    assert.equal(looksLikeXaiKey("Create a Dashboard token (gf_...) and export it."), false);
  });

  it("flags xAI / SuperGrok / sk- material", () => {
    assert.equal(looksLikeXaiKey("XAI_API_KEY=not-a-real-key"), true);
    assert.equal(looksLikeXaiKey("superGrok key goes here"), true);
    assert.equal(looksLikeXaiKey("xai-" + "a".repeat(20)), true);
    assert.equal(looksLikeXaiKey("sk-" + "b".repeat(24)), true);
    assert.equal(looksLikeXaiKey("Bearer sk-" + "c".repeat(24)), true);
  });

  it("does not treat GrokForge PATs as xAI keys", () => {
    const pat = "gf_" + "d".repeat(32);
    assert.equal(looksLikeXaiKey(pat), false);
    assert.equal(looksLikeForgePat(pat), true);
  });
});

describe("assertNoSecretLeak", () => {
  it("allows a normal deliverable", () => {
    assert.doesNotThrow(() =>
      assertNoSecretLeak("## Deliverable\n\nImplemented the leaf against public docs."),
    );
  });

  it("refuses xAI-looking bodies", () => {
    assert.throws(
      () => assertNoSecretLeak("here is xai-" + "e".repeat(20)),
      /xAI \/ model API key/,
    );
  });

  it("refuses raw gf_ PATs in deliverables", () => {
    assert.throws(
      () => assertNoSecretLeak("token gf_" + "f".repeat(24)),
      /gf_ PAT/,
    );
  });
});
