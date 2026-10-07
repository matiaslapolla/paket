import { useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Palette } from '../../../src/sprite';
import { COLORWAYS, PITCH_RANGE, useShowcase, type Finish } from '../store';
import { modelStats, type MaterialId, type PaletteKey } from '../model/voxels';
import { mm, useT, type I18nKey } from '../i18n';
import { Group, Segmented } from './controls';
import './Customise.css';

export const COLOUR_TEXT: Record<PaletteKey, I18nKey> = {
  body: 'colour.body', shade: 'colour.shade', visor: 'colour.visor', eye: 'colour.eye', glow: 'colour.glow',
};
export const FINISH_TEXT: Record<Finish, I18nKey> = { matte: 'finish.matte', gloss: 'finish.gloss', metal: 'finish.metal' };
export const MATERIAL_TEXT: Record<MaterialId, I18nKey> = {
  abs: 'material.abs', pla: 'material.pla', resin: 'material.resin', zinc: 'material.zinc',
};
const COLOURWAY_TEXT: Record<string, I18nKey> = {
  senda: 'colourway.senda', ember: 'colourway.ember', moss: 'colourway.moss', ink: 'colourway.ink', snow: 'colourway.snow',
};
const PALETTE_KEYS = Object.keys(COLOUR_TEXT) as PaletteKey[];

/** `<input type="color">` only accepts lowercase #rrggbb. */
function hex6(c: string) {
  const h = c.trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(h) ? `#${[...h.slice(1)].map(d => d + d).join('')}` : h;
}
const samePalette = (a: Palette, b: Palette) => PALETTE_KEYS.every(k => hex6(a[k]) === hex6(b[k]));

export function CustomiseControls() {
  const t = useT();
  const pitchId = useId();
  const s = useShowcase(useShallow(s => ({
    palette: s.palette, finish: s.finish, material: s.material, pitch: s.pitch,
    setPalette: s.setPalette, setFinish: s.setFinish, setMaterial: s.setMaterial, setPitch: s.setPitch,
  })));
  const size = useMemo(() => modelStats(s.pitch, s.material).sizeMm, [s.pitch, s.material]);

  return (
    <>
      <Group label={t('custom.colourway')}>
        <div className="colourways">
          {Object.entries(COLORWAYS).map(([key, p]) => (
            <button key={key} type="button" className="btn colourway" aria-pressed={samePalette(s.palette, p)} onClick={() => s.setPalette(p)}>
              <span className="colourway-strip" aria-hidden="true">
                {(['body', 'shade', 'eye'] as const).map(k => <span key={k} style={{ background: p[k] }} />)}
              </span>
              <span className="colourway-name">{COLOURWAY_TEXT[key] ? t(COLOURWAY_TEXT[key]) : key}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group label={t('custom.colours')} hideLabel>
        <div className="colours">
          {PALETTE_KEYS.map(k => (
            <label key={k} className="colour">
              <span className="colour-name">{t(COLOUR_TEXT[k])}</span>
              <input type="color" value={hex6(s.palette[k])} onChange={e => s.setPalette({ [k]: e.target.value })} />
              <span className="colour-hex tabular">{hex6(s.palette[k]).toUpperCase()}</span>
            </label>
          ))}
        </div>
      </Group>

      <Group label={t('custom.finish')}>
        <Segmented options={(Object.keys(FINISH_TEXT) as Finish[]).map(value => ({ value, label: t(FINISH_TEXT[value]) }))} value={s.finish} onChange={s.setFinish} />
      </Group>

      <Group label={t('custom.material')}>
        <Segmented options={(Object.keys(MATERIAL_TEXT) as MaterialId[]).map(value => ({ value, label: t(MATERIAL_TEXT[value]) }))} value={s.material} onChange={s.setMaterial} />
      </Group>

      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor={pitchId}>{t('custom.pitch')}</label>
          <output className="pitch-value tabular" htmlFor={pitchId}>{mm(s.pitch)} {t('unit.mm')}</output>
        </div>
        <input
          id={pitchId}
          className="range"
          type="range"
          min={PITCH_RANGE.min}
          max={PITCH_RANGE.max}
          step={PITCH_RANGE.step}
          value={s.pitch}
          onChange={e => s.setPitch(Number(e.target.value))}
        />
        <div className="field-row overall">
          <span className="field-label">{t('custom.overall')} {t('dim.width')} × {t('dim.height')} × {t('dim.depth')}</span>
          <span className="tabular">{mm(size.w)} × {mm(size.h)} × {mm(size.d)} {t('unit.mm')}</span>
        </div>
      </div>
    </>
  );
}
