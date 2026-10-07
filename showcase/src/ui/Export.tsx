import { useId, useState } from 'react';
import { exportGLB, exportPNG, exportSTL } from '../scene/exporters';
import { useT, type I18nKey } from '../i18n';
import './Export.css';

type Format = 'stl' | 'glb' | 'png';
const FORMATS: { id: Format; label: I18nKey; hint: I18nKey; run: () => void | Promise<void> }[] = [
  { id: 'stl', label: 'export.stl', hint: 'export.stl.hint', run: exportSTL },
  { id: 'glb', label: 'export.glb', hint: 'export.glb.hint', run: exportGLB },
  { id: 'png', label: 'export.png', hint: 'export.png.hint', run: exportPNG },
];

// let the busy state paint before a synchronous export blocks the main thread
const nextPaint = () => new Promise<void>(r => requestAnimationFrame(() => setTimeout(r)));

export function ExportControls() {
  const t = useT();
  const base = useId();
  const [busy, setBusy] = useState<Format | null>(null);
  const [failed, setFailed] = useState<Format | null>(null);

  async function run(f: (typeof FORMATS)[number]) {
    setBusy(f.id); setFailed(null);
    try { await nextPaint(); await f.run(); } catch { setFailed(f.id); } finally { setBusy(null); }
  }

  return (
    <ul className="exports">
      {FORMATS.map(f => (
        <li key={f.id}>
          <button type="button" className="btn export-btn" disabled={busy !== null} aria-busy={busy === f.id} aria-describedby={`${base}-${f.id}`} onClick={() => run(f)}>
            {t(f.label)}
          </button>
          <span id={`${base}-${f.id}`} className={`export-hint${failed === f.id ? ' is-error' : ''}`} aria-live="polite">
            {busy === f.id ? t('export.busy') : failed === f.id ? t('export.failed') : t(f.hint)}
          </span>
        </li>
      ))}
    </ul>
  );
}
