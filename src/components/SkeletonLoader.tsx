import React from 'react';

interface SkeletonLoaderProps {
  type: 'details' | 'list' | 'card' | 'video' | 'music';
  count?: number;
}

export function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  const renderDetailsSkeleton = () => (
    <div className="animate-pulse">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="relative h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-8">
          <div className="absolute inset-0 bg-black/20 rounded-lg" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="flex gap-8">
              <div className="w-64 h-80 bg-white/20 rounded-lg" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-white/20 rounded w-2/3" />
                <div className="h-6 bg-white/20 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-white/20 rounded-full" />
                  <div className="h-8 w-24 bg-white/20 rounded-full" />
                </div>
                <div className="flex gap-4 pt-4">
                  <div className="h-12 w-32 bg-white/20 rounded-lg" />
                  <div className="h-12 w-32 bg-white/20 rounded-lg" />
                  <div className="h-12 w-32 bg-white/20 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="relative h-screen bg-gradient-to-b from-gray-200 to-gray-300">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="text-center space-y-4">
              <div className="w-48 h-64 bg-white/20 rounded-lg mx-auto" />
              <div className="h-8 bg-white/20 rounded w-3/4 mx-auto" />
              <div className="h-6 bg-white/20 rounded w-1/2 mx-auto" />
              <div className="flex justify-center gap-2">
                <div className="h-8 w-20 bg-white/20 rounded-full" />
                <div className="h-8 w-20 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[2/3] bg-gray-200 rounded-lg" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCardSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[2/3] bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderVideoSkeleton = () => (
    <div className="animate-pulse">
      {/* Video Player Area */}
      <div className="aspect-video bg-gray-200" />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="flex gap-4 mb-6">
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                <div className="h-10 w-24 bg-gray-200 rounded-lg" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMusicSkeleton = () => (
    <div className="animate-pulse">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-gray-200 to-gray-300">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex gap-8">
            <div className="w-64 h-64 bg-white/20 rounded-lg" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-white/20 rounded w-2/3" />
              <div className="h-6 bg-white/20 rounded w-1/2" />
              <div className="h-6 bg-white/20 rounded w-1/3" />
              <div className="flex gap-4 pt-4">
                <div className="h-12 w-32 bg-white/20 rounded-lg" />
                <div className="h-12 w-32 bg-white/20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  switch (type) {
    case 'details':
      return renderDetailsSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'card':
      return renderCardSkeleton();
    case 'video':
      return renderVideoSkeleton();
    case 'music':
      return renderMusicSkeleton();
    default:
      return renderDetailsSkeleton();
  }
}

export default SkeletonLoader;