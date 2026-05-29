import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 设置默认语言：优先 localStorage，再 FBInstant.getLocale，最后 en
export const setupDefaultLanguage = (): string => {
  let language = localStorage.getItem('language');

  if (!language) {
    try {
      if (typeof (window as any).FBInstant !== 'undefined') {
        const fbLocale = (window as any).FBInstant.getLocale();
        if (fbLocale) {
          language = fbLocale.substring(0, 2).toLowerCase();
          if (language) {
            localStorage.setItem('language', language);
          }
        }
      }
    } catch (error) {
      console.error('获取 FBInstant 语言设置失败:', error);
    }

    if (!language) {
      language = 'en';
      localStorage.setItem('language', language);
    }
  }

  i18n.changeLanguage(language);
  return language;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

setupDefaultLanguage();

export default i18n;
