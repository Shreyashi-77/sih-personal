import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(distanceKm: number | undefined | null): string {
  if (distanceKm == null) return '--';
  return `${distanceKm.toFixed(1)} km`;
}

export function formatTime(hours: number | undefined | null): string {
  if (hours == null) return '--';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}
