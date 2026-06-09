import type { ReactNode } from 'react';
import { Icon } from '../common/Icon';

interface ConsoleTopbarProps {
  title: string;
  sub?: string;
  right?: ReactNode;
  onMenuClick: () => void;
}

export function ConsoleTopbar({ title, sub, right, onMenuClick }: ConsoleTopbarProps) {
  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenuClick} title="Menú">
        <Icon name="menu" size={18} />
      </button>
      <div>
        <div className="topbar__title">{title}</div>
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{sub}</div>
        )}
      </div>
      <div className="search" style={{ marginLeft: 'auto' }}>
        <Icon name="search" size={14} style={{ color: 'var(--text-tertiary)' }} />
        <input placeholder="Buscar consultorio, doctor, usuario…" />
        <span className="search__kbd">⌘K</span>
      </div>
      {right}
    </header>
  );
}
