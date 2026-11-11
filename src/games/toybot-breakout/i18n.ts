import { useLayoutEffect, useSyncExternalStore } from 'react';
import i18n from '../../i18n';
import { ENGLISH } from './locale.en';
import { localizeValue, readLanguagePreference, resolveGameLanguage, type GameLanguage } from './locale';
import './locale.css';

const NAMESPACE = 'toybot-breakout';
let initialized = false;
const subscribeLanguage = (notify: () => void) => {
  i18n.on('languageChanged', notify);
  return () => { i18n.off('languageChanged', notify); };
};
const currentLanguage = () => resolveGameLanguage(i18n.language);

export function useGameLanguage(): GameLanguage {
  const language = useSyncExternalStore(subscribeLanguage, currentLanguage, () => 'en' as const);
  useLayoutEffect(() => {
    if (!initialized) {
      initialized = true;
      i18n.addResourceBundle('en', NAMESPACE, { messages: ENGLISH }, true, false);
      i18n.addResourceBundle('zh', NAMESPACE, { messages: Object.fromEntries(Object.keys(ENGLISH).map(key => [key, key])) }, true, false);
    }
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Optional persistence. */ }
    const preference = readLanguagePreference(storage);
    if (preference && i18n.language !== preference) void i18n.changeLanguage(preference);
  }, []);
  return language;
}

// Translation runs only at the display boundary; simulation data stays language-neutral.
export const lt = <T,>(value: T): T => localizeValue(value, currentLanguage());
