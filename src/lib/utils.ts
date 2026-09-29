import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats seconds into MM:SS display format.
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats seconds into human readable duration, e.g. "1m 24s" or "45s".
 */
export function formatDurationHuman(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.round(totalSeconds));
  if (safeSec < 60) {
    return `${safeSec}s`;
  }
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Formats a Date object or ISO string into a polished format, e.g. "September 29, 2026".
 */
export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Formats date and time into a concise string, e.g. "Sep 29, 2026, 12:45 PM".
 */
export function formatDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Generates an elegant, professional Certificate ID.
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestampPart = Date.now().toString(36).substring(4).toUpperCase();
  return `CERT-${year}-${randomPart}-${timestampPart}`;
}
