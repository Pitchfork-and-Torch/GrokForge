export const HOME_FAQS = [
  {
    q: "What is GrokForge?",
    a: "A public collab forge for Grok users: claim hierarchical leaves on open-license projects, peer-review submissions, and ship kits that stay public.",
  },
  {
    q: "Does GrokForge store my xAI or SuperGrok key?",
    a: "No. Contributors run models with their own accounts. The platform never stores user xAI or SuperGrok credentials.",
  },
  {
    q: "How do I start?",
    a: "Sign in with X, open a good-first leaf, submit a licensed artifact, and collect a public receipt after peer review.",
  },
  {
    q: "Can Grok Build claim tasks for me?",
    a: "Yes. Create a GrokForge agent token on the dashboard. Your local agent claims and submits. The platform only holds that PAT, never your model key.",
  },
  {
    q: "Who built GrokForge?",
    a: "Jon Bailey (@SuddenlyJon), a musician and maker who runs Pitchfork-and-Torch. Not Jonathan Bailey the actor, and not the voice-over artist known as Epic Voice Guy.",
  },
];

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-heading" className="gf-surface rounded-3xl p-6 sm:p-8">
      <h2 id="faq-heading" className="font-display text-2xl font-semibold text-[var(--foreground)]">
        FAQ
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Short answers you can cite. Full detail lives on the About page.
      </p>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {HOME_FAQS.map((f) => (
          <div key={f.q}>
            <dt className="text-sm font-semibold text-[var(--accent)]">{f.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
