import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from './Header';
import { useSessionTracking } from '../hooks/useSessionTracking';
import { registry } from '../games/registry';
import type { RegisteredGame } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  useSessionTracking({ pageName: 'home' });

  const lang = i18n.language || localStorage.getItem('language') || 'en';

  return (
    <div className="min-h-screen bg-[#f6efe5]">
      <Header />

      <div className="container mx-auto px-4 pt-[80px] pb-8">
        {registry.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-2xl mb-2">还没有注册的游戏</div>
            <div className="text-sm">
              在 <code className="bg-gray-200 px-1 rounded">src/games/</code> 下新建文件夹，
              放一个 <code className="bg-gray-200 px-1 rounded">manifest.ts</code> 即可。
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pt-4">
            {registry.map((g) => (
              <GameCard key={g.id} game={g} lang={lang} onClick={() => navigate(g.route)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const GameCard: React.FC<{
  game: RegisteredGame;
  lang: string;
  onClick: () => void;
}> = ({ game, lang, onClick }) => {
  const title = game.title[lang] || game.title.en || game.id;

  return (
    <div
      onClick={onClick}
      className="bg-white w-full overflow-hidden rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
      style={{ border: '0.3rem solid #000000' }}
    >
      <div className="relative flex flex-col h-full">
        {game.homeCard.cover ? (
          <img
            src={game.homeCard.cover}
            alt={title}
            draggable={false}
            className="w-full block"
            style={{ aspectRatio: '694 / 256', objectFit: 'cover', userSelect: 'none' }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center text-white font-bold text-2xl"
            style={{
              aspectRatio: '694 / 256',
              backgroundColor: game.homeCard.color,
            }}
          >
            {game.id}
          </div>
        )}
        <div className="p-4 bg-white">
          <h3 className="text-xl text-left font-bold text-black line-clamp-2 flex-1">
            {title}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Home;
