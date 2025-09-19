import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Play, 
  Plus, 
  Share2, 
  Users, 
  Music,
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
import { getMusicDetails } from '../../lib/api';
import { useRetry } from '../../hooks/useRetry';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface MusicDetails {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  thumbnail: string;
  description?: string;
  publishedAt?: string;
  url?: string;
}

export default function MusicDetails() {
  const { id } = useParams<{ id: string }>();
  
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showListUsers, setShowListUsers] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [authMessage] = useState('');
  const [users] = useState([]);

  const {
    data: music,
    error,
    isLoading,
    retryCount,
    execute: fetchMusic,
    retry
  } = useRetry(
    async () => {
      if (!id) throw new Error('Müzik ID bulunamadı');
      return await getMusicDetails(id);
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      onRetry: (attempt) => {
        console.log(`Müzik detayları alınıyor... Deneme ${attempt}/3`);
      },
      onMaxRetriesReached: () => {
        console.error('Maksimum deneme sayısına ulaşıldı');
      }
    }
  );

  useEffect(() => {
    if (id) {
      fetchMusic();
    }
  }, [id, fetchMusic]);

  const {
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh,
    pullProgress,
    bindToContainer
  } = usePullToRefresh({
    onRefresh: async () => {
      await retry();
    },
    threshold: 80,
    enabled: !isLoading
  });

  const handleAddToList = () => {
    setShowAddToListModal(true);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handlePlayOnYouTubeMusic = () => {
    const url = music?.url || `https://music.youtube.com/search?q=${encodeURIComponent(music?.title || '')}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Müzik Yükleniyor... | ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-16">
          <SkeletonLoader type="music" />
        </div>
      </>
    );
  }

  if (error || !music) {
    return (
      <>
        <Helmet>
          <title>Müzik Bulunamadı | ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-16">
          <ErrorState
            error={error}
            onRetry={retry}
            isRetrying={isLoading}
            retryCount={retryCount}
            maxRetries={3}
            title="Müzik Yüklenemedi"
            description="Müzik detayları alınırken bir hata oluştu. Lütfen tekrar deneyin."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{music.title} - {music.artist} | ConnectList</title>
        <meta name="description" content={music.description} />
        <meta property="og:title" content={`${music.title} - ${music.artist}`} />
        <meta property="og:description" content={music.description} />
        <meta property="og:image" content={music.thumbnail} />
        <meta property="og:type" content="music.song" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${music.title} - ${music.artist}`} />
        <meta name="twitter:description" content={music.description} />
        <meta name="twitter:image" content={music.thumbnail} />
      </Helmet>

      <Header />
      
      <PullToRefresh
        isPulling={isPulling}
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        pullProgress={pullProgress}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50" {...bindToContainer}>
        {/* Desktop Layout */}
        <div className="hidden md:block">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="flex items-center gap-8">
                {/* Album Art */}
                <div className="flex-shrink-0">
                  <img
                    src={music.thumbnail}
                    alt={music.title}
                    className="w-64 h-64 object-cover rounded-lg shadow-2xl"
                  />
                </div>
                
                {/* Music Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Music size={20} />
                    <span className="text-sm font-medium opacity-90">ŞARKI</span>
                  </div>
                  <h1 className="text-5xl font-bold mb-4">{music.title}</h1>
                  <p className="text-2xl mb-6 opacity-90">{music.artist}</p>
                  
                  {music.album && (
                    <p className="text-lg mb-6 opacity-75">Albüm: {music.album}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handlePlayOnYouTubeMusic}
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full flex items-center gap-3 transition-colors"
                    >
                      <Play size={24} />
                      Dinle
                    </button>
                    <button
                      onClick={handleAddToList}
                      className="bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-full flex items-center gap-2 transition-colors"
                    >
                      <Plus size={20} />
                      Listeye Ekle
                    </button>
                    <button
                      onClick={handleShare}
                      className="bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-full flex items-center gap-2 transition-colors"
                    >
                      <Share2 size={20} />
                      Paylaş
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {music.description && (
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">Hakkında</h2>
                    <p className="text-gray-700 leading-relaxed">{music.description}</p>
                  </div>
                )}

                {/* Comments */}
                <ContentComments
                  contentType="music"
                  contentId={music.id}
                  contentTitle={music.title}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Music Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-bold mb-4">Müzik Bilgileri</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Sanatçı</span>
                      <p className="font-medium">{music.artist}</p>
                    </div>
                    {music.album && (
                      <div>
                        <span className="text-sm text-gray-500">Albüm</span>
                        <p className="font-medium">{music.album}</p>
                      </div>
                    )}
                    {music.duration && (
                      <div>
                        <span className="text-sm text-gray-500">Süre</span>
                        <p className="font-medium">{music.duration}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* External Links */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-bold mb-4">Dinleme Platformları</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handlePlayOnYouTubeMusic}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink size={18} />
                      YouTube Music
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Mobile Hero */}
          <div className="bg-gradient-to-b from-purple-600 to-pink-600 text-white">
            <div className="p-6 text-center">
              <img
                src={music.thumbnail}
                alt={music.title}
                className="w-48 h-48 object-cover rounded-lg shadow-2xl mx-auto mb-6"
              />
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Music size={16} />
                <span className="text-xs font-medium opacity-90">ŞARKI</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">{music.title}</h1>
              <p className="text-lg opacity-90 mb-4">{music.artist}</p>
              
              {music.album && (
                <p className="text-sm opacity-75 mb-6">Albüm: {music.album}</p>
              )}

              {/* Mobile Play Button */}
              <button
                onClick={handlePlayOnYouTubeMusic}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full flex items-center gap-2 mx-auto mb-4 transition-colors"
              >
                <Play size={20} />
                Dinle
              </button>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToList}
                className="bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Listeye Ekle
              </button>
              <button
                onClick={handleShare}
                className="bg-gray-100 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Paylaş
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePlayOnYouTubeMusic}
                className="bg-red-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                YouTube Music
              </button>
              <button
                onClick={() => setShowListUsers(true)}
                className="bg-gray-100 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Kimler Ekledi
              </button>
            </div>

            {/* Music Info */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold mb-3">Müzik Bilgileri</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Sanatçı</span>
                  <p className="font-medium">{music.artist}</p>
                </div>
                {music.album && (
                  <div>
                    <span className="text-sm text-gray-500">Albüm</span>
                    <p className="font-medium">{music.album}</p>
                  </div>
                )}
                {music.duration && (
                  <div>
                    <span className="text-sm text-gray-500">Süre</span>
                    <p className="font-medium">{music.duration}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {music.description && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-bold mb-3">Hakkında</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{music.description}</p>
              </div>
            )}

            {/* Mobile Comments */}
            <div className="bg-white rounded-lg p-4">
              <ContentComments
                contentType="music"
                contentId={music.id}
                contentTitle={music.title}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="music"
        contentId={music.id}
        contentTitle={music.title}
        contentImage={music.thumbnail}
        contentDescription={music.description}
      />

      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="music"
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
        title={`${music.title} - ${music.artist}`}
        description={music.description}
      />
    </>
  );
}