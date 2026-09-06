"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/common/LoadingButton";
import type { z } from "zod";

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordValues) {
    setSubmitting(true);
    const result = await resetPasswordAction(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Couldn't reset your password. Please try again.");
      return;
    }

    toast.success("Password updated. Please log in again.");
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Set a new password</h2>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
          {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? <p className="text-sm text-destructive">{errors.confirmPassword.message}</p> : null}
        </div>

        <LoadingButton type="submit" className="h-11 w-full text-base" loading={submitting} loadingText="Updating...">
          Update password
        </LoadingButton>
      </form>
    </div>
  );
}
