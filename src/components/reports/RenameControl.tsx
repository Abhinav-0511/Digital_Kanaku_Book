"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/LoadingButton";
import type { RenameResult } from "@/lib/actions/_lookups";

interface RenameControlProps {
  typeLabel: string;
  currentName: string;
  /** A server action pre-bound to the entity being renamed — just needs the new name. */
  onRename: (newName: string) => Promise<RenameResult>;
  /** When set, a successful rename navigates here instead of just calling
   * router.refresh() — the literal string "{value}" is replaced with the
   * new name, URL-encoded. Needed for vehicle numbers, which (unlike a
   * company/party id) are their own URL identity: without this, the page
   * would keep showing the old, now-empty number after a rename. */
  redirectTemplate?: string;
}

export function RenameControl({ typeLabel, currentName, onRename, redirectTemplate }: RenameControlProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  function start() {
    setValue(currentName);
    setError(undefined);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const result = await onRename(value);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Couldn't rename. Please try again.");
      return;
    }

    setEditing(false);
    toast.success("Renamed");
    const newName = result.name ?? value;
    if (redirectTemplate) {
      router.replace(redirectTemplate.replace("{value}", encodeURIComponent(newName)));
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-start justify-between gap-3">
      {editing ? (
        <div className="flex-1 space-y-1.5">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-10"
            autoFocus
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{typeLabel}</p>
          <h1 className="truncate text-xl font-semibold">{currentName}</h1>
        </div>
      )}

      {editing ? (
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9"
            onClick={() => setEditing(false)}
            disabled={saving}
            aria-label="Cancel"
          >
            <X className="size-4" />
          </Button>
          <LoadingButton type="button" size="icon" className="size-9" loading={saving} onClick={save} aria-label="Save name">
            <Check className="size-4" />
          </LoadingButton>
        </div>
      ) : (
        <Button type="button" size="icon" variant="ghost" className="size-9 shrink-0" onClick={start} aria-label="Rename">
          <Pencil className="size-4" />
        </Button>
      )}
    </div>
  );
}
