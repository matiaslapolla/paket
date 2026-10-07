import { useId, type ReactNode } from 'react';
import './controls.css';

/** A collapsible panel; whoever lays the panels out owns which are open. */
export function Panel({ title, open, onOpenChange, className = '', children }: {
  title: string; open: boolean; onOpenChange(open: boolean): void; className?: string; children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <aside className={`panel ${className}`} aria-label={title}>
      <h2 className="panel-head">
        <button type="button" className="panel-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => onOpenChange(!open)}>
          {title}
          <Chevron />
        </button>
      </h2>
      <div className="panel-body" id={bodyId} hidden={!open}>{children}</div>
    </aside>
  );
}

function Chevron() {
  return (
    <svg className="chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A labelled cluster of controls. */
export function Group({ label, hideLabel, children }: { label: string; hideLabel?: boolean; children: ReactNode }) {
  const id = useId();
  if (hideLabel) return <div className="field" role="group" aria-label={label}>{children}</div>;
  return (
    <div className="field" role="group" aria-labelledby={id}>
      <span className="field-label" id={id}>{label}</span>
      {children}
    </div>
  );
}

export interface Option<V extends string> { value: V; label: string; lang?: string }

export function Segmented<V extends string>({ options, value, onChange }: {
  options: Option<V>[]; value: V | null; onChange(v: V): void;
}) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} type="button" className="seg-opt" lang={o.lang} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle(): void }) {
  return (
    <button type="button" className="switch" aria-pressed={on} onClick={onToggle}>
      <span className="switch-label">{label}</span>
      <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
    </button>
  );
}
