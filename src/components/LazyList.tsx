import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
  overscan?: number;
}

export function LazyList<T>({
  items,
  renderItem,
  itemHeight = 100,
  containerHeight = 400,
  loadMore,
  hasMore = false,
  isLoading = false,
  loadingComponent,
  emptyComponent,
  className = '',
  overscan = 5
}: LazyListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Intersection Observer for infinite loading
  useEffect(() => {
    if (!loadMore || !hasMore) return;

    const currentLastItemRef = lastItemRef.current;
    if (!currentLastItemRef) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.current.observe(currentLastItemRef);

    return () => {
      if (observer.current && currentLastItemRef) {
        observer.current.unobserve(currentLastItemRef);
      }
    };
  }, [loadMore, hasMore, isLoading, items.length]);

  // Default loading component
  const defaultLoadingComponent = (
    <div className="flex items-center justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
      <span className="ml-2 text-gray-500">Yükleniyor...</span>
    </div>
  );

  // Default empty component
  const defaultEmptyComponent = (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <div className="text-4xl mb-4">📝</div>
      <p>Henüz içerik yok</p>
    </div>
  );

  if (items.length === 0 && !isLoading) {
    return (
      <div className={className}>
        {emptyComponent || defaultEmptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const isLastItem = actualIndex === items.length - 1;
            
            return (
              <div
                key={actualIndex}
                ref={isLastItem ? lastItemRef : undefined}
                style={{ height: itemHeight }}
                className="flex-shrink-0"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (loadingComponent || defaultLoadingComponent)}
    </div>
  );
}