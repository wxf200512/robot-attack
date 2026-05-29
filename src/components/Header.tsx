import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n, { setupDefaultLanguage } from '../i18n';

// 语言列表（保留与主项目一致，便于 i18n 测试）
const languages = [
  { code: 'zh', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'id', name: 'bahasa Indonesia' },
  { code: 'tl', name: 'Filipino' },
  { code: 'ja', name: '日本語' },
  { code: 'th', name: 'ไทย' },
  { code: 'ms', name: 'Melayu' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ru', name: 'Русский' },
  { code: 'tr', name: 'Türkçe' },
];

/**
 * 模板版 Header：与主项目同 API（fixed 顶部、左侧 Home、右侧语言切换），
 * 但用色块+文字替代主项目的位图资源，模板无需带任何图片资源。
 * 集成回主项目时直接用主项目的 Header.tsx 即可，无需迁移。
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLanguageDrawerOpen, setIsLanguageDrawerOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const stored = localStorage.getItem('language');
    return languages.find((l) => l.code === stored) || languages[1];
  });

  useEffect(() => {
    setupDefaultLanguage();
  }, []);

  const isDetailPage = location.pathname.startsWith('/game/');

  const handleLanguageSelect = (language: typeof languages[0]) => {
    setSelectedLanguage(language);
    localStorage.setItem('language', language.code);
    localStorage.setItem('i18nextLng', language.code);
    i18n.changeLanguage(language.code);
    setIsLanguageDrawerOpen(false);
  };

  return (
    <>
      <nav
        id="main-navigation"
        className="fixed top-0 left-0 right-0 h-[64px] bg-[#4A2F27] z-[9999] shadow"
      >
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <button
            className="text-white text-sm font-bold px-3 py-2 rounded hover:bg-white/10 transition"
            onClick={() => navigate('/home')}
          >
            ← Home
          </button>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold tracking-widest text-base">
            Game Template
          </div>

          {!isDetailPage ? (
            <button
              className="text-white text-sm font-bold px-3 py-2 rounded hover:bg-white/10 transition"
              onClick={() => setIsLanguageDrawerOpen(true)}
            >
              🌐 {selectedLanguage.code.toUpperCase()}
            </button>
          ) : (
            <div className="w-[60px]" />
          )}
        </div>
      </nav>

      {/* 语言抽屉 */}
      <div
        className={`fixed inset-0 bg-black/50 z-[10000] transition-opacity ${
          isLanguageDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsLanguageDrawerOpen(false)}
      >
        <div
          className={`fixed right-0 top-0 h-full w-72 bg-white transform transition-transform ${
            isLanguageDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">Language</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {languages.map((language) => (
              <button
                key={language.code}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition ${
                  selectedLanguage.code === language.code ? 'bg-blue-50 text-blue-600' : ''
                }`}
                onClick={() => handleLanguageSelect(language)}
              >
                {language.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
