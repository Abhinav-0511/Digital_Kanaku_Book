import { Loader2 } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

interface LoadingButtonProps extends ComponentProps<typeof Button>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({ loading, loadingText, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText ?? "Please wait..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
