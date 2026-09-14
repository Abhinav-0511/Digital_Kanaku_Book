import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { ConfirmDeletePaymentDialog } from "@/components/payments/ConfirmDeletePaymentDialog";
import { BackLink } from "@/components/common/BackLink";
import { getPayment } from "@/lib/actions/payments";
import { paymentDisplayName } from "@/lib/paymentMapper";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPayment(id);

  if (!payment) notFound();

  // Return to the payments list on the date this payment is on, not
  // today's date — otherwise editing an older payment strands you back on
  // today after saving or backing out.
  const backHref = `/payments?date=${payment.paymentDate}`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink href={backHref} label="Back to Payments" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Edit Payment</h1>
          <p className="text-sm text-muted-foreground">{paymentDisplayName(payment)}</p>
        </div>
        <ConfirmDeletePaymentDialog paymentId={payment.id} redirectTo={backHref} />
      </div>
      {/* key forces a fresh mount per payment, so useState's initializer
          re-seeds the form instead of carrying over another payment's
          state when navigating directly between two edit pages. */}
      <PaymentForm key={payment.id} mode="edit" paymentId={payment.id} initialPayment={payment} />
    </div>
  );
}
