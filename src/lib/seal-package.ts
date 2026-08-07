/**
 * Pure Seal & Ship packaging helpers (no Prisma, no Node ZIP deps).
 * Builds logical package files + a ZIP store archive for streaming.
 */
import { createHash } from "crypto";

export type PackTaskNode = {
  id: string;
  title: string;
  parentId: string | null;
  sortOrder: number;
  status: string;
  acceptanceCriteria?: string;
  children?: PackTaskNode[];
  acceptedContribution?: {
    id: string;
    body: string;
    sources: string | null;
    contentType: string;
    user: { handle: string | null; name: string | null; id: string };
    createdAt: string;
  } | null;
};

export type PackageFile = {
  path: string;
  content: string;
};

export type BuildPackageInput = {
  slug: string;
  title: string;
  description: string;
  license: string;
  version: string;
  sealNote: string;
  packageTitle?: string;
  proposerHandle: string | null;
  sealedAt: string; // ISO
  tree: PackTaskNode[];
  siteUrl?: string;
};

/** Sanitize a path segment - no traversal, filesystem-safe. */
export function sanitizePathSegment(raw: string, max = 64): string {
  let s = (raw || "item")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/\\]/g, "-")
    .replace(/\.\.+/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  if (!s || s === "." || s === ".." || s.includes("..")) s = "item";
  if (s.length > max) s = s.slice(0, max).replace(/-+$/, "") || "item";
  return s;
}

/** contentType → file extension */
export function extensionForContentType(contentType: string, body = ""): string {
  const t = (contentType || "markdown").toLowerCase().trim();
  if (t === "markdown" || t === "md" || t === "text/markdown") return "md";
  if (t === "json" || t === "application/json") return "json";
  if (t === "typescript" || t === "ts") return "ts";
  if (t === "javascript" || t === "js") return "js";
  if (t === "python" || t === "py") return "py";
  if (t === "html" || t === "text/html") return "html";
  if (t === "css") return "css";
  if (t === "yaml" || t === "yml") return "yml";
  if (t === "txt" || t === "text" || t === "plain") return "txt";
  // light body sniff
  const b = body.trimStart();
  if (b.startsWith("{") || b.startsWith("[")) return "json";
  if (b.startsWith("# ") || b.includes("\n## ")) return "md";
  return "txt";
}

export function buildTaskTree(
  tasks: {
    id: string;
    title: string;
    parentId: string | null;
    sortOrder: number;
    status: string;
    acceptanceCriteria?: string;
    contributions?: {
      id: string;
      body: string;
      sources: string | null;
      contentType: string;
      status: string;
      createdAt: Date | string;
      user: { handle: string | null; name: string | null; id: string };
    }[];
  }[]
): PackTaskNode[] {
  const map = new Map<string, PackTaskNode>();
  for (const t of tasks) {
    const accepted =
      t.contributions
        ?.filter((c) => c.status === "ACCEPTED")
        .sort((a, b) => {
          const ta =
            typeof a.createdAt === "string"
              ? Date.parse(a.createdAt)
              : a.createdAt.getTime();
          const tb =
            typeof b.createdAt === "string"
              ? Date.parse(b.createdAt)
              : b.createdAt.getTime();
          return tb - ta;
        })[0] || null;
    map.set(t.id, {
      id: t.id,
      title: t.title,
      parentId: t.parentId,
      sortOrder: t.sortOrder,
      status: t.status,
      acceptanceCriteria: t.acceptanceCriteria,
      children: [],
      acceptedContribution: accepted
        ? {
            id: accepted.id,
            body: accepted.body,
            sources: accepted.sources,
            contentType: accepted.contentType,
            user: accepted.user,
            createdAt:
              typeof accepted.createdAt === "string"
                ? accepted.createdAt
                : accepted.createdAt.toISOString(),
          }
        : null,
    });
  }
  const roots: PackTaskNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: PackTaskNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function walkAccepted(
  nodes: PackTaskNode[],
  basePath: string,
  files: PackageFile[],
  index: { n: number }
) {
  nodes.forEach((node, i) => {
    const seg = `${String(i + 1).padStart(2, "0")}-${sanitizePathSegment(node.title)}`;
    const dir = basePath ? `${basePath}/${seg}` : seg;
    if (node.acceptedContribution) {
      index.n += 1;
      const ext = extensionForContentType(
        node.acceptedContribution.contentType,
        node.acceptedContribution.body
      );
      const body = node.acceptedContribution.body.endsWith("\n")
        ? node.acceptedContribution.body
        : node.acceptedContribution.body + "\n";
      files.push({ path: `${dir}/deliverable.${ext}`, content: body });
      if (node.acceptedContribution.sources?.trim()) {
        files.push({
          path: `${dir}/sources.txt`,
          content: node.acceptedContribution.sources.trim() + "\n",
        });
      }
      files.push({
        path: `${dir}/meta.json`,
        content:
          JSON.stringify(
            {
              taskId: node.id,
              taskTitle: node.title,
              contributionId: node.acceptedContribution.id,
              contentType: node.acceptedContribution.contentType,
              author: node.acceptedContribution.user.handle,
              acceptedAt: node.acceptedContribution.createdAt,
            },
            null,
            2
          ) + "\n",
      });
    }
    if (node.children?.length) {
      walkAccepted(node.children, dir, files, index);
    }
  });
}

function collectContributors(nodes: PackTaskNode[]): Map<
  string,
  { handle: string | null; name: string | null; count: number }
> {
  const map = new Map<
    string,
    { handle: string | null; name: string | null; count: number }
  >();
  const walk = (list: PackTaskNode[]) => {
    for (const n of list) {
      const c = n.acceptedContribution;
      if (c) {
        const key = c.user.id;
        const prev = map.get(key);
        if (prev) prev.count += 1;
        else
          map.set(key, {
            handle: c.user.handle,
            name: c.user.name,
            count: 1,
          });
      }
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return map;
}

function countAccepted(nodes: PackTaskNode[]): number {
  let n = 0;
  const walk = (list: PackTaskNode[]) => {
    for (const t of list) {
      if (t.acceptedContribution) n += 1;
      if (t.children?.length) walk(t.children);
    }
  };
  walk(nodes);
  return n;
}

export function licenseText(license: string, year: number): string {
  const L = (license || "MIT").toUpperCase();
  if (L.includes("MIT")) {
    return `MIT License

Copyright (c) ${year} GrokForge contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  }
  return `${license}

This package is released under the ${license} license as declared on GrokForge.
See the originating project page for full terms.
Forged on GrokForge (${year}).
`;
}

export function buildReadme(input: BuildPackageInput): string {
  const site = (input.siteUrl || "https://grokforge.app").replace(/\/$/, "");
  const pkgTitle = input.packageTitle?.trim() || input.title;
  const handle = input.proposerHandle ? `@${input.proposerHandle}` : "proposer";
  return `# ${pkgTitle}

**Version:** ${input.version}  
**Sealed:** ${input.sealedAt}  
**License:** ${input.license}  
**Proposer:** ${handle}  
**Forged on:** [GrokForge](${site})

## Project

${input.description.trim()}

## Seal note / impact statement

${input.sealNote.trim()}

## How to use this package

1. Read this README and the LICENSE file.
2. Browse \`tasks/\` - directories mirror the project's hierarchical task tree.
3. Each accepted leaf has \`deliverable.*\` (the work), optional \`sources.txt\`, and \`meta.json\`.
4. Credit contributors (see CONTRIBUTORS.md) when you reuse material.
5. This is education / public-goods work from an open marketplace - not legal advice and not a security guarantee.

## Credits

See **CONTRIBUTORS.md**. Labor and capital events live on the public GrokForge ledger for this project.

## Links

- Project: ${site}/projects/${input.slug}
- Sealed ship page: ${site}/projects/${input.slug}/ship
- Package download: ${site}/api/projects/${input.slug}/package

---

*Sealed on GrokForge - Strike the Anvil.*
`;
}

export function buildContributorsMd(
  nodes: PackTaskNode[],
  proposerHandle: string | null
): string {
  const map = collectContributors(nodes);
  const lines = [
    "# Contributors",
    "",
    "Derived from accepted contributions on GrokForge.",
    "",
  ];
  if (proposerHandle) {
    lines.push(`- **Proposer / sealer context:** @${proposerHandle}`);
    lines.push("");
  }
  lines.push("## Accepted labor");
  lines.push("");
  if (map.size === 0) {
    lines.push("_No accepted contribution authors recorded._");
  } else {
    const rows = [...map.values()].sort((a, b) => b.count - a.count);
    for (const r of rows) {
      const who = r.handle ? `@${r.handle}` : r.name || "builder";
      lines.push(`- ${who} - ${r.count} accepted deliverable(s)`);
    }
  }
  lines.push("");
  lines.push("## Ledger");
  lines.push("");
  lines.push(
    "Authoritative capital/labor events remain on the live project public ledger on GrokForge."
  );
  lines.push("");
  return lines.join("\n");
}

/** Build sorted logical package files. */
export function buildPackageFiles(input: BuildPackageInput): PackageFile[] {
  const version = sanitizeVersion(input.version);
  const files: PackageFile[] = [];
  const acceptedCount = countAccepted(input.tree);
  const idx = { n: 0 };
  walkAccepted(input.tree, "tasks", files, idx);

  const projectJson = {
    slug: input.slug,
    title: input.packageTitle?.trim() || input.title,
    projectTitle: input.title,
    version,
    sealedAt: input.sealedAt,
    license: input.license,
    proposerHandle: input.proposerHandle,
    sealNote: input.sealNote.trim(),
    acceptedDeliverables: acceptedCount,
    forgedOn: "GrokForge",
  };

  files.push({
    path: "README.md",
    content: buildReadme({ ...input, version }),
  });
  files.push({
    path: "LICENSE",
    content: licenseText(
      input.license,
      new Date(input.sealedAt).getUTCFullYear() || new Date().getUTCFullYear()
    ),
  });
  files.push({
    path: "CONTRIBUTORS.md",
    content: buildContributorsMd(input.tree, input.proposerHandle),
  });
  files.push({
    path: "project.json",
    content: JSON.stringify(projectJson, null, 2) + "\n",
  });

  // Deterministic order
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export function sanitizeVersion(raw: string): string {
  const v = (raw || "v1.0.0").trim().slice(0, 32);
  if (/^v?\d+(\.\d+){0,3}(-[a-zA-Z0-9.-]+)?$/.test(v)) {
    return v.startsWith("v") ? v : `v${v}`;
  }
  return "v1.0.0";
}

/** SHA-256 over path + content pairs (sorted paths). */
export function contentHash(files: PackageFile[]): string {
  const h = createHash("sha256");
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  for (const f of sorted) {
    h.update(f.path);
    h.update("\0");
    h.update(f.content);
    h.update("\0");
  }
  return h.digest("hex");
}

export function previewTreeLines(files: PackageFile[]): string[] {
  return files.map((f) => f.path);
}

// --- Minimal ZIP (store only, UTF-8) ---

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}
function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

/** Build a ZIP archive (stored, no compression) from package files. */
export function buildZipBuffer(files: PackageFile[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const name = Buffer.from(f.path.replace(/\\/g, "/"), "utf8");
    const data = Buffer.from(f.content, "utf8");
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0x0800), // UTF-8 flag
      u16(0), // store
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centrals);
  const localDir = Buffer.concat(locals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(localDir.length),
    u16(0),
  ]);
  return Buffer.concat([localDir, centralDir, end]);
}

export function packageZipFilename(slug: string, version: string): string {
  return `${sanitizePathSegment(slug, 80)}-${sanitizeVersion(version)}.zip`;
}
