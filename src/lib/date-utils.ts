export const APPLICATION_TIME_ZONE = "Asia/Manila";
export const DUE_HOUR = 21;

function getDateParts(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
}

export function getApplicationDate(date = new Date()): string {
  const parts = getDateParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function getDueAtForDate(dateString: string): Date {
  return new Date(`${dateString}T21:00:00+08:00`);
}

export function formatDueDate(dueDate: string, dueAt?: string | null): string {
  const date = dueAt ? new Date(dueAt) : getDueAtForDate(dueDate);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
