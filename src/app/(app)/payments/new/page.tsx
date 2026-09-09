import { PaymentForm } from "@/components/payments/PaymentForm";

export default function NewPaymentPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Add Payment</h1>
        <p className="text-sm text-muted-foreground">Fill in the details below.</p>
      </div>
      <PaymentForm />
    </div>
  );
}
