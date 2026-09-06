"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/common/LoadingButton";
import { updateProfileName, updateWeightUnit } from "@/lib/actions/profile";
import { logoutAction } from "@/lib/actions/auth";

export function SettingsForm({ initialName, email, initialWeightUnit }: { initialName: string; email: string | null; initialWeightUnit: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [weightUnit, setWeightUnit] = useState(initialWeightUnit);
  const [savingName, setSavingName] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSaveName() {
    setSavingName(true);
    const result = await updateProfileName(name);
    setSavingName(false);
    if (!result.success) {
      toast.error(result.error ?? "Couldn't save your name.");
      return;
    }
    toast.success("Name updated");
  }

  async function handleSaveUnit() {
    setSavingUnit(true);
    const result = await updateWeightUnit(weightUnit);
    setSavingUnit(false);
    if (!result.success) {
      toast.error(result.error ?? "Couldn't save the weight unit.");
      return;
    }
    toast.success("Weight unit updated");
    router.refresh();
  }

  async function handleLogout() {
    setLoggingOut(true);
    const result = await logoutAction();
    setLoggingOut(false);
    if (!result.success) {
      toast.error(result.error ?? "Couldn't log out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <div className="flex gap-2">
            <Input id="name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
            <LoadingButton className="h-11" loading={savingName} loadingText="Saving..." onClick={handleSaveName}>
              Save
            </LoadingButton>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" className="h-11" value={email ?? ""} disabled />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="weightUnit">Weight Unit</Label>
          <div className="flex gap-2">
            <Input id="weightUnit" className="h-11" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} maxLength={20} />
            <LoadingButton className="h-11" loading={savingUnit} loadingText="Saving..." onClick={handleSaveUnit}>
              Save
            </LoadingButton>
          </div>
          <p className="text-xs text-muted-foreground">Shown next to weight everywhere in the app, e.g. &quot;kg&quot; or &quot;tons&quot;.</p>
        </div>
      </div>

      <LoadingButton variant="destructive" className="h-11 w-full" loading={loggingOut} loadingText="Logging out..." onClick={handleLogout}>
        <LogOut className="size-4" />
        Logout
      </LoadingButton>
    </div>
  );
}
