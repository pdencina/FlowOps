/**
 * Formats a date as relative time (e.g., "hace 2h", "hace 3d").
 * Keeps it short for UI density.
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 30) return `hace ${diffDays}d`;
  return then.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/**
 * Formats a date as a readable string.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a date as date + time.
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
