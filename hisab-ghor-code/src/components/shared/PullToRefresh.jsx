import React, { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(null);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dist = Math.max(0, e.touches[0].clientY - startY.current);
    if (dist > 0) {
      setPullDist(Math.min(dist * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDist(0);
      }
    } else {
      setPullDist(0);
    }
    startY.current = null;
  }, [pullDist, refreshing, onRefresh]);

  const progress = Math.min(pullDist / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {pullDist > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: pullDist }}
        >
          <RefreshCw
            className={`w-5 h-5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
          />
        </div>
      )}
      {children}
    </div>
  );
}