import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userHasXAccount } from "@/lib/session";
import { NewProjectForm } from "@/components/new-project-form";
import { Badge, Card, Button } from "@/components/ui";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/projects/new");

  const hasX = await userHasXAccount(session.user.id);
  if (!hasX) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Badge>X identity required</Badge>
        <h1 className="text-3xl font-bold text-white">Propose a project</h1>
        <Card className="space-y-3">
          <p className="text-sm text-stone-300">
            Public proposals need a real X account so the community can follow builders and
            trust the board. Email-only logins can still browse, claim (if linked later), and
            donate.
          </p>
          <p className="text-sm text-stone-500">
            Sign out, then use <strong className="text-amber-300">Sign in with X</strong> so
            your handle and avatar attach to the proposal.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/login">
              <Button>Sign in with X</Button>
            </Link>
            <Link href="/projects">
              <Button variant="secondary">Browse projects</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">Propose a project</h1>
        <p className="mt-1 text-stone-400">
          Hierarchical multi-agent work + open license. Progress is tasks completed, not a USD
          goal. Alignment pre-check runs on submit. Your X handle is public on the proposal.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
