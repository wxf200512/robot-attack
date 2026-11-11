import { useState } from 'react';
import i18n from '../../i18n';
import { lt, prepareLanguage, useGameLanguage } from './i18n';
import { LANGUAGES, saveLanguagePreference, type GameLanguage } from './locale';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const language = useGameLanguage();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const selectLanguage = async (next: GameLanguage) => {
    setLoading(true); setFailed(false);
    try {
      await prepareLanguage(next);
      await i18n.changeLanguage(next);
      let storage: Storage | undefined;
      try { storage = window.localStorage; } catch { /* Session selection is still usable. */ }
      saveLanguagePreference(next, storage);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  return <div className={'toybot-language' + (compact ? ' is-compact' : '')}>
    {!compact && <span>{lt('语言')}</span>}
    <select aria-label={lt('语言设置')} value={language} disabled={loading} onChange={event => void selectLanguage(event.target.value as GameLanguage)}>
      {LANGUAGES.map(item => <option key={item.id} value={item.id} lang={item.id === 'zh' ? 'zh-CN' : item.id}>{item.name}</option>)}
    </select>
    {loading && <span role="status" aria-live="polite">…</span>}
    {failed && <small role="alert">{lt('语言加载失败，请重试。')}</small>}
    {!compact && <small>{lt('切换后即时生效，保留当前进度。')}</small>}
  </div>;
}
