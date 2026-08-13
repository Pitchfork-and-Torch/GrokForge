/**
 * Validate linked GitHub repos for sealed ships (topics, license, forge badge).
 */

export type GitHubLinkCheck = {
  ok: boolean;
  fullName?: string;
  htmlUrl?: string;
  issues: string[];
  warnings: string[];
};

export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = url.trim();
    const m =
      u.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i) ||
      u.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (!m) return null;
    const owner = m[1];
    const repo = m[2].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export async function validateGithubRepoLink(
  urlOrFullName: string
): Promise<GitHubLinkCheck> {
  const parsed = parseGithubRepoUrl(urlOrFullName);
  if (!parsed) {
    return { ok: false, issues: ["Not a valid owner/repo or github.com URL"], warnings: [] };
  }
  const fullName = `${parsed.owner}/${parsed.repo}`;
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "GrokForge-LinkValidate/1.0",
      },
      next: { revalidate: 120 },
    });
    if (res.status === 404) {
      return { ok: false, fullName, issues: ["Repository not found or private"], warnings };
    }
    if (!res.ok) {
      return {
        ok: false,
        fullName,
        issues: [`GitHub API ${res.status}`],
        warnings,
      };
    }
    const data = (await res.json()) as {
      html_url: string;
      private: boolean;
      description?: string | null;
      license?: { spdx_id?: string } | null;
      topics?: string[];
    };
    if (data.private) issues.push("Repository is private (sealed packages should be public)");
    if (!data.license?.spdx_id || data.license.spdx_id === "NOASSERTION") {
      warnings.push("No SPDX license detected on GitHub");
    }
    const topics = data.topics || [];
    if (!topics.includes("grokforge") && !topics.includes("forged-on-grokforge")) {
      warnings.push("Missing recommended topics: grokforge, forged-on-grokforge");
    }
    const desc = (data.description || "").toLowerCase();
    if (!desc.includes("grokforge") && !desc.includes("forged on")) {
      warnings.push("Description does not mention GrokForge (recommended credit)");
    }
    return {
      ok: issues.length === 0,
      fullName,
      htmlUrl: data.html_url,
      issues,
      warnings,
    };
  } catch (e) {
    return {
      ok: false,
      fullName,
      issues: [e instanceof Error ? e.message.slice(0, 200) : "Validate failed"],
      warnings,
    };
  }
}
