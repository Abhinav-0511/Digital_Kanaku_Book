"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/common/LoadingButton";
import { deleteLoad } from "@/lib/actions/loads";

export function ConfirmDeleteDialog({
  loadId,
  redirectTo = "/loads",
  className,
}: {
  loadId: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteLoad(loadId);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Couldn't delete this load. Please try again.");
      return;
    }

    setOpen(false);
    toast.success("Load deleted");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="destructive" className={cn("h-11", className)} onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this load?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <LoadingButton variant="destructive" className="h-11" loading={deleting} loadingText="Deleting..." onClick={handleDelete}>
            Delete
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
