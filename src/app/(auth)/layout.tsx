export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Digital Kanakku Book</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your daily loads, weights and totals — in one place.</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}
