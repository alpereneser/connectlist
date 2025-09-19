import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Plus, 
  Share2, 
  Users, 
  Calendar,
  Clock,
  Eye,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { Header } from '../../components/Header';
import ContentComments from '../../components/ContentComments';
import { AddToListModal } from '../../components/AddToListModal';
import { WhoAddedModal } from '../../components/WhoAddedModal';
import { AuthPopup } from '../../components/AuthPopup';
import { ShareModal } from '../../components/ShareModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import PullToRefresh from '../../components/PullToRefresh';
import { getVideoDetails } from '../../lib/api';
import { useRetry } from '../../hooks/useRetry';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
  viewCount?: string;
  likeCount?: string;
}

export default function VideoDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showListUsers, setShowListUsers] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [users, setUsers] = useState([]);

  const {
    data: video,
    error,
    isLoading,
    retryCount,
    execute: fetchVideo,
    retry
  } = useRetry(
    async () => {
      if (!id) throw new Error('Video ID bulunamadı');
      return await getVideoDetails(id);
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      onRetry: (attempt) => {
        console.log(`Video detayları alınıyor... Deneme ${attempt}/3`);
      },
      onMaxRetriesReached: () => {
        console.error('Maksimum deneme sayısına ulaşıldı');
      }
    }
  );

  useEffect(() => {
    if (id) {
      fetchVideo();
    }
  }, [id, fetchVideo]);

  const {
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh,
    pullProgress,
    bindPullToRefresh
  } = usePullToRefresh({
    onRefresh: async () => {
      await retry();
    },
    threshold: 80,
    disabled: isLoading
  });

  const handleAddToList = () => {
    setShowAddToListModal(true);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleWatchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Video Yükleniyor... | ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-16">
          <SkeletonLoader type="video" />
        </div>
      </>
    );
  }

  if (error || !video) {
    return (
      <>
        <Helmet>
          <title>Video Bulunamadı | ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-16">
          <ErrorState
            error={error}
            onRetry={retry}
            isRetrying={isLoading}
            retryCount={retryCount}
            maxRetries={3}
            title="Video Yüklenemedi"
            description="Video detayları alınırken bir hata oluştu. Lütfen tekrar deneyin."
          />
        </div>
      </>
    );
  }

  if (!video) {
    return (
      <>
        <Helmet>
          <title>Video Bulunamadı | ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Video Bulunamadı</h1>
            <p className="text-gray-600 mb-8">{error || 'Aradığınız video bulunamadı.'}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{video.title} | ConnectList</title>
        <meta name="description" content={video.description} />
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description} />
        <meta property="og:image" content={video.thumbnail} />
        <meta property="og:type" content="video.other" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={video.title} />
        <meta name="twitter:description" content={video.description} />
        <meta name="twitter:image" content={video.thumbnail} />
      </Helmet>

      <Header />
      
      <PullToRefresh
        isPulling={isPulling}
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        pullProgress={pullProgress}
      />
      
      <div className="min-h-screen bg-gray-50" {...bindPullToRefresh}>
        {/* Desktop Layout */}
        <div className="hidden md:block">
          {/* Video Player Section */}
          <div className="bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <button
                    onClick={handleWatchOnYouTube}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <Play size={24} />
                    YouTube'da İzle
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
                  
                  {/* Video Meta */}
                  <div className="flex items-center gap-6 text-gray-600 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{new Date(video.publishedAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>{video.channelTitle}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={handleAddToList}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus size={18} />
                      Listeye Ekle
                    </button>
                    <button
                      onClick={handleShare}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Share2 size={18} />
                      Paylaş
                    </button>
                    <button
                      onClick={handleWatchOnYouTube}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink size={18} />
                      YouTube'da Aç
                    </button>
                  </div>

                  {/* Description */}
                  {video.description && (
                    <div>
                      <h2 className="text-xl font-bold mb-3">Açıklama</h2>
                      <p className="text-gray-700 leading-relaxed">{video.description}</p>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="mt-8">
                  <ContentComments
                    contentType="video"
                    contentId={video.id}
                    contentTitle={video.title}
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Channel Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-bold mb-4">Kanal Bilgileri</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">{video.channelTitle}</h4>
                      <p className="text-sm text-gray-500">YouTube Kanalı</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Mobile Video Player */}
          <div className="bg-black">
            <div className="aspect-video relative">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <button
                  onClick={handleWatchOnYouTube}
                  className="bg-red-600 text-white p-4 rounded-full"
                >
                  <Play size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-4">
            {/* Title and Meta */}
            <div className="bg-white rounded-lg p-4">
              <h1 className="text-xl font-bold mb-3">{video.title}</h1>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(video.publishedAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{video.channelTitle}</span>
                </div>
              </div>

              {video.description && (
                <p className="text-gray-700 text-sm leading-relaxed">{video.description}</p>
              )}
            </div>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToList}
                className="bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Listeye Ekle
              </button>
              <button
                onClick={handleWatchOnYouTube}
                className="bg-red-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                YouTube
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="bg-gray-100 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Paylaş
              </button>
              <button
                onClick={() => setShowListUsers(true)}
                className="bg-gray-100 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Kimler Ekledi
              </button>
            </div>

            {/* Mobile Comments */}
            <div className="bg-white rounded-lg p-4">
              <ContentComments
                contentType="video"
                contentId={video.id}
                contentTitle={video.title}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="video"
        contentId={video.id}
        contentTitle={video.title}
        contentImage={video.thumbnail}
        contentDescription={video.description}
      />

      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="video"
      />

      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={video.title}
        description={video.description}
      />
    </>
  );
}