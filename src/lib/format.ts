// Currency. Big numbers without decimals — typical SaaS pricing.
export function money(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatDateLong(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`;
}

// Convert a `lastLoginAt` ISO date into a human label + flags. Mirrors the
// prototype's boLastSeen(): "En línea ahora" / "hace N min" / "hace N días"
// + an `online` bool (<5min) and a `stale` bool (>7d) used for muted colors.
export function formatLastSeen(iso: string | null | undefined): {
  label: string;
  online: boolean;
  stale: boolean;
} {
  if (!iso) return { label: 'Nunca', online: false, stale: true };
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 5) return { label: 'En línea ahora', online: true, stale: false };
  if (mins < 60) return { label: `hace ${mins} min`, online: false, stale: false };
  if (mins < 60 * 24) return { label: `hace ${Math.round(mins / 60)} h`, online: false, stale: false };
  const d = Math.round(mins / (60 * 24));
  return { label: `hace ${d} ${d === 1 ? 'día' : 'días'}`, online: false, stale: d > 7 };
}

// Slugify a string the same way the backend does so the live preview in
// NewAccountPage matches what the server will accept. Allowed characters:
// lowercase letters, digits, dot, dash, underscore — that way usernames like
// `matias.duarte`, `matias_duarte`, or `matias-duarte` pass through untouched.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 32);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}
