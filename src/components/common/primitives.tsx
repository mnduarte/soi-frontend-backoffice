import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import {
  formatLastSeen,
  formatDateLong,
  initialsOf,
  money,
} from '../../lib/format';
import type {
  ClinicStatus,
  PaymentStatus,
  LogoStyle,
} from '../../api/admin-clinics';

// =============================================================================
// ConsoleLogo — super-admin brand mark (dark molar + brand shield).
// =============================================================================

export function ConsoleLogo({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: 'linear-gradient(150deg, #1E293B, #0F172A)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3c-3 0-5 1.5-5 4 0 1.3.3 2 .8 3.2.5 1.3.5 2.5.5 4.3 0 2.6 1.3 7 2 7s1.2-1.2 1.7-3 .5-2.5 1-2.5.5.6 1 2.5 1 3 1.7 3 2-4.4 2-7c0-1.8 0-3 .5-4.3.5-1.2.8-1.9.8-3.2 0-2.5-2-4-5-4z"
          fill="white"
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          bottom: -3,
          right: -3,
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: '50%',
          background: 'var(--brand-primary)',
          border: '2px solid var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size * 0.22}
          height={size * 0.22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6z" />
        </svg>
      </span>
    </div>
  );
}

// =============================================================================
// ClinicLogo — per-account brand mark (tooth glyph or mono initials, tinted).
// =============================================================================

interface ClinicLogoProps {
  color?: string;
  size?: number;
  logoStyle?: LogoStyle;
  initials?: string;
  radius?: number;
}

export function ClinicLogo({
  color = '#2F54EB',
  size = 38,
  logoStyle = 'tooth',
  initials,
  radius,
}: ClinicLogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.28,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
        fontWeight: 600,
        fontSize: size * 0.34,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}
    >
      {logoStyle === 'mono' && initials ? initials : (
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c-3 0-5 1.5-5 4 0 1.3.3 2 .8 3.2.5 1.3.5 2.5.5 4.3 0 2.6 1.3 7 2 7s1.2-1.2 1.7-3 .5-2.5 1-2.5.5.6 1 2.5 1 3 1.7 3 2-4.4 2-7c0-1.8 0-3 .5-4.3.5-1.2.8-1.9.8-3.2 0-2.5-2-4-5-4z"
            fill="white"
          />
        </svg>
      )}
    </div>
  );
}

// =============================================================================
// AccStatusBadge — clinic account status (active/pending/suspended).
// =============================================================================

const ACC_STATUS: Record<
  ClinicStatus,
  { label: string; variant: string; dot: string }
> = {
  ACTIVE:    { label: 'Activo',       variant: 'success', dot: 'var(--success)' },
  SUSPENDED: { label: 'Suspendido',   variant: 'danger',  dot: 'var(--danger)' },
  TRIAL:     { label: 'Activo',       variant: 'success', dot: 'var(--success)' },
};

const PENDING_ACTIVATION = {
  label: 'Sin activar',
  variant: 'neutral',
  dot: 'var(--text-tertiary)',
};

// `activated` overrides everything except SUSPENDED — the OWNER hasn't
// finished the invite-link "create your password" flow yet, so the
// subscription state doesn't really matter.
export function AccStatusBadge({
  status,
  activated = true,
}: {
  status: ClinicStatus;
  activated?: boolean;
}) {
  const s =
    status === 'SUSPENDED'
      ? ACC_STATUS.SUSPENDED
      : activated
      ? ACC_STATUS[status] ?? ACC_STATUS.ACTIVE
      : PENDING_ACTIVATION;
  return (
    <span className={`badge badge--${s.variant}`}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// =============================================================================
// PayBadge — payment status semantic colors.
// =============================================================================

const PAY_STATUS: Record<
  PaymentStatus,
  { label: (days?: number | null) => string; variant: string; dot: string }
> = {
  ok:          { label: () => 'Al día',                       variant: 'success', dot: 'var(--success)' },
  'due-soon':  { label: d => `Próximo a vencer · ${d ?? 0}d`,  variant: 'warning', dot: 'var(--warning)' },
  overdue:     { label: d => `Vencido · ${Math.abs(d ?? 0)}d`, variant: 'warning', dot: 'var(--warning)' },
  'grace-end': { label: d => `Vencido · ${Math.abs(d ?? 0)}d`, variant: 'danger',  dot: 'var(--danger)' },
  pending:     { label: () => 'Sin activar',                  variant: 'neutral', dot: 'var(--text-tertiary)' },
};

export function PayBadge({
  paymentStatus,
  daysToDue,
}: {
  paymentStatus: PaymentStatus;
  daysToDue: number | null;
}) {
  const s = PAY_STATUS[paymentStatus];
  return (
    <span className={`badge badge--${s.variant}`}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label(daysToDue)}
    </span>
  );
}

// =============================================================================
// LastSeenCell — "En línea ahora" / "hace Nd".
// =============================================================================

export function LastSeenCell({ lastLoginAt }: { lastLoginAt: string | null }) {
  const ls = formatLastSeen(lastLoginAt);
  return (
    <span
      className="row"
      style={{
        gap: 6,
        fontSize: 12.5,
        color: ls.stale ? 'var(--text-tertiary)' : 'var(--text-secondary)',
      }}
    >
      {ls.online && <span className="dot" style={{ background: 'var(--success)' }} />}
      {ls.label}
    </span>
  );
}

// =============================================================================
// Banner — reusable colored stripe for morosidad alerts + payment notices.
// =============================================================================

export type BannerTone = 'warning' | 'warningStrong' | 'danger' | 'info';

interface BannerProps {
  tone: BannerTone;
  icon: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const BANNER_PALETTE: Record<BannerTone, { bg: string; fg: string; border: string }> = {
  warning:       { bg: 'var(--warning-bg)', fg: 'var(--warning)', border: 'rgba(217,119,6,0.28)' },
  warningStrong: { bg: 'var(--warning-bg)', fg: 'var(--warning)', border: 'rgba(217,119,6,0.5)' },
  danger:        { bg: 'var(--danger-bg)',  fg: 'var(--danger)',  border: 'rgba(220,38,38,0.4)' },
  info:          { bg: 'var(--info-bg)',    fg: 'var(--info)',    border: 'rgba(8,145,178,0.3)' },
};

export function Banner({ tone, icon, title, body, action, onAction, onDismiss }: BannerProps) {
  const palette = BANNER_PALETTE[tone];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 16px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: palette.fg,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: palette.fg }}>{title}</div>
        {body && (
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 1 }}>
            {body}
          </div>
        )}
      </div>
      {action && (
        <button
          className="btn btn--secondary btn--sm"
          onClick={onAction}
          style={{ flexShrink: 0 }}
        >
          {action}
        </button>
      )}
      {onDismiss && (
        <button className="btn btn--ghost btn--icon btn--sm" onClick={onDismiss}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// ConsoleMetric — card-shaped metric with semantic tone.
// =============================================================================

interface ConsoleMetricProps {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: IconName;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
}

export function ConsoleMetric({ label, value, sub, icon, tone = 'default' }: ConsoleMetricProps) {
  const toneColor =
    tone === 'success' ? 'var(--success)'
    : tone === 'warning' ? 'var(--warning)'
    : tone === 'danger' ? 'var(--danger)'
    : tone === 'brand' ? 'var(--brand-primary)'
    : 'var(--text-tertiary)';
  return (
    <div className="metric">
      <div className="row row--between">
        <div className="metric__label">{label}</div>
        {icon && <Icon name={icon} size={15} style={{ color: toneColor }} />}
      </div>
      <div
        className="metric__value"
        style={{ color: tone !== 'default' ? toneColor : 'var(--text-primary)' }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// =============================================================================
// CopyField — copy/reveal helper used by NewAccountPage credentials.
// =============================================================================

interface CopyFieldProps {
  value: string;
  mono?: boolean;
  reveal?: boolean;
  onCopy?: () => void;
}

export function CopyField({ value, mono = true, reveal = false, onCopy }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!reveal);

  const display = reveal && !shown ? '•'.repeat(Math.min(value.length, 12)) : value;

  const doCopy = () => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className="row"
      style={{
        gap: 4,
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-muted)',
        padding: '0 4px 0 12px',
        height: 'var(--input-height)',
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--text-primary)',
        }}
      >
        {display}
      </span>
      {reveal && (
        <button
          className="btn btn--ghost btn--icon"
          style={{ height: 28, width: 28 }}
          title={shown ? 'Ocultar' : 'Mostrar'}
          onClick={() => setShown(s => !s)}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={14} />
        </button>
      )}
      <button
        className="btn btn--ghost btn--icon"
        style={{ height: 28, width: 28, color: copied ? 'var(--success)' : undefined }}
        title="Copiar"
        onClick={doCopy}
      >
        <Icon name={copied ? 'check' : 'copy'} size={14} />
      </button>
    </div>
  );
}

// =============================================================================
// ToastHost — singleton at the bottom; subscribed to the UI store.
// =============================================================================

import { useUIStore } from '../../store/ui.store';

export function ToastHost() {
  const toast = useUIStore(s => s.toast);
  const clear = useUIStore(s => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 3200);
    return () => clearTimeout(t);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: '#0F172A',
        color: 'white',
        padding: '11px 18px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <Icon name="checkCircle" size={16} style={{ color: '#4ADE80' }} />
      {toast}
    </div>
  );
}

// =============================================================================
// SectionTitle — small uppercase label used in drawer / forms.
// =============================================================================

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '4px 0 6px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Re-exports — convenience helpers used by pages
// =============================================================================

export { formatDateLong, initialsOf, money };
