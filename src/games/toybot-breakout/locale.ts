import { ENGLISH } from './locale.en';

export type GameLanguage = 'zh' | 'en';
export const LANGUAGE_KEY = 'toybot-breakout-language-v1';
export const resolveGameLanguage = (locale?: string): GameLanguage =>
  typeof locale === 'string' && locale.trim().toLowerCase().replace('_', '-').split('-')[0] === 'zh' ? 'zh' : 'en';

const han = /[\u3400-\u9fff]/;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Values stay in the simulation's source language. Only text crossing a UI boundary is translated.
const templates = Object.entries(ENGLISH).filter(([source]) => /\{\d+\}/.test(source))
  .sort(([a], [b]) => b.length - a.length)
  .map(([source, translation]) => {
    const slots: string[] = [];
    const pattern = source.split(/(\{\d+\})/).map(part => {
      if (/^\{\d+\}$/.test(part)) { slots.push(part); return '(.+?)'; }
      return escapeRegex(part);
    }).join('');
    return { matcher: new RegExp('^' + pattern + '$'), slots, translation };
  });
// One compiled matcher handles composed HUD strings; exact sentences always win first.
const fragmentValues: Record<string, string> = {};
for (const [key, value] of Object.entries(ENGLISH)) {
  if (key.includes('{')) continue;
  const normalized = key.replace(/^[·，。；：]\s*/, '');
  if (normalized && fragmentValues[normalized] === undefined)
    fragmentValues[normalized] = value.replace(/^[·,.;:]\s*/, '');
}
const fragments = Object.keys(fragmentValues).sort((a, b) => b.length - a.length);
const fragmentMatcher = new RegExp(fragments.map(escapeRegex).join('|'), 'g');
const cache = new Map<string, string>();

export function translateText(text: string, language: GameLanguage): string {
  if (language === 'zh' || !han.test(text)) return text;
  const remembered = cache.get(text);
  if (remembered !== undefined) return remembered;
  const source = text.trim();
  let output = ENGLISH[source];
  if (output === undefined) {
    for (const template of templates) {
      const match = source.match(template.matcher);
      if (!match) continue;
      const slots = Object.fromEntries(template.slots.map((slot, i) => [slot, match[i + 1]]));
      output = template.translation.replace(/\{\d+\}/g, slot => slots[slot] ?? slot);
      break;
    }
  }
  if (output === undefined) output = source;
  // Templates can contain adjacent dynamic slots. Resolve remaining full names after interpolation.
  output = output.replace(fragmentMatcher, key => fragmentValues[key]);
  // Preserve JSX spacing around text without changing punctuation inside ordinary English text.
  output = text.slice(0, text.length - text.trimStart().length) + output + text.slice(text.trimEnd().length);
  // Dynamic counters are unbounded; keep the render cache bounded for long sessions.
  if (cache.size >= 2048) cache.clear();
  cache.set(text, output);
  return output;
}

export function localizeValue<T>(value: T, language: GameLanguage): T {
  if (typeof value === 'string') return translateText(value, language) as T;
  if (Array.isArray(value)) return value.map(item => localizeValue(item, language)) as T;
  return value; // Never clone React elements, handlers, state objects, or numbers.
}

export function readLanguagePreference(storage?: Pick<Storage, 'getItem'>): GameLanguage | null {
  try {
    const value = storage?.getItem(LANGUAGE_KEY);
    return value === 'en' || value === 'zh' ? value : null;
  } catch { return null; }
}

export function saveLanguagePreference(language: GameLanguage, storage?: Pick<Storage, 'setItem'>): void {
  try { storage?.setItem(LANGUAGE_KEY, language); } catch { /* Storage may be unavailable in private mode. */ }
}
