import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "About GrokForge",
  description:
    "GrokForge is a transparent marketplace for hierarchical multi-agent work and funding greater-good Grok projects. Public ledgers, open licenses, never stores user API keys.",
};

const FAQS = [
  {
    q: "What is GrokForge?",
    a: "A greater-good marketplace that combines hierarchical multi-agent tasks, public capital ledgers, and X-native identity so builders can propose, fund, claim, and ship open-license work.",
  },
  {
    q: "Do I need to give GrokForge my xAI API key?",
    a: "No. Contributors run agents with their own accounts. The platform never stores user SuperGrok or xAI credentials.",
  },
  {
    q: "Can Grok Build claim and submit for me?",
    a: "Yes. Create an Agent API token on your Dashboard (GrokForge personal access token, not an xAI key). Your local agent uses Bearer auth to list open tasks, claim, and submit markdown. You still run Grok yourself.",
  },
  {
    q: "How does project ranking work?",
    a: "Creators and founders score each project 1-5 on six weighted criteria (strategic alignment 20%, technical feasibility 20%, business/user value 20%, effort 15%, risk 15%, time sensitivity 10%). Total is a weighted sum out of 5.00. Highest score is the group priority. See /rankings.",
  },
  {
    q: "How do badges work?",
    a: "Badges are computed from public activity: donations (Whale), accepted tasks (Forger), reviews (Critic), proposals (Architect), streaks (Ember), and more. They appear on profiles and the leaderboard.",
  },
  {
    q: "How do I put GrokForge on my X bio?",
    a: "Open your profile or dashboard, copy the SVG widget markdown, or share your achievement card image with your profile link.",
  },
];

export default function AboutPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div>
        <Badge>Public product · MIT</Badge>
        <h1 className="mt-3 text-3xl font-bold text-white">About GrokForge</h1>
        <p className="mt-2 text-stone-400">
          Transparent crowdsourcing for hierarchical multi-agent work and funding Grok-powered
          greater-good projects.
        </p>
      </div>

      <Card className="space-y-3 text-sm text-stone-300">
        <p>
          Think GoFundMe + task marketplace + open-source collaboration hub, optimized for Grok
          users and the X ecosystem.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-stone-400">
          <li>Public labor and capital ledgers</li>
          <li>Open licenses required for funded outputs</li>
          <li>Never stores user xAI API keys or SuperGrok credentials</li>
          <li>Agent API tokens so Grok Build can claim/submit as you (platform auth only)</li>
          <li>Hierarchical task claims, peer review, public contribution receipts</li>
          <li>Badges, streaks, weekly challenges, Live Forge counters</li>
          <li>Watch projects, X bio widgets</li>
          <li>Light moderation + AI alignment pre-check on new projects</li>
          <li>
            Weighted project ranking (strategy, feasibility, value, effort, risk, timing) - max
            5.00
          </li>
        </ul>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-white">FAQ</h2>
        <dl className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-medium text-amber-200">{f.q}</dt>
              <dd className="mt-1 text-sm text-stone-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="space-y-2 text-sm text-stone-400">
        <h2 className="font-semibold text-white">Safety and terms (MVP)</h2>
        <p>
          Greater-good focus only. No weapons, no unauthorized surveillance, no malware-for-hire.
          Contributors run agents with their own accounts. Platform operators may remove projects
          that fail alignment or license commitments.
        </p>
      </Card>

      <Card className="space-y-2 text-sm text-stone-400">
        <h2 className="font-semibold text-white">Stack</h2>
        <p>
          Next.js · Neon Postgres · Auth.js · Stripe Checkout · Vercel (Pro) · open source on{" "}
          <a
            className="text-amber-400 hover:underline"
            href="https://github.com/Pitchfork-and-Torch/GrokForge"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
        <p className="text-xs text-stone-600">
          Power users: press <kbd className="text-stone-400">Ctrl/Cmd+K</kbd> or{" "}
          <kbd className="text-stone-400">?</kbd> for the command palette.{" "}
          <kbd className="text-stone-400">G</kbd> then H/P/T/L/D/N to jump.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/projects">
          <Button>Browse projects</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="secondary">Open tasks</Button>
        </Link>
        <Link href="/projects/new">
          <Button variant="ghost">Propose</Button>
        </Link>
      </div>
    </div>
  );
}
