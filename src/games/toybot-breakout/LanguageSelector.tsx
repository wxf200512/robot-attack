import i18n from '../../i18n';
import { lt, useGameLanguage } from './i18n';
import { saveLanguagePreference, type GameLanguage } from './locale';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const language = useGameLanguage();
  const selectLanguage = (next: GameLanguage) => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Language selection still works without storage. */ }
    saveLanguagePreference(next, storage);
    void i18n.changeLanguage(next);
  };
  return <div className={'toybot-language' + (compact ? ' is-compact' : '')} role="group" aria-label={lt('语言设置')}>
    {!compact && <span>{lt('语言')}</span>}
    <button type="button" lang="zh-CN" aria-label="简体中文" aria-pressed={language === 'zh'} onClick={() => selectLanguage('zh')}>{compact ? '中文' : '简体中文'}</button>
    <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => selectLanguage('en')}>English</button>
    {!compact && <small>{lt('切换后即时生效，保留当前进度。')}</small>}
  </div>;
}
