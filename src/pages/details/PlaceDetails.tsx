import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, Plus, Star, Phone, Globe, Clock, MapPinned, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { Breadcrumb } from '../../components/Breadcrumb';
import { AddToListModal } from '../../components/AddToListModal';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import { getPlaceDetails } from '../../lib/api';
import { useWhoAdded } from '../../hooks/useWhoAdded';
import { WhoAddedModal } from '../../components/WhoAddedModal';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import ContentComments from '../../components/ContentComments';

interface PlaceDetails {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  region?: string;
  country: string;
  postal_code?: string;
  categories: string[];
  rating?: number;
  price?: string;
  hours?: string;
  tel?: string;
  website?: string;
  social_media?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  photos: Array<{url: string}>;
  tips?: Array<{
    text: string;
    created_at: string;
    user?: {
      name: string;
      photo: string | null;
    } | null;
  }>;
  latitude?: number;
  longitude?: number;
  menu_url?: string;
}

export function PlaceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { users, fetchUsers } = useWhoAdded();
  const [showListUsers, setShowListUsers] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  useEffect(() => {
    const fetchPlaceDetails = async () => {
      try {
        const placeData = await getPlaceDetails(id || '', i18n.language);
        if (placeData) {
          // API'den dönen veriyi PlaceDetails interface'ine uygun hale getir
          const formattedPlace: PlaceDetails = {
            id: placeData.id,
            name: placeData.name,
            description: placeData.description || '',
            address: placeData.address,
            city: placeData.city,
            country: placeData.country,
            categories: placeData.types || [],
            rating: placeData.rating,
            hours: placeData.opening_hours?.join(', '),
            tel: placeData.phone,
            website: placeData.website,
            photos: placeData.photos ? placeData.photos.map((url: string) => ({ url })) : [],
            latitude: placeData.latitude,
            longitude: placeData.longitude
          };
          setPlace(formattedPlace);
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
        setError('Mekan detayları yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [id]);

  const fetchListUsers = async () => {
    await fetchUsers('place', id || '');
    setShowListUsers(true);
  };

  // Listeye ekle butonuna tıklandığında çalışan fonksiyon
  const handleAttemptAddToList = async () => {
    try {
      // Kullanıcının oturum durumunu kontrol et
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Oturum açıksa doğrudan modal'ı göster
        console.log('Oturum açık, kullanıcı ID:', session.user.id);
        setShowAddToListModal(true);
      } else {
        // Oturum açık değilse requireAuth ile oturum açma popup'ını göster
        console.log('Oturum açık değil, popup gösteriliyor');
        const isLoggedIn = await requireAuth('addingToList');
        if (isLoggedIn) {
          setShowAddToListModal(true);
        }
      }
    } catch (error) {
      console.error('Oturum kontrolü sırasında hata:', error);
    }
  };

  // Harita URL'si oluştur
  const mapUrl = useMemo(() => {
    if (!place?.latitude || !place?.longitude) return '';
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyCEQZ1ri472vtTCiexDsriTKZTIPQoRJkY&q=${place.latitude},${place.longitude}&zoom=15`;
  }, [place?.latitude, place?.longitude]);

  // Meta açıklaması
  const metaDescription = place?.description 
    ? place.description.substring(0, 160) + (place.description.length > 160 ? '...' : '') 
    : 'Mekan detayları';

  // Şema verisi
  const placeSchema = useMemo(() => {
    if (!place) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': place.name,
      'description': place.description,
      'image': place.photos[0],
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': place.address,
        'addressLocality': place.city,
        'addressRegion': place.region,
        'postalCode': place.postal_code,
        'addressCountry': place.country
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': place.latitude,
        'longitude': place.longitude
      },
      'telephone': place.tel,
      'url': place.website,
      'priceRange': place.price,
      'openingHours': place.hours
    };
  }, [place]);

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="animate-pulse">
            <div className="h-[400px] bg-gray-200" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !place) {
    return (
      <>
        <Helmet>
          <title>Hata - ConnectList</title>
        </Helmet>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <h1 className="text-2xl font-bold text-red-500 mb-4">Hata</h1>
              <p className="text-gray-700 mb-4">{error || 'Mekan bulunamadı.'}</p>
              <button
                onClick={() => navigate(-1)}
                className="bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600"
              >
                Geri Dön
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{place.name} - ConnectList</title>
        <meta name="description" content={metaDescription} />
        {placeSchema && (
          <script type="application/ld+json">
            {JSON.stringify(placeSchema)}
          </script>
        )}
      </Helmet>
      
      <Header />
      
      <div className="min-h-screen bg-gray-100 pt-16">
        {/* Hero bölümü */}
        <div 
          className="relative h-[300px] md:h-[400px] bg-cover bg-center"
          style={{ backgroundImage: `url(${place.photos[0].url})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-6">
              <Breadcrumb 
                items={[
                  { label: 'Ana Sayfa', href: '/' },
                  { label: 'Mekanlar', href: '/search/places' },
                  { label: place.name, href: '#', current: true }
                ]} 
              />
              <h1 className="text-white text-2xl md:text-4xl font-bold mt-2">{place.name}</h1>
              <div className="flex items-center mt-2">
                {place.categories.map((category, index) => (
                  <span 
                    key={index} 
                    className="bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded mr-2"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* İçerik bölümü */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sol kolon - Ana içerik */}
            <div className="lg:col-span-2 space-y-6">
              {/* Adres ve Temel Bilgiler */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <MapPin className="text-orange-500 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Adres</h2>
                    <p className="text-gray-700">{place.address}</p>
                    <p className="text-gray-700">{place.city}, {place.region} {place.postal_code}</p>
                    <p className="text-gray-700">{place.country}</p>
                  </div>
                </div>
                
                {place.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h2 className="text-xl font-semibold mb-2">Hakkında</h2>
                    <p className="text-gray-700">{place.description}</p>
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {place.tel && (
                    <div className="flex items-start gap-4">
                      <Phone className="text-orange-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <h3 className="font-medium">Telefon</h3>
                        <a href={`tel:${place.tel}`} className="text-orange-500 hover:underline">
                          {place.tel}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {place.website && (
                    <div className="flex items-start gap-4">
                      <Globe className="text-orange-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <h3 className="font-medium">Web Sitesi</h3>
                        <a 
                          href={place.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline"
                        >
                          {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {place.hours && (
                    <div className="flex items-start gap-4">
                      <Clock className="text-orange-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <h3 className="font-medium">Çalışma Saatleri</h3>
                        <p className="text-gray-700">{place.hours}</p>
                      </div>
                    </div>
                  )}
                  
                  {place.price && (
                    <div className="flex items-start gap-4">
                      <Star className="text-orange-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <h3 className="font-medium">Fiyat Aralığı</h3>
                        <p className="text-gray-700">{place.price}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Fotoğraflar */}
              {place.photos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Fotoğraflar</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {place.photos.slice(0, 6).map((photo, index) => (
                      <div 
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer"
                        onClick={() => {
                          setActivePhotoIndex(index);
                          setShowPhotoGallery(true);
                        }}
                      >
                        <img 
                          src={photo.url} 
                          alt={`${place.name} - Fotoğraf ${index + 1}`}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ))}
                    {place.photos.length > 6 && (
                      <div 
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-black bg-opacity-70 flex items-center justify-center"
                        onClick={() => {
                          setActivePhotoIndex(6);
                          setShowPhotoGallery(true);
                        }}
                      >
                        <div className="text-white text-center">
                          <p className="text-2xl font-bold">+{place.photos.length - 6}</p>
                          <p className="text-sm">Daha fazla</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Harita */}
              {mapUrl && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Konum</h2>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={mapUrl}
                    ></iframe>
                  </div>
                  <div className="mt-4">
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-orange-500 hover:underline"
                    >
                      <MapPinned size={16} className="mr-1" />
                      Yol tarifi al
                    </a>
                  </div>
                </div>
              )}
              
              {/* Yorumlar */}
              {place.tips && place.tips.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Yorumlar</h2>
                  <div className="space-y-4">
                    {place.tips.map((tip, index) => (
                      <div key={`tip-${index}`} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          {tip.user?.photo ? (
                            <img 
                              src={tip.user.photo} 
                              alt={tip.user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {tip.user?.name.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{tip.user?.name || 'Misafir'}</h3>
                              <span className="text-xs text-gray-500">
                                {new Date(tip.created_at).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">{tip.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Comments Section */}
            <div className="col-span-1 lg:col-span-2">
              <ContentComments
                contentType="place"
                contentId={place?.id || ''}
                contentTitle={place?.name || ''}
              />
            </div>
            
            {/* Sağ kolon - Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={handleAttemptAddToList}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    <Plus size={18} />
                    {t('details.addToList')}
                  </button>
                  <button
                    onClick={fetchListUsers}
                    className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                  >
                    <Users size={18} className="mr-2" />
                    {t('details.whoAdded')}
                  </button>
                </div>
                
                {place.menu_url && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a 
                      href={place.menu_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Menüyü Görüntüle
                    </a>
                  </div>
                )}
                
                {/* Sosyal Medya Linkleri */}
                {place.social_media && (place.social_media.instagram || place.social_media.twitter || place.social_media.facebook) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-medium mb-2">Sosyal Medya</h3>
                    <div className="flex gap-2">
                      {place.social_media?.instagram && (
                        <a 
                          href={place.social_media?.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                          </svg>
                        </a>
                      )}
                      {place.social_media?.twitter && (
                        <a 
                          href={place.social_media?.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                          </svg>
                        </a>
                      )}
                      {place.social_media?.facebook && (
                        <a 
                          href={place.social_media?.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      
      {/* Fotoğraf Galerisi Modal */}
      {showPhotoGallery && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <button
            onClick={() => setShowPhotoGallery(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-4xl">
            <img 
              src={place.photos[activePhotoIndex].url} 
              alt={`${place.name} - Fotoğraf ${activePhotoIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            
            <div className="flex justify-between items-center mt-4 px-4">
              <button
                onClick={() => setActivePhotoIndex((prev) => (prev === 0 ? place.photos.length - 1 : prev - 1))}
                className="text-white hover:text-gray-300"
                disabled={place.photos.length <= 1}
              >
                Önceki
              </button>
              
              <div className="text-white">
                {activePhotoIndex + 1} / {place.photos.length}
              </div>
              
              <button
                onClick={() => setActivePhotoIndex((prev) => (prev === place.photos.length - 1 ? 0 : prev + 1))}
                className="text-white hover:text-gray-300"
                disabled={place.photos.length <= 1}
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="place"
        contentId={place.id}
        contentTitle={place.name}
        contentImage={place.photos[0].url}
        contentDescription={place.description}
      />
      
      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="place"
      />
      
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
    </>
  );
}
