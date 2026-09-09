import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 60;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const dist = useRef(0);
  const active = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        dist.current = Math.min(dy * 0.4, 80);
        setPulling(true);
        setDistance(dist.current);
        if (dy > 10) e.preventDefault();
      } else {
        active.current = false;
        dist.current = 0;
        setPulling(false);
        setDistance(0);
      }
    }

    async function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      const d = dist.current;
      dist.current = 0;
      setPulling(false);
      setDistance(0);

      if (d >= THRESHOLD) {
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return { pulling, distance, refreshing, threshold: THRESHOLD };
}
