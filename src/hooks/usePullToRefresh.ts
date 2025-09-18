import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true
}: UsePullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  });

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || state.isRefreshing) return;
    
    // Sadece sayfa en üstteyken pull-to-refresh aktif olsun
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setState(prev => ({ ...prev, isPulling: true }));
  }, [enabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || !enabled || state.isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Sadece aşağı doğru çekme hareketini kabul et
    if (deltaY <= 0) {
      setState(prev => ({ 
        ...prev, 
        isPulling: false, 
        pullDistance: 0, 
        canRefresh: false 
      }));
      return;
    }

    // Direnç uygula
    const pullDistance = Math.min(deltaY / resistance, threshold * 1.5);
    const canRefresh = pullDistance >= threshold;

    setState(prev => ({
      ...prev,
      pullDistance,
      canRefresh
    }));

    // Varsayılan scroll davranışını engelle
    if (deltaY > 0) {
      e.preventDefault();
    }
  }, [state.isPulling, enabled, state.isRefreshing, threshold, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || !enabled) return;

    setState(prev => ({ ...prev, isPulling: false }));

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ 
        ...prev, 
        isRefreshing: true, 
        pullDistance: threshold 
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false
        }));
      }
    } else {
      setState(prev => ({
        ...prev,
        pullDistance: 0,
        canRefresh: false
      }));
    }
  }, [state.isPulling, state.canRefresh, state.isRefreshing, enabled, onRefresh, threshold]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current || document.body;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const bindToContainer = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    ...state,
    bindToContainer,
    pullProgress: Math.min(state.pullDistance / threshold, 1)
  };
};