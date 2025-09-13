import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthPopup } from '../components/AuthPopup';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Pencil, ChatCircle, MapPin, Link as LinkIcon, X, Heart } from '@phosphor-icons/react';
import { FollowModal } from '../components/FollowModal';
import { ListPreview } from '../components/ListPreview';
import { ProfileCategories } from '../components/ProfileCategories';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { getUserLists, followUser, unfollowUser, checkIfFollowing, getFollowers, getFollowing, checkMutualFollow } from '../lib/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Helmet } from 'react-helmet-async';

interface FollowUser {
  id: string;
  username: string;
  full_name?: string;
  avatar?: string;
}

interface ListCreatorProfile {
  username: string;
  full_name: string;
  avatar: string;
}

interface ListItem {
  id: string;
  title: string;
  image_url: string;
  type?: "movie" | "series" | "book" | "game" | "person" | "video" | "place" | "music";
  external_id?: string;
  year?: string;
  [key: string]: any; // Diğer olası alanlar için genel tip
}

interface DetailedList {
  id: string;
  title: string;
  description: string;
  category?: string;
  created_at: string;
  likes_count?: number;
  items_count?: number;
  user_id: string; 
  profiles: ListCreatorProfile; 
  items: ListItem[];
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
  bio?: string;
  website?: string;
  location?: string;
  followers_count: number;
  following_count: number;
}

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<DetailedList[]>([]); 
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false); 
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [showLikedListsModal, setShowLikedListsModal] = useState(false); 
  const [likedLists, setLikedLists] = useState<DetailedList[]>([]);
  const [isLoadingMoreLikedLists, setIsLoadingMoreLikedLists] = useState(false);
  const [hasMoreLikedLists, setHasMoreLikedLists] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 5;
  const listContainerRef = useRef<HTMLDivElement>(null);
  const mobileListContainerRef = useRef<HTMLDivElement>(null);
  const likedListsContainerRef = useRef<HTMLDivElement>(null);
  const [lastViewedListId, setLastViewedListId] = useLocalStorage<string | null>('lastViewedListId', null);
  const [currentSessionUserId, setCurrentSessionUserId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentSessionUserId(session?.user?.id || null);
    };
    fetchSession();
  }, []);

  // Format bio and title for meta tags
  const metaDescription = profile?.bio ? profile.bio.substring(0, 160) + (profile.bio.length > 160 ? '...' : '') : t('app.description');
  const profileTitle = profile ? (profile.full_name || profile.username) : (username || t('common.loading'));
  const profileImage = profile?.avatar;

  // Sayfa yüklendiğinde en üste kaydır
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Son görüntülenen listeye scroll yapma
  useEffect(() => {
    if (lastViewedListId && lists.length > 0) {
      const scrollToList = () => {
        const listElement = document.getElementById(`list-${lastViewedListId}`);
        if (listElement) {
          // Mobil cihazlarda farklı scroll davranışı
          if (window.innerWidth < 768 && mobileListContainerRef.current) {
            const yOffset = listElement.getBoundingClientRect().top + window.pageYOffset - 200;
            window.scrollTo({ top: yOffset, behavior: 'smooth' });
          } else {
            listElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setLastViewedListId(null); // Kaydırma yapıldıktan sonra temizle
        }
      };
      
      // Listelerin yüklenmesi için kısa bir gecikme
      setTimeout(scrollToList, 300);
    }
  }, [lists, lastViewedListId]);

  const handleShowFollowers = async () => {
    if (!profile?.id) return;
    try {
      const rawFollowers: any[] = await getFollowers(profile.id);
      const mappedFollowers: FollowUser[] = rawFollowers.map((item: any) => {
        const followerData = item.profiles || item; 
        return {
          id: String(followerData.id), 
          username: followerData.username || t('common.unknown'),
          full_name: followerData.full_name || followerData.username || t('common.unknownUser'),
          avatar: followerData.avatar || ''
        };
      });
      setFollowers(mappedFollowers);
      setShowFollowersModal(true);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const handleShowFollowing = async () => {
    if (!profile?.id) return;
    try {
      const rawFollowing: any[] = await getFollowing(profile.id);
      const mappedFollowing: FollowUser[] = rawFollowing.map((item: any) => {
        const followingData = item.profiles || item;
        return {
          id: String(followingData.id),
          username: followingData.username || t('common.unknown'),
          full_name: followingData.full_name || followingData.username || t('common.unknownUser'),
          avatar: followingData.avatar || ''
        };
      });
      setFollowing(mappedFollowing);
      setShowFollowingModal(true);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleFollowClick = async () => {
    try {
      const isAuthenticated = await requireAuth('kullanıcıyı takip etmek');
      if (!isAuthenticated) return;
      
      if (!profile || !profile.id) {
        console.error('Profil bilgisi bulunamadı');
        return;
      }
      
      setIsLoadingFollow(true);
      
      if (isFollowing) {
        console.log("Takipten çıkarma deneniyor...", profile.id);
        const success = await unfollowUser(profile.id);
        if (success) {
          console.log("Takipten çıkarma başarılı");
          setIsFollowing(false);
        } else {
          console.error('Takipten çıkarma başarısız oldu');
        }
      } else {
        console.log("Takip etme deneniyor...", profile.id);
        try {
          const success = await followUser(profile.id);
          if (success) {
            console.log("Takip etme başarılı");
            setIsFollowing(true);
          } else {
            console.error('Takip etme başarısız oldu');
          }
        } catch (followError) {
          console.error('Takip etme sırasında hata:', followError);
        }
      }
    } catch (error) {
      console.error('Follow işlemi sırasında beklenmeyen hata:', error);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  useEffect(() => {
    const initializeProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (username === 'me') {
          navigate('/auth/login', { state: { from: location } });
          return;
        }
      } else {
      }

      try {
        let query = supabase
          .from('profiles')
          .select('id, username, full_name, avatar, bio, website, location, followers_count, following_count')
          .limit(1);
        
        // Eğer username "me" ise veya UUID formatındaysa ID ile ara
        if (username === 'me') {
          query = query.eq('id', session?.user?.id);
        } else if (username?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          query = query.eq('id', username);
        } else {
          query = query.eq('username', username);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Profil bulunamadı');
        }
        
        const fetchedProfile = data[0];
        setProfile(fetchedProfile);
        setIsCurrentUser(session?.user?.id === fetchedProfile?.id);

        // Eğer "me" ile giriş yapıldıysa, URL'i username ile güncelle
        if (username === 'me' && fetchedProfile?.username) {
          navigate(`/profile/${fetchedProfile.username}`, { replace: true });
        }
      } catch (error) {
        setError('Profil bilgileri yüklenirken bir hata oluştu.');
        console.error('Error fetching profile:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, [username, navigate]);

  useEffect(() => {
    if (profile?.id) {
      checkFollowStatus();
    }
  }, [profile?.id]);

  const checkFollowStatus = async () => {
    if (!profile?.id) return;
    
    try {
      console.log("Takip durumu kontrolü başlatılıyor...", {
        profileId: profile.id,
      });
      // Takip durumunu kontrol et
      const following = await checkIfFollowing(profile.id);
      console.log("Takip durumu kontrolü sonucu:", { userId: profile.id, following });
      
      // Takip durumunu güncelle
      setIsFollowing(following);
      
      // Karşılıklı takip durumunu kontrol et
      if (following) {
        try {
          const isMutual = await checkMutualFollow(profile.id);
          console.log("Karşılıklı takip durumu:", isMutual);
        } catch (mutualError) {
          console.error("Karşılıklı takip durumu kontrol edilirken hata:", mutualError);
        }
      }
    } catch (error) {
      console.error('Takip durumu kontrol edilirken hata:', error);
      // Hata durumunda varsayılan olarak takip etmediğimizi varsayalım
      setIsFollowing(false);
    }
  };

  useEffect(() => {
    const fetchLikedLists = async () => {
      if (!profile?.id) return;
      setCurrentPage(0);
      try {
        const { data, error } = await supabase
          .from('list_likes')
          .select(`
            lists (
              id,
              title,
              description,
              category,
              created_at,
              likes_count,
              items_count,
              user_id, 
              profiles:user_id (
                username,
                full_name,
                avatar
              )
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        const validData = data.filter(entry => entry.lists);

        const formattedLists = await Promise.all(
          validData.map(async ({ lists: listData }) => {
            if (!listData) return null; 
            const listObject = listData as any; 
            const { data: items } = await supabase
              .from('list_items')
              .select('*')
              .eq('list_id', listObject.id)
              .order('position');

            return {
              id: String(listObject.id),
              title: listObject.title || t('common.untitledList'),
              description: listObject.description || '',
              category: listObject.category,
              created_at: listObject.created_at,
              likes_count: listObject.likes_count ?? 0, // Default to 0
              items_count: listObject.items_count ?? 0, // Default to 0
              user_id: String(listObject.user_id),
              profiles: listObject.profiles || { username: t('common.unknown'), full_name: t('common.unknownUser'), avatar: '' },
              items: (items || []).map((item: any) => ({ 
                id: String(item.id),
                title: item.title || '',
                image_url: item.image_url || '',
                type: item.type as ListItem['type'], 
                external_id: item.external_id,
                year: item.year
              }))
            } as DetailedList; 
          })
        );

        setLikedLists(formattedLists.filter(list => list !== null) as DetailedList[]);
        setHasMoreLikedLists(validData.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching liked lists:', error);
      }
    };

    fetchLikedLists();
  }, [profile?.id]);

  const loadMoreLikedLists = async () => {
    if (!profile?.id || isLoadingMoreLikedLists || !hasMoreLikedLists) return;
    
    setIsLoadingMoreLikedLists(true);
    try {
      const nextPage = currentPage + 1;
      const start = nextPage * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('list_likes')
        .select(`
          lists (
            id,
            title,
            description,
            category,
            created_at,
            likes_count,
            items_count,
            user_id,
            profiles:user_id (
              username,
              full_name,
              avatar
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      const validData = data.filter(entry => entry.lists);

      const formattedLists = await Promise.all(
        validData.map(async ({ lists: listData }) => {
          if (!listData) return null;
          const listObject = listData as any;
          const { data: items } = await supabase
            .from('list_items')
            .select('*')
            .eq('list_id', listObject.id)
            .order('position');

          return {
            id: String(listObject.id),
            title: listObject.title || t('common.untitledList'),
            description: listObject.description || '',
            category: listObject.category,
            created_at: listObject.created_at,
            likes_count: listObject.likes_count ?? 0, // Default to 0
            items_count: listObject.items_count ?? 0, // Default to 0
            user_id: String(listObject.user_id),
            profiles: listObject.profiles || { username: t('common.unknown'), full_name: t('common.unknownUser'), avatar: '' },
            items: (items || []).map((item: any) => ({
              id: String(item.id),
              title: item.title || '',
              image_url: item.image_url || '',
              type: item.type as ListItem['type'],
              external_id: item.external_id,
              year: item.year
            }))
          } as DetailedList;
        })
      );

      setLikedLists(prev => [...prev, ...formattedLists.filter(list => list !== null) as DetailedList[]]);
      setCurrentPage(nextPage);
      setHasMoreLikedLists(validData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more liked lists:', error);
    } finally {
      setIsLoadingMoreLikedLists(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!likedListsContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = likedListsContainerRef.current;
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        loadMoreLikedLists();
      }
    };

    const container = likedListsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentPage, hasMoreLikedLists, isLoadingMoreLikedLists]);

  useEffect(() => {
    const fetchUserLists = async () => {
      if (!profile?.id) return;

      setIsLoadingLists(true);
      try {
        const userLists = await getUserLists(profile.id);
        setLists(userLists);
      } catch (error) {
        console.error('Error fetching user lists:', error);
      } finally {
        setIsLoadingLists(false);
      }
    };

    fetchUserLists();
  }, [profile?.id]);

  const filteredLists = activeCategory === 'all'
    ? lists
    : lists.filter(list => list.category === activeCategory);

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <div className="min-h-screen bg-gray-100 pt-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
      <Helmet>
        <title>{t('common.error')} - ConnectList</title>
      </Helmet>
      <div className="min-h-screen bg-gray-100 pt-16 flex items-center justify-center">
        <p className="text-red-500">{error || t('profile.notFound')}</p>
      </div>
      
      </>
    );
  }

  // Profile data is available
  return (
    <>
      <Helmet>
        <title>{`${profileTitle} - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={profileTitle} />
        <meta property="og:description" content={metaDescription} />
        {profileImage && <meta property="og:image" content={profileImage} />}
        <meta property="og:type" content="profile" />
      </Helmet>
      {/* ANA DIV BURADA BAŞLIYOR */}
      <div className="min-h-screen bg-white md:bg-gray-100" data-component-name="Profile" style={{
      paddingTop: 'calc(var(--safe-area-inset-top) + var(--header-height))',
      paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-8">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-white">
            <div className="md:pt-[16px] px-4 md:px-6 md:pb-6">
          {/* Mobile Layout - Instagram Style */}
          <div className="md:hidden px-2 py-2 mt-0">
                {/* Header Row - Avatar left, name above stats */}
                <div className="flex items-center gap-3 mb-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=${Date.now()}` : "https://api.dicebear.com/7.x/avataaars/svg"}
                      alt={profile?.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || '?'}`;
                      }}
                    />
                  </div>

                  {/* Name above stats */}
                  <div className="flex-1 min-w-0">
                    <div className="min-w-0 mb-2">
                      <h1 className="text-sm font-semibold text-gray-900 leading-tight truncate">{profile?.full_name}</h1>
                      <p className="text-xs text-gray-500 truncate">@{profile?.username}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-base font-semibold text-gray-900 leading-none">{filteredLists.length}</div>
                        <div className="text-[11px] text-gray-500 leading-none mt-0.5">{t('profile.lists')}</div>
                      </div>
                      <button onClick={handleShowFollowers} className="text-center">
                        <div className="text-base font-semibold text-gray-900 leading-none">{profile?.followers_count}</div>
                        <div className="text-[11px] text-gray-500 leading-none mt-0.5">{t('profile.followers')}</div>
                      </button>
                      <button onClick={handleShowFollowing} className="text-center">
                        <div className="text-base font-semibold text-gray-900 leading-none">{profile?.following_count}</div>
                        <div className="text-[11px] text-gray-500 leading-none mt-0.5">{t('profile.following')}</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {profile?.bio && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-900 leading-relaxed">{profile.bio}</p>
                          </div>
                        )}

                {/* Location & Website */}
                {(profile?.location || profile?.website) && (
                  <div className="mb-4 space-y-1">
                    {profile?.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <LinkIcon size={14} />
                        <span>{profile.website}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isCurrentUser ? (
                    <button
                      onClick={() => navigate('/settings')}
                      className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {t('profile.editProfile')}
                    </button>
                  ) : (
                          <>
                            <button
                              onClick={handleFollowClick}
                              disabled={isLoadingFollow}
                        className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                                isFollowing
                                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {isLoadingFollow
                                ? 'İşleniyor...'
                                : isFollowing
                                ? t('profile.unfollow')
                                : t('profile.follow')}
                            </button>
                            {isFollowing && (
                              <button
                                onClick={() => navigate(`/messages?to=${profile?.username}`)}
                          className="px-4 py-2 bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                              >
                          <ChatCircle size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex items-end justify-between mt-[10px] relative">
                <div className="flex items-end gap-4">
                  <div className="relative group w-28 h-28">
                    <img
                      src={profile?.avatar}
                      alt={profile?.full_name}
                      className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                    />
                  </div>
                  <div className="flex flex-col justify-between h-20 md:h-28">
                    <div>
                      <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
                      <p className="text-sm text-gray-600">@{profile?.username}</p>
                    </div>
                    <div className="flex gap-4 md:gap-6">
                      <div className="text-left">
                        <div className="text-sm font-bold">{filteredLists.length}</div>
                        <div className="text-xs text-gray-500">{t('profile.lists')}</div>
                      </div>
                      <button onClick={handleShowFollowers} className="text-left">
                        <div className="text-sm font-bold">{profile?.followers_count}</div>
                        <div className="text-xs text-gray-500">{t('profile.followers')}</div>
                      </button>
                      <button onClick={handleShowFollowing} className="text-left">
                        <div className="text-sm font-bold">{profile?.following_count}</div>
                        <div className="text-xs text-gray-500">{t('profile.following')}</div>
                      </button>
                      <button onClick={() => setShowLikedListsModal(true)} className="text-left">
                        <div className="text-sm font-bold">{likedLists.length}</div>
                        <div className="text-xs text-gray-500">{t('profile.likes')}</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf - Butonlar */}
                <div className="absolute top-0 right-0 flex items-center gap-2">
                  {isCurrentUser ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-2 px-5 py-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
                      >
                        <Pencil size={24} />
                        <span>{t('profile.editProfile')}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleFollowClick}
                        disabled={isLoadingFollow}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          isFollowing
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {isLoadingFollow
                          ? t('common.processing')
                          : isFollowing
                          ? t('profile.unfollow')
                          : t('profile.follow')}
                      </button>
                      {isFollowing && (
                        <button
                          onClick={() => navigate(`/messages?to=${profile?.username}`)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-900 h-[38px]"
                        >
                          <ChatCircle size={18} className="inline mr-1" />
                          {t('profile.message')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bio ve Diğer Bilgiler - Sadece Desktop */} 
              <div className="mt-6 hidden md:block">
                <div>
                  {/* Bio */}
                  {profile?.bio && (
                    <p className="text-base text-gray-900 whitespace-pre-wrap mb-2">
                      {profile.bio}
                    </p>
                  )}
                  {/* Website ve Location */}
                  <div className="flex flex-row items-center gap-4">
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon size={16} />
                        {profile.website}
                      </a>
                    )}
                    {profile?.location && (
                      <p className="text-base text-gray-600 flex items-center gap-1">
                        <MapPin size={16} />
                        {profile.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kategori Menüsü */}
          <div className="mb-1" style={{ marginBottom: '5px' }}>
            <ProfileCategories
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>

          {/* Mobile View Toggle removed as requested */}

          {/* Kullanıcının Listeleri - Mobile */}
          <div ref={mobileListContainerRef} className="md:hidden bg-gray-50 min-h-screen">
            {isLoadingLists ? (
              <div className="p-4">
                <div className={`animate-pulse ${mobileViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-4'}`}>
                  {[...Array(mobileViewMode === 'grid' ? 4 : 3)].map((_, i) => (
                    <div key={i} className={`bg-white rounded-2xl shadow-sm ${mobileViewMode === 'grid' ? 'p-4' : 'p-6'}`}>
                      {mobileViewMode === 'grid' ? (
                        <>
                          <div className="w-full h-32 bg-gray-200 rounded-xl mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                          <div className="flex space-x-3">
                            {[...Array(3)].map((_, j) => (
                              <div key={j} className="w-24 h-32 bg-gray-200 rounded-xl"></div>
                      ))}
                    </div>
                        </>
                      )}
                  </div>
                ))}
                </div>
              </div>
            ) : filteredLists.length > 0 ? (
              <div className={`p-4 ${mobileViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-4'}`}>
                {filteredLists.map((list) => (
                  <div 
                    key={list.id}
                    id={`list-${list.id}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setLastViewedListId(list.id);
                      navigate(`/${list.profiles.username}/list/${list.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
                    }}
                  >
                    {mobileViewMode === 'grid' ? (
                      /* Grid View - Compact */
                      <div className="p-4">
                        {/* Main Preview */}
                        {list.items.length > 0 && (
                          <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
                            {list.items[0]?.image_url ? (
                              <img 
                                src={list.items[0].image_url} 
                                alt={list.items[0].title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                <span className="text-3xl">
                                  {list.category === 'movies' ? '🎬' : 
                                   list.category === 'series' ? '📺' : 
                                   list.category === 'books' ? '📚' : 
                                   list.category === 'games' ? '🎮' : 
                                   list.category === 'people' ? '👤' : 
                                   list.category === 'places' ? '📍' : 
                                   list.category === 'musics' ? '🎵' : '📋'}
                                </span>
                </div>
                            )}
                            {list.items.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                +{list.items.length - 1}
                              </div>
                            )}
                            <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                              <Heart size={12} />
                              <span>{list.likes_count || 0}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Title & Info */}
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
                          {list.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{list.items.length} öğe</span>
                          <span>{new Date(list.created_at).toLocaleDateString('tr-TR', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}</span>
                        </div>
                      </div>
                    ) : (
                      /* List View - Detailed */
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-xl">
                                {list.category === 'movies' ? '🎬' : 
                                 list.category === 'series' ? '📺' : 
                                 list.category === 'books' ? '📚' : 
                                 list.category === 'games' ? '🎮' : 
                                 list.category === 'people' ? '👤' : 
                                 list.category === 'places' ? '📍' : 
                                 list.category === 'musics' ? '🎵' : '📋'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                                {list.title}
                              </h3>
                              <div className="flex items-center space-x-3 text-sm text-gray-500">
                                <span>{list.items.length} öğe</span>
                                <span>•</span>
                                <span>{new Date(list.created_at).toLocaleDateString('tr-TR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                })}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-gray-400">
                            <Heart size={18} />
                            <span className="text-sm">{list.likes_count || 0}</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        {list.description && (
                          <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">
                            {list.description}
                          </p>
                        )}
                        
                        {/* Preview Items - Büyük ve kaydırılabilir */}
                        {list.items.length > 0 && (
                          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
                            {list.items.map((item, index) => (
                              <div key={index} className="flex-shrink-0">
                                <div className="w-28 h-36 rounded-xl overflow-hidden bg-gray-100 mb-3 shadow-sm">
                                  {item.image_url ? (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                      <span className="text-2xl text-gray-400">?</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 text-center line-clamp-2 w-28 leading-tight font-medium">
                                  {item.title}
                                </p>
                              </div>
                            ))}
              </div>
            )}
            
                        {/* Footer kaldırıldı: profil sayfasında liste sahibi ve ikonlar gereksiz */}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="text-8xl mb-6">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {activeCategory === 'all' ? 'Henüz liste yok' : 'Bu kategoride liste yok'}
                </h3>
                <p className="text-gray-500 text-base">
                  {activeCategory === 'all'
                    ? 'Henüz liste oluşturmamışsınız'
                    : `${activeCategory} kategorisinde listeniz bulunmuyor`}
                </p>
              </div>
            )}
          </div>
          
          {/* Desktop için listeler */}
          <div ref={listContainerRef} className="space-y-6 hidden md:block">
            {isLoadingLists ? (
              <div className="animate-pulse space-y-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white md:rounded-lg md:shadow-sm p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                    <div className="flex space-x-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="w-[200px]">
                          <div className="aspect-[2/3] bg-gray-200 rounded-lg mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLists.length > 0 ? (
              filteredLists.map((list) => (
                <div key={list.id} id={`list-${list.id}`}>
                  <ListPreview 
                    key={list.id}
                    list={{
                      id: list.id,
                      title: list.title,
                      description: list.description,
                      category: list.category,
                      created_at: list.created_at,
                      likes_count: list.likes_count ?? 0, // Default to 0
                      items_count: list.items_count ?? 0, // Default to 0
                      user_id: list.user_id,
                      profiles: list.profiles
                    }}
                    items={list.items}
                    onListClick={() => setLastViewedListId(list.id)}
                    hideAuthor={true}
                    hideActions={true}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {activeCategory === 'all'
                    ? 'Henüz liste oluşturmamışsınız'
                    : `${activeCategory} kategorisinde listeniz bulunmuyor`}
                </p>
              </div>
            )}
            
            {/* Profil sayfasında reklam alanı */}
            {filteredLists.length > 0 && (
              <div className="mt-8">
                {/* Reklam alanı kaldırıldı */}
              </div>
            )}
          </div>
          
          {/* Reklam Alanı */}
          <div className="mt-6">
            {/* Reklam alanı kaldırıldı */}
          </div>
        </div>
      </div>
      
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
      <FollowModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title={t('profile.followers')}
        users={followers.map(f => ({ ...f, id: String(f.id), username: f.username || t('common.unknown'), full_name: f.full_name || f.username || t('common.unknownUser'), avatar: f.avatar || '' }))}
      />
      <FollowModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title={t('profile.following')}
        users={following.map(f => ({ ...f, id: String(f.id), username: f.username || t('common.unknown'), full_name: f.full_name || f.username || t('common.unknownUser'), avatar: f.avatar || '' }))}
      />
      {/* Beğenilen Listeler Modal */}
      {showLikedListsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowLikedListsModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('profile.likedLists')}</h2>
              <button
                onClick={() => setShowLikedListsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div ref={likedListsContainerRef} className="overflow-y-auto p-4 h-[calc(90vh-73px)]">
              {likedLists.length > 0 ? (
                <div className="space-y-4">
                  {likedLists.map((list) => (
                    <div key={list.id} className="transform scale-90 origin-top">
                      <ListPreview 
                        key={list.id} 
                        list={{
                          id: list.id,
                          title: list.title,
                          description: list.description,
                          category: list.category,
                          created_at: list.created_at,
                          likes_count: list.likes_count ?? 0, // Default to 0
                          items_count: list.items_count ?? 0, // Default to 0
                          user_id: list.user_id,
                          profiles: list.profiles
                        }}
                        items={list.items}
                        currentUserId={currentSessionUserId || ''}
                        isOwnProfile={isCurrentUser}
                      />
                    </div>
                  ))}
                  {isLoadingMoreLikedLists && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('profile.noLikedLists')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
