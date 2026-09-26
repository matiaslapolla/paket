import { createPaket, type EffectName, type PaketEvent } from '../src/core';
import { SCENES, PRESETS } from '../src/scenes';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $<HTMLDivElement>('stage');
const badge = $('badge'), hint = $('hint'), log = $('log');

const paket = createPaket(stage, {
  scenes: SCENES,
  scene: SCENES['1'],
  draggable: true,
  keyboard: { target: 'host' },
  onState: () => {},
  onEvent: (ev: PaketEvent) => {
    if (ev.type === 'presetStart') { badge.textContent = ev.name; badge.classList.add('on'); pressed('#presets', ev.name); }
    if (ev.type === 'presetEnd') { badge.classList.remove('on'); pressed('#presets', ''); }
    if (ev.type === 'effectStart') pressed('#effects', ev.name);
    if (ev.type === 'effectEnd') pressed('#effects', '');
    if (ev.type === 'grab' || ev.type === 'jump') hint.classList.add('hidden');
    const line = document.createElement('div');
    line.textContent = ev.type + (ev.type === 'jump' && ev.double ? ' ×2' : ev.type === 'land' ? ` ${Math.round(ev.impact)}` : '');
    log.prepend(line); while (log.children.length > 6) log.lastChild?.remove();
  },
});

function pressed(sel: string, name: string) {
  document.querySelectorAll<HTMLButtonElement>(`${sel} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.name === name)));
}

// escenarios
const scenesBox = $('scenes');
for (const [key, s] of Object.entries(SCENES)) {
  const b = document.createElement('button'); b.textContent = `${key} ${s.name}`; b.dataset.name = key;
  b.setAttribute('aria-pressed', String(s === paket.getScene()));
  b.onclick = () => { paket.setScene(key); pressed('#scenes', key); stage.focus(); };
  scenesBox.appendChild(b);
}
// presets
const presetsBox = $('presets');
const hints: Record<string, string> = { patrol: 'ida y vuelta', tripleJump: 'corre y salta', doubleJump: 'salto + giro', climb: 'escenario Fábrica', nightShift: 'mira, pestañea, alerta', reboot: 'glitch y vuelve' };
for (const [key, p] of Object.entries(PRESETS)) {
  const b = document.createElement('button'); b.className = 'preset'; b.dataset.name = p.name;
  b.innerHTML = `${p.name}<small>${hints[key] ?? ''}</small>`; b.setAttribute('aria-pressed', 'false');
  b.onclick = () => { paket.play(p); stage.focus(); };
  presetsBox.appendChild(b);
}
// efectos
const effectsBox = $('effects');
const effects: [EffectName, string][] = [['disassemble', 'Desarmar'], ['blackhole', 'Agujero negro'], ['jelly', 'Gelatina'], ['glitch', 'Glitch'], ['reset', 'Reset']];
for (const [name, label] of effects) {
  const b = document.createElement('button'); b.textContent = label; b.dataset.name = name; b.setAttribute('aria-pressed', 'false');
  b.onclick = () => { paket.effect(name); stage.focus(); };
  effectsBox.appendChild(b);
}
// teclas numéricas al cambiar escenario por teclado también actualizan los botones
stage.addEventListener('keydown', e => { if (SCENES[e.key]) pressed('#scenes', e.key); });

// lectura de estado
const sState = $('s-state'), sX = $('s-x'), sVy = $('s-vy'), sJ = $('s-j');
setInterval(() => {
  const s = paket.getState();
  sState.textContent = s.effect ?? s.state; sX.textContent = String(Math.round(s.x)); sVy.textContent = String(Math.round(s.vy)); sJ.textContent = `${s.jumpsUsed}/2`;
}, 80);
