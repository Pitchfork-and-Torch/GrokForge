/**
 * GitHub URL validation + parsing for artifact linking.
 * Full GitHub OAuth is optional (AUTH_GITHUB_ID); public URL linking always works.
 */

const GITHUB_HOST = /^(https?:\/\/)?(www\.)?github\.com\//i;

export function isGitHubUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname === "github.com" || u.hostname === "www.github.com";
  } catch {
    return false;
  }
}

export function normalizeGitHubUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const withProto = t.startsWith("http") ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return null;
    }
    u.hostname = "github.com";
    u.protocol = "https:";
    // strip trailing slash noise
    let path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return null;
    return `https://github.com${path}${u.search || ""}`;
  } catch {
    return null;
  }
}

/** owner/repo from a github.com URL if present */
export function parseGitHubRepo(url: string): string | null {
  const n = normalizeGitHubUrl(url);
  if (!n) return null;
  const path = n.replace(GITHUB_HOST, "").split("/").filter(Boolean);
  if (path.length < 2) return null;
  const owner = path[0];
  const repo = path[1].replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return null;
  }
  return `${owner}/${repo}`;
}

export function githubOAuthConfigured(): boolean {
  return Boolean(
    (process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID || "").trim() &&
      (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET || "").trim()
  );
}

export function titleFromGitHubUrl(url: string): string {
  const repo = parseGitHubRepo(url);
  if (!repo) return "GitHub link";
  const path = url.replace(GITHUB_HOST, "").split("?")[0].split("/").filter(Boolean);
  if (path[2] === "pull" && path[3]) return `${repo}#PR${path[3]}`;
  if (path[2] === "issues" && path[3]) return `${repo}#${path[3]}`;
  if (path[2] === "commit" && path[3]) return `${repo}@${path[3].slice(0, 7)}`;
  if (path[2] === "tree" || path[2] === "blob") return `${repo}/${path.slice(2).join("/")}`;
  return repo;
}
