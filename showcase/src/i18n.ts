import { useCallback } from 'react';
import { useShowcase, type Lang } from './store';

/** Every visible string. Keys are grouped by surface; `{name}` placeholders are filled by `t(key, vars)`. */
const en = {
  'part.head': 'Head',
  'part.torso': 'Torso',
  'part.armL': 'Left arm',
  'part.armR': 'Right arm',
  'part.legL': 'Left leg',
  'part.legR': 'Right leg',
  'dim.width': 'W',
  'dim.height': 'H',
  'dim.depth': 'D',
  'unit.mm': 'mm',
} as const;

export type I18nKey = keyof typeof en;

const zh: Record<I18nKey, string> = {
  'part.head': '头部',
  'part.torso': '躯干',
  'part.armL': '左臂',
  'part.armR': '右臂',
  'part.legL': '左腿',
  'part.legR': '右腿',
  'dim.width': '宽',
  'dim.height': '高',
  'dim.depth': '深',
  'unit.mm': 'mm',
};

const TABLES: Record<Lang, Record<I18nKey, string>> = { en, zh };

export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  const s = TABLES[lang][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s;
}

export function useT() {
  const lang = useShowcase(s => s.lang);
  return useCallback((key: I18nKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

/** Millimetres with one decimal, the way a drawing labels them. */
export const mm = (v: number) => v.toFixed(1);
