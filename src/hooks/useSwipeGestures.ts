import { useCallback, useRef, useEffect } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  velocity?: number; // Minimum velocity for swipe
  preventDefaultTouchmoveEvent?: boolean;
  delta?: number; // Minimum delta for swipe detection
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

export const useSwipeGestures = (options: SwipeGestureOptions = {}): SwipeGestureHandlers => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3,
    preventDefaultTouchmoveEvent = false,
    delta = 10
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMoveRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchMoveRef.current = null;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }
    
    const touch = e.touches[0];
    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, [preventDefaultTouchmoveEvent]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd = e.changedTouches[0];
    const touchStart = touchStartRef.current;

    const deltaX = touchEnd.clientX - touchStart.x;
    const deltaY = touchEnd.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const swipeVelocity = distance / deltaTime;

    // Check if swipe meets threshold and velocity requirements
    if (distance < threshold || swipeVelocity < velocity) {
      touchStartRef.current = null;
      touchMoveRef.current = null;
      return;
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine swipe direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > delta) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > delta) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    touchStartRef.current = null;
    touchMoveRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocity, delta]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

// Hook for attaching swipe gestures to a ref element
export const useSwipeGestureRef = <T extends HTMLElement>(
  options: SwipeGestureOptions = {}
) => {
  const elementRef = useRef<T>(null);
  const handlers = useSwipeGestures(options);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handlers.onTouchStart, { passive: true });
    element.addEventListener('touchmove', handlers.onTouchMove, { passive: !options.preventDefaultTouchmoveEvent });
    element.addEventListener('touchend', handlers.onTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handlers.onTouchStart);
      element.removeEventListener('touchmove', handlers.onTouchMove);
      element.removeEventListener('touchend', handlers.onTouchEnd);
    };
  }, [handlers, options.preventDefaultTouchmoveEvent]);

  return elementRef;
};

// Utility function for detecting swipe direction
export const getSwipeDirection = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold: number = 50
): 'left' | 'right' | 'up' | 'down' | null => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (Math.max(absDeltaX, absDeltaY) < threshold) {
    return null;
  }

  if (absDeltaX > absDeltaY) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
};

export default useSwipeGestures;