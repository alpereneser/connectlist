import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  pullProgress: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  isPulling,
  pullDistance,
  isRefreshing,
  canRefresh,
  pullProgress
}) => {
  if (!isPulling && !isRefreshing) return null;

  const getStatusText = () => {
    if (isRefreshing) return 'Yenileniyor...';
    if (canRefresh) return 'Yenilemek için bırakın';
    return 'Yenilemek için çekin';
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center bg-white shadow-sm transition-transform duration-200 ease-out"
      style={{
        transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`,
        height: '60px'
      }}
    >
      <div className="flex items-center space-x-2">
        <RefreshCw 
          className={`w-5 h-5 transition-transform duration-200 ${
            isRefreshing 
              ? 'animate-spin text-orange-500' 
              : canRefresh 
                ? 'rotate-180 text-orange-500' 
                : 'text-gray-400'
          }`}
          style={{
            transform: !isRefreshing && !canRefresh 
              ? `rotate(${pullProgress * 180}deg)` 
              : undefined
          }}
        />
        <span 
          className={`text-sm font-medium transition-colors duration-200 ${
            isRefreshing || canRefresh ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          {getStatusText()}
        </span>
      </div>
      
      {/* Progress indicator */}
      <div className="w-16 h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-200 rounded-full ${
            isRefreshing || canRefresh ? 'bg-orange-500' : 'bg-gray-400'
          }`}
          style={{
            width: `${Math.min(pullProgress * 100, 100)}%`
          }}
        />
      </div>
    </div>
  );
};

export default PullToRefresh;