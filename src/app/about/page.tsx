import { Card } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-white">About GrokForge</h1>
      <Card className="space-y-3 text-sm text-zinc-300">
        <p>
          GrokForge is a transparent platform for crowdsourcing hierarchical multi-agent (sub-agent)
          work and funding Grok-powered projects for the greater good.
        </p>
        <p>
          Think GoFundMe + task marketplace + open-source collaboration hub, optimized for Grok users
          and the X ecosystem.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-zinc-400">
          <li>Public labor and capital ledgers</li>
          <li>Open licenses required for funded outputs</li>
          <li>Never stores user xAI API keys or SuperGrok credentials</li>
          <li>Milestone-gated fund release (human + multi-agent verification hooks)</li>
          <li>Light moderation + AI alignment pre-check on new projects</li>
        </ul>
      </Card>
      <Card className="space-y-2 text-sm text-zinc-400">
        <h2 className="font-semibold text-white">Safety & terms (MVP)</h2>
        <p>
          Greater-good focus only. No weapons, no unauthorized surveillance, no malware-for-hire.
          Contributors run agents with their own accounts. Platform operators may remove projects
          that fail alignment or license commitments.
        </p>
      </Card>
    </div>
  );
}
