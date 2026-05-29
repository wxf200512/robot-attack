/**
 * FBInstant Loader: Handles initialization and progress updates.
 * 与主项目同源；devMock 接管时所有 await 都立即 resolve。
 */

export interface FBLoaderOptions {
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}

export const initializeFBInstant = (options?: FBLoaderOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.FBInstant === 'undefined') {
      const error = new Error('FBInstant 未定义，请确保运行在支持的环境中（或本地 dev 模式已加载 devMock）');
      console.error(error);
      return reject(error);
    }

    const { onProgress, onComplete } = options || {};

    window.FBInstant.initializeAsync()
      .then(() => {
        let percent = 0;
        const startTime = Date.now();
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          percent = Math.min(1 - Math.exp(-elapsed / 2000), 0.99) * 100;
          window.FBInstant.setLoadingProgress(Math.floor(percent));
          if (onProgress) onProgress(Math.floor(percent));

          if (percent > 1) {
            clearInterval(progressInterval);
            window.FBInstant.setLoadingProgress(100);

            window.FBInstant.startGameAsync()
              .then(() => {
                if (onComplete) onComplete();
                resolve();
              })
              .catch((error: Error) => reject(error));
          }
        }, 10);
      })
      .catch((error: Error) => reject(error));
  });
};
