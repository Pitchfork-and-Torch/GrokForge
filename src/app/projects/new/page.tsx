import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewProjectForm } from "@/components/new-project-form";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/projects/new");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">Propose a project</h1>
        <p className="mt-1 text-zinc-400">
          Hierarchical multi-agent work + open license + funding goal. Alignment pre-check runs on submit.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
