import { useEffect, useId, useRef, useState } from 'react';
import { useT, type I18nKey } from '../i18n';
import { MotionControls, SourceView } from './Motion';
import { ViewControls } from './View';
import { CustomiseControls } from './Customise';
import { ExportControls } from './Export';
import { Bom, TitleBlock } from './Specs';
import { useMedia } from './useMedia';
import { useShowcase } from '../store';
import './MobileSheet.css';

type Tab = 'motion' | 'view' | 'customise' | 'specs';
const TABS: [Tab, I18nKey][] = [['motion', 'panel.motion'], ['view', 'panel.view'], ['customise', 'panel.customise'], ['specs', 'panel.specs']];

/**
 * Below 720 px the panels become one bottom sheet. Collapsed, only the tab bar shows.
 * Tabs are plain tab-order stops: arrow keys belong to the engine, which drives Paket from the window.
 */
export function MobileSheet() {
  const t = useT();
  const id = useId();
  const [tab, setTab] = useState<Tab>('motion');
  const [open, setOpen] = useState(false);
  const fineKeyboard = useMedia('(hover: hover) and (pointer: fine)');
  const sheet = useRef<HTMLElement>(null);

  // the sheet slides on transform, so its covered height comes from its state, not from layout
  useEffect(() => {
    const setInsets = useShowcase.getState().setInsets;
    const measure = () => {
      const el = sheet.current;
      if (!el) return;
      const peek = parseFloat(getComputedStyle(el).getPropertyValue('--sheet-peek')) || 88;
      setInsets({ top: 0, left: 0, right: 0, bottom: open ? el.offsetHeight : peek });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  const pick = (k: Tab) => {
    if (open && k === tab) setOpen(false);
    else { setTab(k); setOpen(true); }
  };

  return (
    <section ref={sheet} className="sheet" data-open={open} aria-label={t('sheet.tabs')}>
      <button
        type="button"
        className="sheet-handle"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        aria-label={t(open ? 'sheet.collapse' : 'sheet.expand')}
        onClick={() => setOpen(o => !o)}
      >
        <span className="sheet-grip" />
      </button>
      <div className="sheet-tabs" role="tablist" aria-label={t('sheet.tabs')}>
        {TABS.map(([k, label]) => (
          <button
            key={k}
            id={`${id}-${k}`}
            type="button"
            role="tab"
            className="sheet-tab"
            aria-selected={tab === k}
            aria-controls={`${id}-body`}
            onClick={() => pick(k)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div id={`${id}-body`} className="sheet-body" role="tabpanel" aria-labelledby={`${id}-${tab}`} inert={!open}>
        {tab === 'motion' && <><SourceView showKeys={fineKeyboard} /><MotionControls /></>}
        {tab === 'view' && <ViewControls />}
        {tab === 'customise' && <CustomiseControls />}
        {tab === 'specs' && (
          <>
            <div className="field">
              <h2 className="sheet-heading">{t('panel.titleBlock')}</h2>
              <TitleBlock wide={false} />
            </div>
            <div className="field">
              <h2 className="sheet-heading">{t('panel.bom')}</h2>
              <Bom />
            </div>
            <div className="field">
              <h2 className="sheet-heading">{t('panel.export')}</h2>
              <ExportControls />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
