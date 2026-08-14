/**
 * Thin fetch wrapper for the GrokForge Agent API.
 * Never logs the full GROKFORGE_TOKEN.
 */

import { redactToken } from "./secrets.js";

export const DEFAULT_API_BASE = "https://grokforge.app/api/v1";

export class GrokForgeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly hint?: string;

  constructor(message: string, status: number, body: unknown, hint?: string) {
    super(message);
    this.name = "GrokForgeApiError";
    this.status = status;
    this.body = body;
    this.hint = hint;
  }
}

export interface GrokForgeConfig {
  apiBase: string;
  token?: string;
  defaultProject?: string;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): GrokForgeConfig {
  const apiBase = (env.GROKFORGE_API ?? DEFAULT_API_BASE).replace(/\/+$/, "");
  const token = env.GROKFORGE_TOKEN?.trim() || undefined;
  const defaultProject = env.GROKFORGE_DEFAULT_PROJECT?.trim() || undefined;
  return { apiBase, token, defaultProject };
}

/** Site origin, e.g. https://grokforge.app from https://grokforge.app/api/v1 */
export function siteOriginFromApiBase(apiBase: string): string {
  return apiBase.replace(/\/api\/v1\/?$/i, "") || apiBase;
}

/**
 * GET /agent/work query. Live API reads `project` (slug), not `projectSlug`.
 * See src/app/api/v1/agent/work/route.ts and docs/AGENT-API.md.
 */
export function peekWorkQuery(projectSlug?: string): Record<string, string | undefined> {
  return { project: projectSlug || undefined };
}

/** GET /tasks query. Live API reads `project` (or `slug`) + status + limit. */
export function listTasksQuery(opts: {
  status?: string;
  project?: string;
  limit?: number;
}): Record<string, string | number | undefined> {
  return {
    status: opts.status ?? "OPEN",
    project: opts.project || undefined,
    limit: opts.limit ?? 20,
  };
}

function scopeHint(status: number, body: unknown): string | undefined {
  if (status === 401) {
    return "Unauthorized. Set GROKFORGE_TOKEN to a valid gf_ PAT from the Dashboard.";
  }
  if (status === 403) {
    const err =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "";
    return (
      `Forbidden (missing scope?). ${err}`.trim() +
      " Typical scopes: tasks:read, claims:write, contributions:write."
    );
  }
  if (status === 429) {
    return "Rate limited. Back off and retry with exponential delay (start ~1-5s).";
  }
  return undefined;
}

export type RequestOptions = {
  method?: string;
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  requireAuth?: boolean;
  absoluteUrl?: string;
};

export function buildUrl(
  base: string,
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = path.startsWith("http")
    ? new URL(path)
    : new URL(path.startsWith("/") ? path.slice(1) : path, base.endsWith("/") ? base : `${base}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
  config: GrokForgeConfig = loadConfig(),
): Promise<T> {
  if (options.requireAuth && !config.token) {
    throw new GrokForgeApiError(
      "GROKFORGE_TOKEN is required for this tool. Create a gf_ PAT in the Dashboard.",
      401,
      { error: "missing_token" },
      "Set GROKFORGE_TOKEN in the MCP server env.",
    );
  }

  const url = options.absoluteUrl
    ? buildUrl(options.absoluteUrl, "", options.query)
    : buildUrl(config.apiBase, path, options.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "@grokforge/mcp",
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GrokForgeApiError(
      `Network error talking to GrokForge (${redactToken(config.token ?? "")}): ${msg}`,
      0,
      { error: "network_error", message: msg },
      "Check connectivity and GROKFORGE_API.",
    );
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { raw: text.slice(0, 2000) };
    }
  }

  if (!response.ok) {
    const hint = scopeHint(response.status, parsed);
    const errMsg =
      parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new GrokForgeApiError(`GrokForge API error: ${errMsg}`, response.status, parsed, hint);
  }

  return parsed as T;
}

export function jsonResult(
  data: unknown,
  nextSteps?: string,
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const payload = nextSteps !== undefined ? { result: data, nextSteps } : { result: data };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(
  err: unknown,
): { content: Array<{ type: "text"; text: string }>; isError: true } {
  if (err instanceof GrokForgeApiError) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: err.message, status: err.status, body: err.body, hint: err.hint, nextSteps: err.hint }, null, 2),
      }],
      isError: true,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ error: message, nextSteps: "Inspect the error and retry." }, null, 2),
    }],
    isError: true,
  };
}
