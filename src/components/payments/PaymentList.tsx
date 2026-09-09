import { EmptyState } from "@/components/common/EmptyState";
import { PaymentCard } from "./PaymentCard";
import { PaymentTable } from "./PaymentTable";
import type { Payment } from "@/types/domain";

export function PaymentList({
  payments,
  emptyTitle = "No payments found",
  emptyDescription = "Try another party or date range.",
}: {
  payments: Payment[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (payments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {payments.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </div>
      <div className="hidden md:block">
        <PaymentTable payments={payments} />
      </div>
    </>
  );
}
