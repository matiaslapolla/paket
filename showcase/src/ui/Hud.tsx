import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShowcase, type Lang } from '../store';
import { LOCALE, useT } from '../i18n';
import { Panel, Segmented } from './controls';
import { KeyLegend, MotionControls, SourceView } from './Motion';
import { ViewControls } from './View';
import { CustomiseControls } from './Customise';
import { ExportControls } from './Export';
import { Bom, TitleBlock } from './Specs';
import { MobileSheet } from './MobileSheet';
import { MOBILE, WIDE, useMedia } from './useMedia';
import './Hud.css';

/**
 * Everything drawn over the WebGL sheet. The root lets pointer events through to the canvas;
 * only panels and controls take them, so the model stays orbitable around them.
 */
export function Hud() {
  const t = useT();
  const lang = useShowcase(s => s.lang);
  const mobile = useMedia(MOBILE);

  useEffect(() => {
    document.documentElement.lang = LOCALE[lang];
    document.title = t('doc.title');
  }, [lang, t]);

  return (
    <div className="hud">
      <div className="hud-frame" aria-hidden="true" />
      <header className="hud-top">
        <div className="hud-brand">
          <h1 className="hud-wordmark">{t('brand.name')}</h1>
          <p className="hud-subtitle">{t('brand.subtitle')}</p>
        </div>
        <LangToggle />
      </header>
      {mobile ? <MobileSheet /> : <DesktopPanels />}
    </div>
  );
}

function LangToggle() {
  const t = useT();
  const lang = useShowcase(s => s.lang);
  const setLang = useShowcase(s => s.setLang);
  return (
    <div className="hud-lang" role="group" aria-label={t('lang.label')}>
      <Segmented<Lang>
        options={[{ value: 'en', label: t('lang.en'), lang: LOCALE.en }, { value: 'zh', label: t('lang.zh'), lang: LOCALE.zh }]}
        value={lang}
        onChange={setLang}
      />
    </div>
  );
}

type PanelId = 'motion' | 'source' | 'keys' | 'view' | 'customise' | 'export' | 'bom' | 'tb';
/** what folds first, per column, when a column does not fit the window on load */
const FOLD_LEFT: PanelId[] = ['keys', 'source'];
const FOLD_RIGHT: PanelId[] = ['export', 'customise', 'tb'];
const overflows = (el: HTMLElement | null) => !!el && el.scrollHeight > el.clientHeight + 1;

function DesktopPanels() {
  const t = useT();
  const wide = useMedia(WIDE);
  const exploded = useShowcase(s => s.exploded);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  // Panels start open and fold, in order, until both columns fit; after that only the user folds them.
  // Fitting waits for the webfonts, since fallback metrics are taller. Nothing is remembered across reloads.
  const [folded, setFolded] = useState<ReadonlySet<PanelId>>(() => new Set<PanelId>(wide ? [] : ['export', 'customise']));
  const [phase, setPhase] = useState<'fonts' | 'fit' | 'done'>('fonts');

  useEffect(() => {
    let live = true;
    const fit = () => { if (live) setPhase(p => (p === 'fonts' ? 'fit' : p)); };
    document.fonts.ready.then(fit);
    const fallback = setTimeout(fit, 1500);
    return () => { live = false; clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    const setInsets = useShowcase.getState().setInsets;
    const measure = () => {
      const l = left.current?.getBoundingClientRect(), r = right.current?.getBoundingClientRect(), d = drawing.current?.getBoundingClientRect();
      // the exploded assembly is wide enough to reach the bill of materials, so frame it clear of that too
      const edge = Math.min(r?.left ?? window.innerWidth, exploded && d ? d.left : window.innerWidth);
      setInsets({ top: 0, bottom: 0, left: l ? l.right : 0, right: window.innerWidth - edge });
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const n of [left.current, right.current, drawing.current]) if (n) ro.observe(n);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [exploded]);

  useLayoutEffect(() => {
    if (phase !== 'fit') return;
    const next = (overflows(right.current) && FOLD_RIGHT.find(id => !folded.has(id)))
      || (overflows(left.current) && FOLD_LEFT.find(id => !folded.has(id)));
    if (next) setFolded(new Set(folded).add(next));
    else setPhase('done');
  }, [phase, folded]);

  const fitting = phase === 'done' ? '' : ' is-fitting';
  const panel = (id: PanelId) => ({
    open: !folded.has(id),
    onOpenChange(open: boolean) {
      setPhase('done');
      const f = new Set(folded);
      if (open) f.delete(id); else f.add(id);
      setFolded(f);
    },
  });

  return (
    <>
      <div ref={left} className={`hud-col hud-left${fitting}`}>
        <Panel title={t('panel.motion')} {...panel('motion')}><MotionControls /></Panel>
        <div className="hud-bottom">
          <Panel title={t('panel.source')} {...panel('source')}><SourceView showKeys={false} /></Panel>
          <Panel title={t('keys.title')} {...panel('keys')}><KeyLegend /></Panel>
        </div>
      </div>
      <div className={`hud-right${fitting}`}>
        <div ref={right} className="hud-col hud-stack">
          <Panel title={t('panel.view')} {...panel('view')}><ViewControls /></Panel>
          <Panel title={t('panel.customise')} {...panel('customise')}><CustomiseControls /></Panel>
          <Panel title={t('panel.export')} {...panel('export')}><ExportControls /></Panel>
        </div>
        <div ref={drawing} className="hud-drawing">
          {exploded && <Panel title={t('panel.bom')} className="panel-bom" {...panel('bom')}><Bom /></Panel>}
          <Panel title={t('panel.titleBlock')} className="panel-tb" {...panel('tb')}><TitleBlock wide={wide} /></Panel>
        </div>
      </div>
    </>
  );
}
