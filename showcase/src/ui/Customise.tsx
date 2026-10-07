import { useId } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Palette } from '../../../src/sprite';
import { COLORWAYS, PITCH_RANGE, useShowcase, type Colorway, type Finish } from '../store';
import { DENSITY, PALETTE_KEYS, type MaterialId } from '../model/voxels';
import { mm, useT } from '../i18n';
import { useOverallSize } from './Specs';
import { Group, Segmented } from './controls';
import './Customise.css';

const FINISHES: Finish[] = ['matte', 'gloss', 'metal'];
const MATERIALS = Object.keys(DENSITY) as MaterialId[];

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
  const overall = useOverallSize();

  return (
    <>
      <Group label={t('custom.colorway')}>
        <div className="colorways">
          {Object.entries(COLORWAYS).map(([key, p]) => (
            <button key={key} type="button" className="btn colorway" aria-pressed={samePalette(s.palette, p)} onClick={() => s.setPalette(p)}>
              <span className="colorway-strip" aria-hidden="true">
                {(['body', 'shade', 'eye'] as const).map(k => <span key={k} style={{ background: p[k] }} />)}
              </span>
              <span className="colorway-name">{t(`colorway.${key as Colorway}`)}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group label={t('custom.colors')} hideLabel>
        <div className="colors">
          {PALETTE_KEYS.map(k => (
            <label key={k} className="color">
              <span className="color-name">{t(`color.${k}`)}</span>
              <input type="color" value={hex6(s.palette[k])} onChange={e => s.setPalette({ [k]: e.target.value })} />
              <span className="color-hex tabular">{hex6(s.palette[k]).toUpperCase()}</span>
            </label>
          ))}
        </div>
      </Group>

      <Group label={t('custom.finish')}>
        <Segmented options={FINISHES.map(value => ({ value, label: t(`finish.${value}`) }))} value={s.finish} onChange={s.setFinish} />
      </Group>

      <Group label={t('custom.material')}>
        <Segmented options={MATERIALS.map(value => ({ value, label: t(`material.${value}`) }))} value={s.material} onChange={s.setMaterial} />
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
          <span className="field-label">{overall.label}</span>
          <span className="tabular">{overall.value}</span>
        </div>
      </div>
    </>
  );
}
