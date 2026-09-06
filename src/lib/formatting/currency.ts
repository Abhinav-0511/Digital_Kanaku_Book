const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats a number as Indian Rupees, e.g. ₹1,48,250.00 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return inrFormatter.format(0);
  }
  return inrFormatter.format(amount);
}

/** Same as formatCurrency but without paise, for compact summary cards. */
export function formatCurrencyWhole(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return inrWholeFormatter.format(0);
  }
  return inrWholeFormatter.format(amount);
}

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats a plain quantity (e.g. weight) with Indian digit grouping. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0";
  }
  return numberFormatter.format(value);
}
