import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import i18n from '../../i18n';
import { ENGLISH } from './locale.en';
import { hasTranslations, localizeValue, readLanguagePreference, registerTranslations, resolveGameLanguage, type GameLanguage } from './locale';
import './locale.css';

const NAMESPACE = 'toybot-breakout';
const loaders = {
  'zh-TW': () => import('./locale.zh-TW'), es: () => import('./locale.es'),
  'pt-BR': () => import('./locale.pt-BR'), fr: () => import('./locale.fr'),
  de: () => import('./locale.de'), ja: () => import('./locale.ja'), ko: () => import('./locale.ko'),
};
const pending = new Map<GameLanguage, Promise<void>>();
const listeners = new Set<() => void>();
let revision = 0;
let initialized = false;
export function prepareLanguage(language: GameLanguage): Promise<void> {
  if (!initialized) {
    initialized = true;
    i18n.addResourceBundle('en', NAMESPACE, { messages: ENGLISH }, true, false);
    i18n.addResourceBundle('zh', NAMESPACE, { messages: Object.fromEntries(Object.keys(ENGLISH).map(key => [key, key])) }, true, false);
  }
  if (hasTranslations(language)) return Promise.resolve();
  const existing = pending.get(language);
  if (existing) return existing;
  const load = loaders[language as keyof typeof loaders]().then(module => {
    registerTranslations(language, module.default);
    i18n.addResourceBundle(language, NAMESPACE, { messages: module.default }, true, false);
    revision++;
    listeners.forEach(notify => notify());
  }).finally(() => { pending.delete(language); });
  pending.set(language, load);
  return load;
}
const subscribeLanguage = (notify: () => void) => {
  i18n.on('languageChanged', notify); listeners.add(notify);
  return () => { i18n.off('languageChanged', notify); listeners.delete(notify); };
};
const snapshot = () => (i18n.language ?? 'en') + ':' + revision;
export function useGameLanguage(): GameLanguage {
  useSyncExternalStore(subscribeLanguage, snapshot, () => 'en:0');
  useLayoutEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Optional persistence. */ }
    const preference = readLanguagePreference(storage);
    const target = preference ?? resolveGameLanguage(i18n.language);
    let cancelled = false;
    void prepareLanguage(target).then(() => {
      if (!cancelled && preference && i18n.language !== target) void i18n.changeLanguage(target);
    }).catch(() => { /* Keep the readable English fallback; the selector allows retry. */ });
    return () => { cancelled = true; };
  }, []);
  const language = resolveGameLanguage(i18n.language);
  useEffect(() => { void prepareLanguage(language).catch(() => {}); }, [language]);
  return language;
}
export const lt = <T,>(value: T): T => localizeValue(value, resolveGameLanguage(i18n.language));
