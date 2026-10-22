// Date/time formatting helpers — dd/mm/yy + 24-hour clock, used everywhere.
const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value) {
  const d = new Date(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

export function formatTime(value) {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value) {
  return `${formatDate(value)} ${formatTime(value)}`;
}
