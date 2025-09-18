import { useState, useEffect } from 'react';

interface UseScrollDirectionOptions {
  threshold?: number;
  debounceMs?: number;
}

export function useScrollDirection({
  threshold = 10,
  debounceMs = 100
}: UseScrollDirectionOptions = {}) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      // Only update if scroll difference is greater than threshold
      if (Math.abs(scrollY - lastScrollY) >= threshold) {
        setScrollDirection(direction);
        setLastScrollY(scrollY);
      }
      
      setIsScrolling(true);
      
      // Clear existing timeout
      clearTimeout(timeoutId);
      
      // Set new timeout to detect when scrolling stops
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, debounceMs);
    };

    // Set initial scroll position
    setLastScrollY(window.scrollY);

    window.addEventListener('scroll', updateScrollDirection, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollDirection);
      clearTimeout(timeoutId);
    };
  }, [lastScrollY, threshold, debounceMs]);

  return {
    scrollDirection,
    isScrolling,
    isScrolledToTop: lastScrollY <= 10
  };
}