import { ENGLISH } from './locale.en';

export const LANGUAGES = [
  { id: 'zh', name: '简体中文' }, { id: 'zh-TW', name: '繁體中文' },
  { id: 'en', name: 'English' }, { id: 'es', name: 'Español' },
  { id: 'pt-BR', name: 'Português (BR)' }, { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' }, { id: 'ja', name: '日本語' }, { id: 'ko', name: '한국어' },
] as const;
export type GameLanguage = typeof LANGUAGES[number]['id'];
export type TranslationCatalog = Readonly<Record<string, string>>;
export const LANGUAGE_KEY = 'toybot-breakout-language-v1';
export function resolveGameLanguage(locale?: string): GameLanguage {
  const tag = typeof locale === 'string' ? locale.trim().toLowerCase().replace(/_/g, '-') : '';
  if (/^zh(?:-|$)/.test(tag)) return /(?:hant|tw|hk|mo)/.test(tag) ? 'zh-TW' : 'zh';
  if (/^pt(?:-|$)/.test(tag)) return 'pt-BR';
  const base = tag.split('-')[0];
  return LANGUAGES.some(item => item.id === base) ? base as GameLanguage : 'en';
}

const han = /[\u3400-\u9fff]/;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const catalogs = new Map<GameLanguage, TranslationCatalog>([['en', ENGLISH]]);
const translators = new Map<GameLanguage, (text: string) => string>();
export function registerTranslations(language: GameLanguage, catalog: TranslationCatalog): void {
  catalogs.set(language, catalog);
  translators.delete(language);
}
export const hasTranslations = (language: GameLanguage) => language === 'zh' || catalogs.has(language);

function createTranslator(catalog: TranslationCatalog) {
  // All source data, identifiers and simulation messages stay unchanged. Only display text crosses here.
  const templates = Object.entries(catalog).filter(([source]) => /\{\d+\}/.test(source) && !/\}\{/.test(source))
    .sort(([a], [b]) => b.length - a.length)
    .map(([source, translation]) => {
      const slots: string[] = [];
      const pattern = source.split(/(\{\d+\})/).map(part => {
        if (/^\{\d+\}$/.test(part)) { slots.push(part); return '(.+?)'; }
        return escapeRegex(part);
      }).join('');
      return { matcher: new RegExp('^' + pattern + '$'), slots, translation };
    });
  const fragments: Record<string, string> = {};
  for (const [key, value] of Object.entries(catalog)) {
    if (key.includes('{')) continue;
    const normalized = key.replace(/^[·，。；：]\s*/, '');
    if (normalized && fragments[normalized] === undefined) fragments[normalized] = value.replace(/^[·,.;:]\s*/, '');
  }
  const matcher = new RegExp(Object.keys(fragments).sort((a, b) => b.length - a.length).map(escapeRegex).join('|'), 'g');
  const cache = new Map<string, string>();
  function translate(text: string): string {
    if (!han.test(text)) return text;
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    const source = text.trim();
    let output = catalog[source];
    if (output === undefined) for (const template of templates) {
      const match = source.match(template.matcher);
      if (!match) continue;
      const values = Object.fromEntries(template.slots.map((slot, i) => [slot, translate(match[i + 1])]));
      output = template.translation.replace(/\{\d+\}/g, slot => values[slot] ?? slot);
      break;
    }
    // Never translate an already translated CJK sentence again (important for Traditional Chinese and Japanese).
    if (output === undefined) output = source.replace(matcher, key => fragments[key]);
    output = text.slice(0, text.length - text.trimStart().length) + output + text.slice(text.trimEnd().length);
    if (cache.size >= 2048) cache.clear();
    cache.set(text, output);
    return output;
  }
  return translate;
}

export function translateText(text: string, language: GameLanguage): string {
  if (language === 'zh' || !han.test(text)) return text;
  const active = catalogs.has(language) ? language : 'en';
  let translate = translators.get(active);
  if (!translate) { translate = createTranslator(catalogs.get(active)!); translators.set(active, translate); }
  return translate(text);
}
export function localizeValue<T>(value: T, language: GameLanguage): T {
  if (typeof value === 'string') return translateText(value, language) as T;
  if (Array.isArray(value)) return value.map(item => localizeValue(item, language)) as T;
  return value;
}
export function readLanguagePreference(storage?: Pick<Storage, 'getItem'>): GameLanguage | null {
  try {
    const value = storage?.getItem(LANGUAGE_KEY);
    return LANGUAGES.some(item => item.id === value) ? value as GameLanguage : null;
  } catch { return null; }
}
export function saveLanguagePreference(language: GameLanguage, storage?: Pick<Storage, 'setItem'>): void {
  try { storage?.setItem(LANGUAGE_KEY, language); } catch { /* Session selection works without storage. */ }
}
