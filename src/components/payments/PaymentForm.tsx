"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/common/LoadingButton";
import { NameCombobox } from "@/components/loads/NameCombobox";
import { searchParties } from "@/lib/actions/parties";
import { createPayment } from "@/lib/actions/payments";
import { todayIso } from "@/lib/formatting/date";

interface FormState {
  partyName: string;
  amount: string;
  paymentDate: string;
}

function initialState(): FormState {
  return { partyName: "", amount: "", paymentDate: todayIso() };
}

export function PaymentForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedState, setSavedState] = useState<"idle" | "saved">("idle");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!values.partyName.trim()) {
      nextErrors.partyName = "Select or enter a party.";
    }
    const amount = Number(values.amount);
    if (!values.amount || !Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Enter a valid amount.";
    }
    if (!values.paymentDate) {
      nextErrors.paymentDate = "Select a date.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    const result = await createPayment(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Couldn't save this payment. Please check your details and try again.");
      return;
    }

    setSavedState("saved");
  }

  if (savedState === "saved") {
    return (
      <div className="mx-auto max-w-md space-y-6 py-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Payment saved successfully</h2>
          <p className="mt-1 text-sm text-muted-foreground">What would you like to do next?</p>
        </div>
        <div className="flex flex-col gap-3">
          <LoadingButton
            className="h-11 text-base"
            onClick={() => {
              setValues(initialState());
              setSavedState("idle");
            }}
          >
            Add Another Payment
          </LoadingButton>
          <LoadingButton variant="outline" className="h-11 text-base" onClick={() => router.push("/payments")}>
            View Today&apos;s Payments
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 md:pb-6" noValidate>
      <Field label="Party" htmlFor="partyName" error={errors.partyName}>
        <NameCombobox
          id="partyName"
          label="Party"
          placeholder="Type or select a party"
          value={values.partyName}
          onChange={(v) => setField("partyName", v)}
          search={searchParties}
          error={Boolean(errors.partyName)}
        />
      </Field>

      <Field label="Amount Paid" htmlFor="amount" error={errors.amount}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <Input
            id="amount"
            inputMode="decimal"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-11 pl-7 text-base"
            value={values.amount}
            onChange={(e) => setField("amount", e.target.value)}
            aria-invalid={Boolean(errors.amount)}
          />
        </div>
      </Field>

      <Field label="Date" htmlFor="paymentDate" error={errors.paymentDate}>
        <Input
          id="paymentDate"
          type="date"
          className="h-11 text-base"
          value={values.paymentDate}
          max={todayIso()}
          onChange={(e) => setField("paymentDate", e.target.value)}
        />
      </Field>

      <div className="sticky bottom-16 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <LoadingButton type="submit" className="h-12 w-full text-base" loading={submitting} loadingText="Saving...">
          Save Payment
        </LoadingButton>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function CheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-7" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
