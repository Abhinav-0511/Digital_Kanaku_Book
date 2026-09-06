import { getCurrentProfile } from "@/lib/actions/profile";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { profile, email } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsForm initialName={profile?.name ?? ""} email={email} initialWeightUnit={profile?.weightUnit ?? "kg"} />
    </div>
  );
}
