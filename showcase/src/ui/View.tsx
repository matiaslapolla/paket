import { useShallow } from 'zustand/react/shallow';
import { useShowcase, type RenderMode, type ViewName } from '../store';
import { useT, type I18nKey } from '../i18n';
import { Group, Segmented, Switch } from './controls';

const RENDER_MODES: [RenderMode, I18nKey][] = [['blueprint', 'render.blueprint'], ['prototype', 'render.prototype'], ['hybrid', 'render.hybrid']];
const VIEWS: [ViewName, I18nKey][] = [['iso', 'view.iso'], ['front', 'view.front'], ['side', 'view.side'], ['top', 'view.top']];
type Flag = 'ortho' | 'turntable' | 'exploded' | 'showDims' | 'showSeams';
const FLAGS: [Flag, I18nKey][] = [
  ['ortho', 'toggle.ortho'], ['turntable', 'toggle.turntable'], ['exploded', 'toggle.exploded'],
  ['showDims', 'toggle.dims'], ['showSeams', 'toggle.seams'],
];

export function ViewControls() {
  const t = useT();
  const s = useShowcase(useShallow(s => ({
    renderMode: s.renderMode, view: s.view, setRenderMode: s.setRenderMode, setView: s.setView, toggle: s.toggle,
    ortho: s.ortho, turntable: s.turntable, exploded: s.exploded, showDims: s.showDims, showSeams: s.showSeams,
  })));

  return (
    <>
      <Group label={t('view.render')}>
        <Segmented options={RENDER_MODES.map(([value, k]) => ({ value, label: t(k) }))} value={s.renderMode} onChange={s.setRenderMode} />
      </Group>
      <Group label={t('view.camera')}>
        <Segmented options={VIEWS.map(([value, k]) => ({ value, label: t(k) }))} value={s.view} onChange={s.setView} />
      </Group>
      <Group label={t('view.display')}>
        <div className="switches">
          {FLAGS.map(([flag, k]) => <Switch key={flag} label={t(k)} on={s[flag]} onToggle={() => s.toggle(flag)} />)}
        </div>
      </Group>
    </>
  );
}
