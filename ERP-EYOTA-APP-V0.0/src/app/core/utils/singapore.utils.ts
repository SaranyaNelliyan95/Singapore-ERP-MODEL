const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatSgd(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatSgDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatSgPhone(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('65') ? digits.slice(2) : digits;
  if (local.length === 8) {
    return `+65 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return value.startsWith('+65') ? value : `+65 ${value}`;
}

export function maskNricOrFin(value: string | null | undefined): string {
  if (!value || value.length < 5) {
    return 'XXXXXXX';
  }

  const trimmed = value.trim().toUpperCase();
  const prefix = trimmed.charAt(0);
  const suffix = trimmed.slice(-4);
  return `${prefix}XXXX${suffix}`;
}

export function maskBankAccount(value: string | null | undefined): string {
  if (!value || value.length < 4) {
    return '••••';
  }
  return `•••• ${value.slice(-4)}`;
}

export function daysUntil(dateValue: string): number {
  const target = new Date(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
