import React, { Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import LoadingOverlay from './components/LoadingOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdService } from './utils/AdService';
import { GlobalStore } from './utils/GlobalStore';
import { registry, findByPayloadKey } from './games/registry';

// 进入应用时，处理 FB Instant 入口数据：
//   - 没 payload：进首页
//   - payload.game 命中某个 manifest：初始化该 game 的广告并跳进该 route
const AppContent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const store = GlobalStore.getInstance();
        store.setUserInfo({
          ...store.getUserInfo(),
          fb_id: FBInstant.player.getID(),
        });

        const payload = (window as any).FBInstant.getEntryPointData();
        console.log('[App] entry payload:', payload);

        if (payload?.game) {
          const game = findByPayloadKey(payload.game);
          if (game) {
            await AdService.initInterstitialAd(game.adType);
            navigate(game.route);
            return;
          }
          console.warn(`[App] payload.game="${payload.game}" 未在 registry 中找到，回退到首页`);
        }

        await AdService.initInterstitialAd('quiz');
        navigate('/home');
      } catch (error) {
        console.error('[App] 初始化失败，回退到首页:', error);
        navigate('/home');
      }
    })();
  }, [navigate]);

  return (
    <LoadingOverlay
      message="loading..."
      spinnerColor="#915A45"
      backgroundColor="rgba(40, 40, 40, 0.9)"
      showProgress
      progress={75}
    />
  );
};

const App = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense
          fallback={
            <LoadingOverlay
              message="loading..."
              spinnerColor="#915A45"
              backgroundColor="rgba(40, 40, 40, 0.9)"
            />
          }
        >
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/home" element={<Home />} />
            {/* 所有游戏路由从 registry 自动生成 */}
            {registry.map((g) => {
              const Lazy = g.LazyComponent;
              return <Route key={g.id} path={g.route} element={<Lazy />} />;
            })}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
