import { useEffect, useRef } from 'react';

interface SessionTrackingOptions {
  pageName: string;
  additionalParams?: Record<string, any>;
}

/**
 * 页面停留时间跟踪：1/2/3 分钟分别触发 oneminsession/twominsession/threeminsession fbq 事件。
 * 与主项目完全同源。
 */
export const useSessionTracking = ({
  pageName,
  additionalParams = {},
}: SessionTrackingOptions) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeTrackingRef = useRef({
    startTime: 0,
    oneMinTriggered: false,
    twoMinTriggered: false,
    threeMinTriggered: false,
  });

  const startTimeTracking = () => {
    const now = Date.now();
    timeTrackingRef.current = {
      startTime: now,
      oneMinTriggered: false,
      twoMinTriggered: false,
      threeMinTriggered: false,
    };

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTimeInMin =
        (currentTime - timeTrackingRef.current.startTime) / (1000 * 60);

      const eventParams = {
        page: pageName,
        timestamp: currentTime,
        ...additionalParams,
      };

      const fire = (key: string) => {
        try {
          if (typeof fbq === 'function') {
            fbq('trackCustom', key, eventParams);
          }
        } catch (error) {
          console.error(`触发 ${pageName} ${key} 失败:`, error);
        }
      };

      if (elapsedTimeInMin >= 1 && !timeTrackingRef.current.oneMinTriggered) {
        timeTrackingRef.current.oneMinTriggered = true;
        fire('oneminsession');
      }
      if (elapsedTimeInMin >= 2 && !timeTrackingRef.current.twoMinTriggered) {
        timeTrackingRef.current.twoMinTriggered = true;
        fire('twominsession');
      }
      if (elapsedTimeInMin >= 3 && !timeTrackingRef.current.threeMinTriggered) {
        timeTrackingRef.current.threeMinTriggered = true;
        fire('threeminsession');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 10000);
  };

  useEffect(() => {
    startTimeTracking();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName]);

  const resetTracking = () => startTimeTracking();

  return { resetTracking };
};
