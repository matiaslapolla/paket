import { useEffect, useImperativeHandle, useRef, forwardRef, type CSSProperties } from 'react';
import { createPaket, type PaketController, type PaketOptions, type Scene, type Preset, type EffectName } from '../core';

export interface PaketProps extends Omit<PaketOptions, 'scene'> {
  /** escena activa (objeto o clave de `scenes`) */
  scene?: Scene | string;
  /** preset a reproducir; cambiar el valor lo dispara (usá un objeto nuevo o un `key` para repetir) */
  preset?: Preset | null;
  /** efecto a disparar; igual que `preset`, se dispara al cambiar */
  effect?: EffectName | null;
  className?: string;
  style?: CSSProperties;
  /** activa la captura de teclado solo si el host está enfocado (default) */
  autoFocus?: boolean;
}

/**
 * <Paket /> — envuelve el motor. El ref expone el PaketController completo
 * (play, effect, setInput, teleport, ...), que es la vía imperativa recomendada
 * para integrarlo con la app: por ejemplo `ref.current.effect('jelly')` cuando
 * llega una notificación.
 */
export const Paket = forwardRef<PaketController | null, PaketProps>(function Paket(
  { scene, preset, effect, className, style, autoFocus, palette, draggable, onState, onEvent, ...rest }, ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const ctrl = useRef<PaketController | null>(null);
  const cbs = useRef({ onState, onEvent }); cbs.current = { onState, onEvent };

  // crear / destruir una sola vez (las opciones de construcción no son reactivas)
  useEffect(() => {
    if (!host.current) return;
    const initialScene = typeof scene === 'string' ? rest.scenes?.[scene] : scene;
    ctrl.current = createPaket(host.current, {
      ...rest, palette, draggable, scene: initialScene,
      onState: s => cbs.current.onState?.(s),
      onEvent: e => cbs.current.onEvent?.(e),
    });
    if (autoFocus) host.current.focus();
    return () => { ctrl.current?.destroy(); ctrl.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ctrl.current as PaketController, []);

  useEffect(() => { if (scene) ctrl.current?.setScene(scene); }, [scene]);
  useEffect(() => { if (palette) ctrl.current?.setPalette(palette); }, [palette]);
  useEffect(() => { if (draggable !== undefined) ctrl.current?.setDraggable(draggable); }, [draggable]);
  useEffect(() => { if (preset) ctrl.current?.play(preset); }, [preset]);
  useEffect(() => { if (effect) ctrl.current?.effect(effect); }, [effect]);

  return <div ref={host} className={className} style={{ outline: 'none', ...style }} />;
});

export default Paket;
