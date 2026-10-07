import { useEffect, useRef } from 'react';
import type { EffectName } from '../../../src/core';
import { PRESETS, SCENES, engineHost, paket, playPreset, setScene, useEngineStatus } from '../engine';
import { useT, type I18nKey } from '../i18n';
import { Group, Segmented } from './controls';
import './Motion.css';

// the library names presets and scenes in Spanish, so the HUD labels them by key
const PRESET_TEXT: Record<string, readonly [name: I18nKey, hint: I18nKey]> = {
  patrol: ['preset.patrol', 'preset.patrol.hint'],
  tripleJump: ['preset.tripleJump', 'preset.tripleJump.hint'],
  doubleJump: ['preset.doubleJump', 'preset.doubleJump.hint'],
  climb: ['preset.climb', 'preset.climb.hint'],
  nightShift: ['preset.nightShift', 'preset.nightShift.hint'],
  reboot: ['preset.reboot', 'preset.reboot.hint'],
};
const SCENE_TEXT: Record<string, I18nKey> = { '1': 'scene.1', '2': 'scene.2', '3': 'scene.3', '4': 'scene.4' };

/** jelly and reset are instantaneous, so they have no "running" state to show */
const EFFECTS: { name: EffectName; label: I18nKey; lasts: boolean }[] = [
  { name: 'disassemble', label: 'effect.disassemble', lasts: true },
  { name: 'blackhole', label: 'effect.blackhole', lasts: true },
  { name: 'jelly', label: 'effect.jelly', lasts: false },
  { name: 'glitch', label: 'effect.glitch', lasts: true },
  { name: 'reset', label: 'effect.reset', lasts: false },
];

export function MotionControls() {
  const t = useT();
  const status = useEngineStatus();
  const activePreset = status.preset === null ? null : Object.keys(PRESETS).find(k => PRESETS[k].name === status.preset) ?? null;

  return (
    <>
      <Group label={t('motion.presets')}>
        <div className="presets">
          {Object.keys(PRESETS).map(key => {
            const text = PRESET_TEXT[key];
            const on = activePreset === key;
            return (
              <button key={key} type="button" className="btn preset" aria-pressed={on} onClick={() => (on ? paket.stop() : playPreset(key))}>
                <span className="preset-name">{text ? t(text[0]) : key}</span>
                {text && <span className="preset-hint">{t(text[1])}</span>}
              </button>
            );
          })}
        </div>
      </Group>
      <Group label={t('motion.effects')}>
        <div className="effects">
          {EFFECTS.map(e => (
            <button key={e.name} type="button" className="btn" aria-pressed={e.lasts ? status.effect === e.name : undefined} onClick={() => paket.effect(e.name)}>
              {t(e.label)}
            </button>
          ))}
        </div>
      </Group>
      <Group label={t('motion.scenes')}>
        <Segmented
          options={Object.keys(SCENES).map(k => ({ value: k, label: SCENE_TEXT[k] ? t(SCENE_TEXT[k]) : k }))}
          value={status.scene}
          onChange={setScene}
        />
      </Group>
    </>
  );
}

/** The live 2D engine, mounted from its detached host, with the keys that drive it. */
export function SourceView({ showKeys = true }: { showKeys?: boolean }) {
  const t = useT();
  const screen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = screen.current;
    if (!box) return;
    box.appendChild(engineHost);
    return () => { if (engineHost.parentNode === box) box.removeChild(engineHost); };
  }, []);

  const [before, after] = t('source.caption').split('{file}');
  return (
    <>
      <figure className="source">
        <div ref={screen} className="source-screen" />
        <figcaption className="source-caption">{before}<code>src/core.ts</code>{after}</figcaption>
      </figure>
      {showKeys && <Group label={t('keys.title')}><KeyLegend /></Group>}
    </>
  );
}

export function KeyLegend() {
  const t = useT();
  const or = <span className="keys-or">/</span>;
  return (
    <dl className="keys">
      <div><dt><kbd>←</kbd><kbd>→</kbd>{or}<kbd>A</kbd><kbd>D</kbd></dt><dd>{t('keys.move')}</dd></div>
      <div><dt><kbd>Shift</kbd></dt><dd>{t('keys.run')}</dd></div>
      <div><dt><kbd>{t('keys.space')}</kbd>{or}<kbd>↑</kbd></dt><dd>{t('keys.jump')}</dd></div>
      <div><dt><kbd>↓</kbd></dt><dd>{t('keys.crouch')}</dd></div>
      <div><dt><kbd>1</kbd><span className="keys-or">–</span><kbd>4</kbd></dt><dd>{t('keys.scenes')}</dd></div>
      <div><dt><kbd>Esc</kbd></dt><dd>{t('keys.stop')}</dd></div>
    </dl>
  );
}
