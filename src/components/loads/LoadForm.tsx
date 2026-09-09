"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/common/LoadingButton";
import { NameCombobox } from "./NameCombobox";
import { VehicleInput } from "./VehicleInput";
import { GstSelector } from "./GstSelector";
import { LoadSummaryPreview } from "./LoadSummaryPreview";
import { calculateLoadAmounts } from "@/lib/calculations/loadCalculations";
import { searchCompanies } from "@/lib/actions/companies";
import { searchParties } from "@/lib/actions/parties";
import { createLoad, updateLoad } from "@/lib/actions/loads";
import { todayIso } from "@/lib/formatting/date";
import type { GstMode, Load } from "@/types/domain";

interface FormState {
  weight: string;
  vehicleNumber: string;
  companyName: string;
  partyName: string;
  rate: string;
  driverAdvance: string;
  vehicleRent: string;
  dieselCost: string;
  gstMode: GstMode;
  customGstPercentage: string;
  loadDate: string;
}

function initialStateFromLoad(load?: Load): FormState {
  if (!load) {
    return {
      weight: "",
      vehicleNumber: "",
      companyName: "",
      partyName: "",
      rate: "",
      driverAdvance: "",
      vehicleRent: "",
      dieselCost: "",
      gstMode: "standard",
      customGstPercentage: "",
      loadDate: todayIso(),
    };
  }

  let gstMode: GstMode = "none";
  if (load.gstEnabled) {
    gstMode = load.gstPercentage === 18 ? "standard" : "custom";
  }

  return {
    weight: String(load.weight),
    vehicleNumber: load.vehicleNumber,
    companyName: load.companyName,
    partyName: load.partyName,
    rate: String(load.rate),
    driverAdvance: load.driverAdvance ? String(load.driverAdvance) : "",
    vehicleRent: load.vehicleRent ? String(load.vehicleRent) : "",
    dieselCost: load.dieselCost ? String(load.dieselCost) : "",
    gstMode,
    customGstPercentage: gstMode === "custom" ? String(load.gstPercentage) : "",
    loadDate: load.loadDate,
  };
}

interface LoadFormProps {
  mode: "create" | "edit";
  loadId?: string;
  initialLoad?: Load;
  weightUnit: string;
}

export function LoadForm({ mode, loadId, initialLoad, weightUnit }: LoadFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(() => initialStateFromLoad(initialLoad));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedState, setSavedState] = useState<"idle" | "saved">("idle");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const preview = useMemo(() => {
    const weight = Number(values.weight);
    const rate = Number(values.rate);
    const gstEnabled = values.gstMode !== "none";
    const gstPercentage = values.gstMode === "standard" ? 18 : values.gstMode === "custom" ? Number(values.customGstPercentage || 0) : 0;
    const driverAdvance = Number(values.driverAdvance || 0);
    const vehicleRent = Number(values.vehicleRent || 0);
    const dieselCost = Number(values.dieselCost || 0);
    const { baseAmount, gstAmount, totalAmount } = calculateLoadAmounts({ weight, rate, gstEnabled, gstPercentage });
    return { weight, rate, gstEnabled, gstPercentage, driverAdvance, vehicleRent, dieselCost, baseAmount, gstAmount, totalAmount };
  }, [values]);

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    const weight = Number(values.weight);
    if (!values.weight || !Number.isFinite(weight) || weight <= 0) {
      nextErrors.weight = "Enter a valid weight.";
    }
    if (!values.vehicleNumber.trim()) {
      nextErrors.vehicleNumber = "Vehicle number is required.";
    }
    if (!values.companyName.trim()) {
      nextErrors.companyName = "Select or enter a company.";
    }
    if (!values.partyName.trim()) {
      nextErrors.partyName = "Select or enter a party.";
    }
    const rate = Number(values.rate);
    if (values.rate === "" || !Number.isFinite(rate) || rate < 0) {
      nextErrors.rate = "Rate cannot be negative.";
    }
    if (values.driverAdvance) {
      const advance = Number(values.driverAdvance);
      if (!Number.isFinite(advance) || advance < 0) {
        nextErrors.driverAdvance = "Driver advance cannot be negative.";
      }
    }
    if (values.vehicleRent) {
      const rent = Number(values.vehicleRent);
      if (!Number.isFinite(rent) || rent < 0) {
        nextErrors.vehicleRent = "Vehicle rent cannot be negative.";
      }
    }
    if (values.dieselCost) {
      const diesel = Number(values.dieselCost);
      if (!Number.isFinite(diesel) || diesel < 0) {
        nextErrors.dieselCost = "Diesel cost cannot be negative.";
      }
    }
    if (values.gstMode === "custom") {
      const pct = Number(values.customGstPercentage);
      if (values.customGstPercentage === "" || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        nextErrors.customGstPercentage = "GST percentage must be between 0 and 100.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    const payload = {
      weight: values.weight,
      vehicleNumber: values.vehicleNumber,
      companyName: values.companyName,
      partyName: values.partyName,
      rate: values.rate,
      driverAdvance: values.driverAdvance,
      vehicleRent: values.vehicleRent,
      dieselCost: values.dieselCost,
      gstMode: values.gstMode,
      customGstPercentage: values.customGstPercentage,
      loadDate: values.loadDate,
    };

    const result = mode === "create" ? await createLoad(payload) : await updateLoad(loadId!, payload);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Couldn't save this load. Please check your details and try again.");
      return;
    }

    if (mode === "edit") {
      toast.success("Load updated");
      router.push(`/loads/${loadId}`);
      router.refresh();
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
          <h2 className="text-lg font-semibold">Load saved successfully</h2>
          <p className="mt-1 text-sm text-muted-foreground">What would you like to do next?</p>
        </div>
        <div className="flex flex-col gap-3">
          <LoadingButton
            className="h-11 text-base"
            onClick={() => {
              setValues(initialStateFromLoad());
              setSavedState("idle");
            }}
          >
            Add Another Load
          </LoadingButton>
          <LoadingButton variant="outline" className="h-11 text-base" onClick={() => router.push("/loads")}>
            View Today&apos;s Loads
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 md:pb-6" noValidate>
      <Field label="Weight" htmlFor="weight" error={errors.weight}>
        <div className="relative">
          <Input
            id="weight"
            inputMode="decimal"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-11 pr-14 text-base"
            value={values.weight}
            onChange={(e) => setField("weight", e.target.value)}
            aria-invalid={Boolean(errors.weight)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {weightUnit}
          </span>
        </div>
      </Field>

      <Field label="Vehicle Number" htmlFor="vehicleNumber" error={errors.vehicleNumber}>
        <VehicleInput
          id="vehicleNumber"
          value={values.vehicleNumber}
          onChange={(v) => setField("vehicleNumber", v)}
          minChars={0}
          aria-invalid={Boolean(errors.vehicleNumber)}
        />
      </Field>

      <Field label="Company" htmlFor="companyName" error={errors.companyName}>
        <NameCombobox
          id="companyName"
          label="Company"
          placeholder="Type or select a company"
          value={values.companyName}
          onChange={(v) => setField("companyName", v)}
          search={searchCompanies}
          error={Boolean(errors.companyName)}
        />
      </Field>

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

      <Field label="Rate" htmlFor="rate" error={errors.rate}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <Input
            id="rate"
            inputMode="decimal"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-11 pl-7 text-base"
            value={values.rate}
            onChange={(e) => setField("rate", e.target.value)}
            aria-invalid={Boolean(errors.rate)}
          />
        </div>
      </Field>

      <Field label="Driver Advance (optional)" htmlFor="driverAdvance" error={errors.driverAdvance}>
        <MoneyInput
          id="driverAdvance"
          value={values.driverAdvance}
          onChange={(v) => setField("driverAdvance", v)}
          error={Boolean(errors.driverAdvance)}
        />
      </Field>

      <Field label="Vehicle Rent (optional)" htmlFor="vehicleRent" error={errors.vehicleRent}>
        <MoneyInput
          id="vehicleRent"
          value={values.vehicleRent}
          onChange={(v) => setField("vehicleRent", v)}
          error={Boolean(errors.vehicleRent)}
        />
      </Field>

      <Field label="Diesel (optional)" htmlFor="dieselCost" error={errors.dieselCost}>
        <MoneyInput
          id="dieselCost"
          value={values.dieselCost}
          onChange={(v) => setField("dieselCost", v)}
          error={Boolean(errors.dieselCost)}
        />
      </Field>

      <Field label="Load Date" htmlFor="loadDate">
        <Input
          id="loadDate"
          type="date"
          className="h-11 text-base"
          value={values.loadDate}
          max={todayIso()}
          onChange={(e) => setField("loadDate", e.target.value)}
        />
      </Field>

      <GstSelector
        mode={values.gstMode}
        customPercentage={values.customGstPercentage}
        onModeChange={(mode) => setField("gstMode", mode)}
        onCustomPercentageChange={(v) => setField("customGstPercentage", v)}
        error={errors.customGstPercentage}
      />

      <LoadSummaryPreview
        weight={preview.weight}
        rate={preview.rate}
        weightUnit={weightUnit}
        baseAmount={preview.baseAmount}
        gstEnabled={preview.gstEnabled}
        gstPercentage={preview.gstPercentage}
        gstAmount={preview.gstAmount}
        driverAdvance={preview.driverAdvance}
        vehicleRent={preview.vehicleRent}
        dieselCost={preview.dieselCost}
        totalAmount={preview.totalAmount}
      />

      <div className="sticky bottom-16 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <LoadingButton type="submit" className="h-12 w-full text-base" loading={submitting} loadingText="Saving...">
          Save Load
        </LoadingButton>
      </div>
    </form>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
      <Input
        id={id}
        inputMode="decimal"
        type="number"
        min={0}
        step="0.01"
        placeholder="0"
        className="h-11 pl-7 text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error}
      />
    </div>
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
