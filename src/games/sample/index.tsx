import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 示例游戏的根组件。完整自由发挥，不需要用 Header（也可以用），
 * 你的整套 UI/路由/状态都可以放在 src/games/<id>/ 文件夹下。
 */
const SampleGame: React.FC = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#1a2840] text-white flex flex-col items-center justify-center p-6 gap-6">
      <h1 className="text-3xl font-bold">Sample Game</h1>
      <p className="text-base opacity-80 text-center max-w-md">
        这是模板自带的示例游戏。复制 <code className="bg-white/20 px-1 rounded">src/games/sample</code>
        改名，就能从这开始做你自己的游戏。
      </p>

      <button
        onClick={() => setCount((c) => c + 1)}
        className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-3 rounded-lg"
      >
        点击 +1（当前 {count}）
      </button>

      <button
        onClick={() => navigate('/home')}
        className="text-sm underline opacity-70 hover:opacity-100"
      >
        ← 返回首页
      </button>
    </div>
  );
};

export default SampleGame;
