/**
 * Server-side Ship to GitHub for sealed GrokForge packages.
 * Phase 1: founder/admin token (GITHUB_PUBLISH_TOKEN) pushes under GITHUB_PUBLISH_ORG.
 * Never logs the token. No user xAI keys involved.
 */
import {
  sanitizePathSegment,
  type PackageFile,
} from "@/lib/seal-package";

export type GitHubPublishConfig = {
  token: string;
  org: string;
  /** Default true - public repos only for sealed open packages */
  privateRepo?: boolean;
};

export type PublishRepoInput = {
  /** Desired repo name (will be sanitized) */
  repoName: string;
  description: string;
  homepage: string;
  topics: string[];
  files: PackageFile[];
  /** If repo exists, replace main branch contents */
  allowUpdate?: boolean;
  licenseSpdx?: string;
};

export type PublishRepoResult =
  | {
      ok: true;
      owner: string;
      repo: string;
      htmlUrl: string;
      cloneUrl: string;
      fullName: string;
      created: boolean;
      commitSha: string;
    }
  | { error: string; status?: number };

const GH_API = "https://api.github.com";

export function githubPublishConfigured(): boolean {
  return Boolean(getPublishToken() && getPublishOrg());
}

export function getPublishToken(): string {
  return (
    process.env.GITHUB_PUBLISH_TOKEN ||
    process.env.GROKFORGE_GITHUB_TOKEN ||
    process.env.GH_PUBLISH_TOKEN ||
    ""
  ).trim();
}

export function getPublishOrg(): string {
  return (
    process.env.GITHUB_PUBLISH_ORG ||
    process.env.GROKFORGE_GITHUB_ORG ||
    "Pitchfork-and-Torch"
  ).trim();
}

/** GitHub-safe repo name from GrokForge slug */
export function repoNameFromSlug(slug: string): string {
  let name = sanitizePathSegment(slug, 90);
  // GitHub: max 100, no leading/trailing dots/hyphens quirks
  name = name.replace(/^\.+|\.+$/g, "").replace(/^-+|-+$/g, "") || "grokforge-package";
  if (name.length < 2) name = `gf-${name}`;
  return name.slice(0, 100);
}

export function defaultTopics(category?: string | null): string[] {
  const base = [
    "grokforge",
    "forged-on-grokforge",
    "public-goods",
    "open-source",
    "multi-agent",
  ];
  const cat = (category || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (cat && cat.length >= 2 && cat.length <= 50) base.push(cat);
  return [...new Set(base)].slice(0, 20);
}

export function defaultRepoDescription(
  title: string,
  sealNote: string
): string {
  const note = sealNote.replace(/\s+/g, " ").trim().slice(0, 200);
  const head = `Forged on GrokForge: ${title}`.slice(0, 120);
  if (!note) return head.slice(0, 350);
  const combined = `${head}. ${note}`;
  return combined.slice(0, 350);
}

async function ghJson<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GrokForge-ShipToGitHub/1.0",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text.slice(0, 300) };
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: string }).message)
        : `GitHub API ${res.status}`;
    return { ok: false, status: res.status, message: msg.slice(0, 400) };
  }
  return { ok: true, data: data as T, status: res.status };
}

/**
 * Create (or update) a public repo under the publish org and commit package files to main.
 */
export async function publishPackageToGitHub(
  config: GitHubPublishConfig,
  input: PublishRepoInput
): Promise<PublishRepoResult> {
  const owner = config.org.replace(/^@/, "");
  const repo = repoNameFromSlug(input.repoName);
  if (!config.token) return { error: "GitHub publish token not configured" };
  if (!owner) return { error: "GitHub publish org not configured" };
  if (!input.files.length) return { error: "No package files to publish" };

  // 1) Does repo exist?
  let created = false;
  const existing = await ghJson<{
    html_url: string;
    clone_url: string;
    full_name: string;
    default_branch?: string;
  }>(config.token, `/repos/${owner}/${repo}`);

  if (!existing.ok) {
    if (existing.status !== 404) {
      return { error: existing.message, status: existing.status };
    }
    // Create
    const createdRes = await ghJson<{
      html_url: string;
      clone_url: string;
      full_name: string;
    }>(config.token, `/orgs/${owner}/repos`, {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        description: input.description.slice(0, 350),
        homepage: input.homepage.slice(0, 255),
        private: Boolean(config.privateRepo),
        has_issues: true,
        has_projects: false,
        has_wiki: false,
        // auto_init so the repo is not empty (Git Data API rejects blobs on empty repos)
        auto_init: true,
      }),
    });
    if (!createdRes.ok) {
      // Fallback: user-owned if org create fails (token is personal without org perms)
      const userCreate = await ghJson<{
        html_url: string;
        clone_url: string;
        full_name: string;
      }>(config.token, `/user/repos`, {
        method: "POST",
        body: JSON.stringify({
          name: repo,
          description: input.description.slice(0, 350),
          homepage: input.homepage.slice(0, 255),
          private: Boolean(config.privateRepo),
          has_issues: true,
          has_projects: false,
          has_wiki: false,
          auto_init: true,
        }),
      });
      if (!userCreate.ok) {
        return {
          error: `Create repo failed: ${createdRes.message} (user fallback: ${userCreate.message})`,
          status: userCreate.status,
        };
      }
      created = true;
      // owner may be the user login - parse full_name
      const full = userCreate.data.full_name;
      const realOwner = full.split("/")[0] || owner;
      return commitTreeAndMeta(config.token, realOwner, repo, input, created, userCreate.data);
    }
    created = true;
    return commitTreeAndMeta(
      config.token,
      owner,
      repo,
      input,
      created,
      createdRes.data
    );
  }

  if (!input.allowUpdate && existing.ok) {
    // Still allow content update for re-seal - default allowUpdate true for sealed packages
  }

  // Update description/homepage
  await ghJson(config.token, `/repos/${owner}/${repo}`, {
    method: "PATCH",
    body: JSON.stringify({
      description: input.description.slice(0, 350),
      homepage: input.homepage.slice(0, 255),
    }),
  });

  return commitTreeAndMeta(
    config.token,
    owner,
    repo,
    input,
    false,
    existing.data
  );
}

/**
 * GitHub rejects POST /git/blobs on completely empty repos ("Git Repository is empty").
 * Contents API can create the first commit; auto_init also helps for new repos.
 */
async function ensureRepoHasGitData(
  token: string,
  owner: string,
  repo: string
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const hasMain = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/main`
  );
  if (hasMain.ok) return { ok: true };
  const hasMaster = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/master`
  );
  if (hasMaster.ok) return { ok: true };

  // Bootstrap first commit via Contents API (works when Git Data API does not)
  const boot = await ghJson<{ content?: { sha?: string } }>(
    token,
    `/repos/${owner}/${repo}/contents/README.md`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: "chore: bootstrap empty repo for GrokForge ship",
        content: Buffer.from(
          `# ${repo}\n\nBootstrapped by GrokForge Ship to GitHub. Package commit follows.\n`,
          "utf8"
        ).toString("base64"),
      }),
    }
  );
  if (!boot.ok) {
    // Race: another process initialized, or file already exists
    if (boot.status === 422 || boot.status === 409) {
      await sleep(800);
      return { ok: true };
    }
    return {
      ok: false,
      error: `Bootstrap empty repo: ${boot.message}`,
      status: boot.status,
    };
  }

  // GitHub is eventually consistent after create/bootstrap
  for (let i = 0; i < 6; i++) {
    await sleep(400 + i * 200);
    const again = await ghJson<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/main`
    );
    if (again.ok) return { ok: true };
    const m = await ghJson<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/master`
    );
    if (m.ok) return { ok: true };
  }
  return { ok: true };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createBlobWithRetry(
  token: string,
  owner: string,
  repo: string,
  content: string,
  path: string
): Promise<
  | { ok: true; sha: string }
  | { ok: false; message: string; status?: number }
> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const blob = await ghJson<{ sha: string }>(
      token,
      `/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(content, "utf8").toString("base64"),
          encoding: "base64",
        }),
      }
    );
    if (blob.ok) return { ok: true, sha: blob.data.sha };
    const empty =
      /git repository is empty/i.test(blob.message) || blob.status === 409;
    if (empty && attempt < 2) {
      const boot = await ensureRepoHasGitData(token, owner, repo);
      if (!boot.ok) {
        return { ok: false, message: boot.error, status: boot.status };
      }
      await sleep(500 * (attempt + 1));
      continue;
    }
    return { ok: false, message: blob.message, status: blob.status };
  }
  return { ok: false, message: `Blob ${path}: retries exhausted` };
}

async function commitTreeAndMeta(
  token: string,
  owner: string,
  repo: string,
  input: PublishRepoInput,
  created: boolean,
  repoMeta: { html_url: string; clone_url: string; full_name: string }
): Promise<PublishRepoResult> {
  // New or previously empty repos must have at least one commit before blobs
  if (created) {
    await sleep(600);
  }
  const ready = await ensureRepoHasGitData(token, owner, repo);
  if (!ready.ok) {
    return { error: ready.error, status: ready.status };
  }

  // Create blobs
  const treeItems: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }[] = [];

  for (const f of input.files) {
    const path = f.path.replace(/\\/g, "/").replace(/^\//, "");
    if (!path || path.includes("..")) continue;
    const blob = await createBlobWithRetry(
      token,
      owner,
      repo,
      f.content,
      path
    );
    if (!blob.ok) {
      return {
        error: `Blob ${path}: ${blob.message}`,
        status: blob.status,
      };
    }
    treeItems.push({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  if (!treeItems.length) return { error: "No valid files after path filter" };

  const tree = await ghJson<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ tree: treeItems }),
    }
  );
  if (!tree.ok) return { error: `Tree: ${tree.message}`, status: tree.status };

  // Parent commit if main exists
  let parents: string[] = [];
  const ref = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/main`
  );
  if (ref.ok) {
    parents = [ref.data.object.sha];
  } else {
    // try master
    const refM = await ghJson<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/master`
    );
    if (refM.ok) parents = [refM.data.object.sha];
  }

  const commitMsg = parents.length
    ? `chore: refresh sealed package from GrokForge\n\nForged on GrokForge - https://grokforge.app`
    : `feat: initial sealed package from GrokForge\n\nForged on GrokForge - https://grokforge.app`;

  const commit = await ghJson<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: commitMsg,
        tree: tree.data.sha,
        parents,
      }),
    }
  );
  if (!commit.ok) {
    return { error: `Commit: ${commit.message}`, status: commit.status };
  }

  if (parents.length && ref.ok) {
    const upd = await ghJson(token, `/repos/${owner}/${repo}/git/refs/heads/main`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.data.sha, force: true }),
    });
    if (!upd.ok) {
      return { error: `Update ref: ${upd.message}`, status: upd.status };
    }
  } else if (parents.length) {
    const upd = await ghJson(
      token,
      `/repos/${owner}/${repo}/git/refs/heads/master`,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.data.sha, force: true }),
      }
    );
    if (!upd.ok) {
      return { error: `Update ref: ${upd.message}`, status: upd.status };
    }
  } else {
    const createRef = await ghJson(token, `/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: "refs/heads/main",
        sha: commit.data.sha,
      }),
    });
    if (!createRef.ok) {
      return {
        error: `Create main branch: ${createRef.message}`,
        status: createRef.status,
      };
    }
  }

  // Topics
  if (input.topics.length) {
    await ghJson(token, `/repos/${owner}/${repo}/topics`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github.mercy-preview+json",
      },
      body: JSON.stringify({
        names: input.topics
          .map((t) =>
            t
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")
          )
          .filter((t) => t.length >= 1 && t.length <= 50)
          .slice(0, 20),
      }),
    });
  }

  return {
    ok: true,
    owner,
    repo,
    htmlUrl: repoMeta.html_url || `https://github.com/${owner}/${repo}`,
    cloneUrl: repoMeta.clone_url || `https://github.com/${owner}/${repo}.git`,
    fullName: repoMeta.full_name || `${owner}/${repo}`,
    created,
    commitSha: commit.data.sha,
  };
}
