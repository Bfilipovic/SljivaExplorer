export function formatAddress(value: string, length = 6): string {
  if (!value) return "";
  const start = value.slice(0, length + 2);
  const end = value.slice(-length);
  return `${start}…${end}`;
}

export function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function formatAmount(amount: string, currency: string): string {
  const numeric = Number.parseFloat(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  return `${numeric.toFixed(4)} ${currency.toUpperCase()}`;
}

