import { LoadForm } from "@/components/loads/LoadForm";
import { getCurrentProfile } from "@/lib/actions/profile";

export default async function NewLoadPage() {
  const { profile } = await getCurrentProfile();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Add Load</h1>
        <p className="text-sm text-muted-foreground">Fill in the details below.</p>
      </div>
      <LoadForm mode="create" weightUnit={profile?.weightUnit ?? "kg"} />
    </div>
  );
}
