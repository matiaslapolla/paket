import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useShowcase, type Lang } from '../store';
import { modelStats } from '../model/voxels';
import { mm, useT } from '../i18n';
import { COLOUR_TEXT, FINISH_TEXT, MATERIAL_TEXT } from './Customise';
import './Specs.css';

const locale = (lang: Lang) => (lang === 'zh' ? 'zh-CN' : 'en-US');
const formats = (lang: Lang) => ({
  int: new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 }).format,
  dec: new Intl.NumberFormat(locale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format,
});

function useStats() {
  const s = useShowcase(useShallow(s => ({ pitch: s.pitch, material: s.material, finish: s.finish, lang: s.lang, palette: s.palette })));
  const stats = useMemo(() => modelStats(s.pitch, s.material), [s.pitch, s.material]);
  const fmt = useMemo(() => formats(s.lang), [s.lang]);
  return { ...s, stats, fmt };
}

type CellId = 'project' | 'drawing' | 'drawnBy' | 'licence' | 'overall' | 'pitch' | 'parts' | 'voxels' | 'volume' | 'mass' | 'material' | 'finish';
// a wide sheet reads three rows of four; a narrow one pairs them, with the long dimension on a row of its own
const WIDE_ORDER: CellId[] = ['project', 'drawing', 'drawnBy', 'licence', 'overall', 'pitch', 'parts', 'voxels', 'volume', 'mass', 'material', 'finish'];
const NARROW_ORDER: CellId[] = ['project', 'drawing', 'drawnBy', 'overall', 'pitch', 'parts', 'voxels', 'volume', 'mass', 'material', 'finish', 'licence'];

/** The drawing's title block. Every number is computed from the model at the current pitch and material. */
export function TitleBlock({ wide }: { wide: boolean }) {
  const t = useT();
  const { pitch, material, finish, stats, fmt } = useStats();
  const { w, h, d } = stats.sizeMm;
  const unit = t('unit.mm');

  const cells: Record<CellId, { label: ReactNode; value: ReactNode; data?: boolean }> = {
    project: { label: t('tb.project'), value: t('brand.name') },
    drawing: { label: t('tb.drawing'), value: t('tb.drawingValue') },
    drawnBy: { label: t('tb.drawnBy'), value: t('tb.author') },
    licence: { label: t('tb.licence'), value: t('tb.licenceValue') },
    overall: {
      label: `${t('custom.overall')} ${t('dim.width')} × ${t('dim.height')} × ${t('dim.depth')}`,
      value: `${mm(w)} × ${mm(h)} × ${mm(d)} ${unit}`, data: true,
    },
    pitch: { label: t('custom.pitch'), value: `${mm(pitch)} ${unit}`, data: true },
    parts: { label: t('tb.parts'), value: fmt.int(stats.parts.length), data: true },
    voxels: { label: t('tb.voxels'), value: fmt.int(stats.voxels), data: true },
    volume: { label: t('tb.volume'), value: `${fmt.dec(stats.volumeCm3)} ${t('unit.cm3')}`, data: true },
    mass: { label: t('tb.mass'), value: `${fmt.dec(stats.massG)} ${t('unit.g')}`, data: true },
    material: { label: t('tb.material'), value: t(MATERIAL_TEXT[material]) },
    finish: { label: t('custom.finish'), value: t(FINISH_TEXT[finish]) },
  };

  return (
    <div className={`tb ${wide ? 'tb-wide' : 'tb-narrow'}`}>
      <dl className="tb-grid">
        {(wide ? WIDE_ORDER : NARROW_ORDER).map(id => (
          <div key={id} className={`tb-cell tb-${id}`}>
            <dt>{cells[id].label}</dt>
            <dd className={cells[id].data ? 'tabular' : undefined}>{cells[id].value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Parts list, numbered like the balloons the exploded view draws (PART_ORDER). */
export function Bom() {
  const t = useT();
  const { stats, fmt, palette } = useStats();
  return (
    <div className="bom-wrap">
      <table className="bom">
        <thead>
          <tr>
            <th scope="col" className="bom-no">{t('bom.no')}</th>
            <th scope="col">{t('bom.part')}</th>
            <th scope="col" className="num">{t('bom.voxels')}</th>
            <th scope="col" className="num">{t('bom.volume')}</th>
            <th scope="col" className="num">{t('bom.mass')}</th>
            <th scope="col">{t('bom.colours')}</th>
          </tr>
        </thead>
        <tbody>
          {stats.parts.map((p, i) => (
            <tr key={p.part}>
              <td className="bom-no"><span className="balloon tabular">{i + 1}</span></td>
              <th scope="row">{t(`part.${p.part}`)}</th>
              <td className="num tabular">{fmt.int(p.voxels)}</td>
              <td className="num tabular">{fmt.dec(p.volumeCm3)}</td>
              <td className="num tabular">{fmt.dec(p.massG)}</td>
              <td>
                <span className="swatches" role="img" aria-label={p.keys.map(k => t(COLOUR_TEXT[k])).join(', ')}>
                  {p.keys.map(k => <span key={k} title={t(COLOUR_TEXT[k])} style={{ background: palette[k] }} />)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <th scope="row">{t('bom.total')}</th>
            <td className="num tabular">{fmt.int(stats.voxels)}</td>
            <td className="num tabular">{fmt.dec(stats.volumeCm3)}</td>
            <td className="num tabular">{fmt.dec(stats.massG)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
