export function SetupRequired() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-lg font-semibold">Almost there</p>
        <p className="text-sm text-muted-foreground">
          This app isn&apos;t connected to Supabase yet. Add{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, run the SQL migrations in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/migrations</code>, then restart the app.
        </p>
      </div>
    </div>
  );
}
