/**
 * Archive obvious demo-spam projects so the public homepage stays high-signal.
 * Keeps quality seed projects (climate atlas, agent task tree).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_SLUGS = new Set([
  "open-climate-synthesis-atlas",
  "agent-task-tree-oss",
]);

function looksLikeJunk(title: string, description: string): boolean {
  const t = title.trim().toLowerCase();
  const d = description.trim().toLowerCase();
  if (t.length < 8) return true;
  if (/^(test|asdf|sdf|qwer|demo|xxx|aaa|bbb)/i.test(t)) return true;
  if (/(.)\1{6,}/.test(t)) return true; // repeated chars
  if (t.split(/\s+/).length === 1 && t.length < 12 && !/[aeiou]{2}/i.test(t)) return true;
  if (d.length < 40) return true;
  if ((d.match(/test demo/gi) || []).length >= 3) return true;
  if (/^[a-z0-9]{6,20}$/i.test(t) && d.includes("sdf")) return true;
  return false;
}

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, slug: true, title: true, description: true, status: true },
  });

  let archived = 0;
  for (const p of projects) {
    if (KEEP_SLUGS.has(p.slug)) continue;
    if (!looksLikeJunk(p.title, p.description)) continue;
    await prisma.project.update({
      where: { id: p.id },
      data: { status: "ARCHIVED" },
    });
    console.log("archived", p.slug, p.title);
    archived += 1;
  }
  console.log(`done archived=${archived} total=${projects.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
