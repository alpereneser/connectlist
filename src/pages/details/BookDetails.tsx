import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Users, X, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { AddToListModal } from '../../components/AddToListModal';
import { ShareModal } from '../../components/ShareModal';
import { Breadcrumb } from '../../components/Breadcrumb';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import { getBookDetails } from '../../lib/api';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import ContentComments from '../../components/ContentComments';
import i18n from '../../i18n';

interface BookDetails {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  published_date: string;
  description: string;
  page_count: number;
  categories: string[];
  image_links: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
  language: string;
  preview_link: string;
  info_link: string;
  isbn?: string;
}

interface ListUser {
  username: string;
  full_name: string;
  avatar: string;
  list_title: string;
  list_id: string;
}

export function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [book, setBook] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showListUsers, setShowListUsers] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [listsContainingBook] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const bookData = await getBookDetails(id || '');
        setBook(bookData);
      } catch (error) {
        console.error('Error fetching book details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  const fetchListUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          lists!list_id (
            id,
            title,
            profiles!user_id (
              username,
              full_name,
              avatar
            )
          )
        `)
        .eq('type', 'book')
        .eq('external_id', id);

      if (error) throw error;

      const users = data
        .map((item: any) => {
          const listData = item?.lists;
          const profileData = listData?.profiles;
          if (!listData || !profileData || !profileData.username) {
            console.warn('Skipping item due to missing data:', item);
            return null;
          }
          return {
            username: profileData.username,
            full_name: profileData.full_name,
            avatar: profileData.avatar,
            list_title: listData.title,
            list_id: listData.id
          };
        })
        .filter((user): user is ListUser => user !== null);

      setListUsers(users);
      setShowListUsers(true);
    } catch (error) {
      console.error('Error fetching list users:', error);
    }
  };

  const bookSchema = useMemo(() => {
    if (!book) return null;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Book',
      'name': book.title,
      'description': book.description,
      'image': book.image_links.large || book.image_links.medium || book.image_links.small,
      'author': book.authors.map(author => ({ '@type': 'Person', 'name': author })) || [],
      'datePublished': book.published_date,
      'isbn': '',
      'numberOfPages': book.page_count,
      'publisher': book.publisher,
      'inLanguage': book.language,
    };

    Object.keys(schema).forEach(key => {
      const value = schema[key as keyof typeof schema];
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        delete schema[key as keyof typeof schema];
      }
    });

    return schema;

  }, [book]);

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="flex gap-8">
                <div className="w-64 h-96 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        <Helmet>
          <title>{t('common.error')} - ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Kitap bulunamadı</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const authorsString = book.authors.join(', ') || '';
  const metaDescription = book.description ? book.description.substring(0, 160) + (book.description.length > 160 ? '...' : '') : t('app.description');
  const bookTitleWithAuthor = `${book.title}${authorsString ? ` - ${authorsString}` : ''}`;

  const handleAttemptAddToList = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Oturum açık, kullanıcı ID:', session.user.id);
        setShowAddToListModal(true);
      } else {
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

  return (
    <>
      <Helmet>
        <title>{`${bookTitleWithAuthor} - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="book" />
        <meta property="og:url" content={`https://connectlist.me/book/${id}`} />
        <meta property="og:title" content={bookTitleWithAuthor} />
        <meta property="og:description" content={metaDescription || t('social.meta.bookDescription', { title: book.title })} />
        {book.image_links.large && <meta property="og:image" content={book.image_links.large} />}
        {book.image_links.large && <meta property="og:image:width" content="400" />}
        {book.image_links.large && <meta property="og:image:height" content="600" />}
        {book.image_links.large && <meta property="og:image:alt" content={`${book.title} ${t('social.meta.defaultImage')}`} />}
        <meta property="og:site_name" content={t('social.meta.siteName')} />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : 'en_US'} />
        <meta property="og:locale:alternate" content={i18n.language === 'tr' ? 'en_US' : 'tr_TR'} />
        
        {/* Book specific Open Graph */}
        {book.authors && <meta property="book:author" content={book.authors.join(', ')} />}
        {book.published_date && <meta property="book:release_date" content={book.published_date} />}
        {book.isbn && <meta property="book:isbn" content={book.isbn} />}
        {book.categories && book.categories.map(category => (
          <meta key={category} property="book:tag" content={category} />
        ))}
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@connectlist" />
        <meta name="twitter:title" content={bookTitleWithAuthor} />
        <meta name="twitter:description" content={metaDescription} />
        {book.image_links.large && <meta name="twitter:image" content={book.image_links.large} />}
        {book.image_links.large && <meta name="twitter:image:alt" content={`${book.title} book cover`} />}
        
        {/* WhatsApp specific meta tags */}
        {book.image_links.large && <meta property="og:image:type" content="image/jpeg" />}
        {book.image_links.large && <meta property="og:image:secure_url" content={book.image_links.large} />}
        
        {bookSchema && (
          <script type="application/ld+json">
            {JSON.stringify(bookSchema)}
          </script>
        )}
      </Helmet>

      <Header />
      <div className="min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 pt-[95px]">
        <div className="mb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Breadcrumb
            items={[
              { label: t('common.categories.books'), href: '/search?category=books' },
              { label: book.title }
            ]}
          />
        </div>
        
        <div className="bg-white min-h-screen">
          <div className="hidden md:block">
            <div className="relative h-96 bg-gradient-to-r from-gray-900 to-gray-700">
              <div className="absolute inset-0">
                <img
                  src={book.image_links.large || book.image_links.medium || book.image_links.small}
                  alt={book.title}
                  className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
              </div>
              
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
                <div className="flex gap-8">
                  <div className="flex-shrink-0">
                    <img
                      src={book.image_links.large || book.image_links.medium || book.image_links.small}
                      alt={book.title}
                      className="w-64 rounded-lg shadow-2xl aspect-[2/3] object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 text-white">
                    <h1 className="text-4xl font-bold mb-4">{book.title}</h1>
                    <div className="flex items-center gap-4 text-lg mb-6">
                      <span>{book.authors.join(', ')}</span>
                      <span>•</span>
                      <span>{new Date(book.published_date).getFullYear()}</span>
                    </div>
                    {book.categories && book.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {book.categories.map(category => (
                          <span
                            key={category}
                            className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button
                        onClick={handleAttemptAddToList}
                        className="flex items-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
                      >
                        <Plus size={20} className="mr-2" />
                        {t('details.addToList')}
                      </button>
                      <button
                        onClick={fetchListUsers}
                        className="flex items-center bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                      >
                        <Users size={20} className="mr-2" />
                        {t('details.whoAdded')}
                      </button>
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                      >
                        <Share2 size={20} className="mr-2" />
                        Paylaş
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Hero Section */}
          <div className="md:hidden">
            <div className="relative">
              {/* Background Image */}
              <div className="absolute inset-0 h-48">
                <img
                  src={book.image_links.large || book.image_links.medium || book.image_links.small}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
              
              {/* Content */}
              <div className="relative z-10 pt-8 pb-4 px-4">
                <div className="flex gap-4 items-end">
                  {/* Book Cover */}
                  <div className="w-24 flex-shrink-0">
                    <img
                      src={book.image_links.large || book.image_links.medium || book.image_links.small}
                      alt={book.title}
                      className="w-full rounded-lg aspect-[2/3] object-cover shadow-lg"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-white pb-2">
                    <h1 className="text-xl font-bold mb-2 leading-tight">{book.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
                      <span>{book.authors.join(', ')}</span>
                      <span>•</span>
                      <span>{new Date(book.published_date).getFullYear()}</span>
                    </div>
                    {book.categories && book.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {book.categories.slice(0, 3).map(category => (
                          <span
                            key={category}
                            className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sticky Action Buttons */}
            <div className="sticky top-[95px] z-20 bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={handleAttemptAddToList}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                  <Plus size={18} />
                  <span>{t('listPreview.addToList')}</span>
                </button>
                <button
                  onClick={fetchListUsers}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Users size={18} />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden bg-white border-b border-gray-200 sticky top-[155px] z-10">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Genel Bakış
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Detaylar
              </button>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="md:col-span-2 space-y-3 md:space-y-6">
                <div>
                  <h2 className="text-base font-bold mb-1 md:text-lg md:mb-2">{t('details.about')}</h2>
                  <div
                    className="text-xs md:text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: book.description }}
                  />
                </div>

                <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4">{t('details.info.book.title')}</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-gray-500">{t('details.info.book.publisher')}</dt>
                      <dd className="font-medium text-sm md:text-base">{book.publisher}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.book.publishDate')}</dt>
                      <dd className="font-medium text-sm md:text-base">
                        {new Date(book.published_date).toLocaleDateString('tr-TR')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.book.pageCount')}</dt>
                      <dd className="font-medium text-sm md:text-base">{book.page_count}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.book.language')}</dt>
                      <dd className="font-medium text-sm md:text-base">{book.language.toUpperCase()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="md:hidden bg-gray-50 min-h-screen">
            {activeTab === 'overview' && (
              <div className="p-4 space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <h2 className="text-lg font-bold mb-3">{t('details.about')}</h2>
                  <div
                    className="text-sm text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: book.description }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="p-4 space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-4">{t('details.info.book.title')}</h3>
                  <dl className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <dt className="text-gray-500 font-medium">{t('details.info.book.publisher')}</dt>
                      <dd className="font-medium text-right">{book.publisher}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <dt className="text-gray-500 font-medium">{t('details.info.book.publishDate')}</dt>
                      <dd className="font-medium text-right">
                        {new Date(book.published_date).toLocaleDateString('tr-TR')}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <dt className="text-gray-500 font-medium">{t('details.info.book.pageCount')}</dt>
                      <dd className="font-medium text-right">{book.page_count}</dd>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <dt className="text-gray-500 font-medium">{t('details.info.book.language')}</dt>
                      <dd className="font-medium text-right">{book.language.toUpperCase()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ContentComments
            contentType="book"
            contentId={book.id}
            contentTitle={book.title}
          />
        </div>
      </div>

      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="book"
        contentId={book.id}
        contentTitle={book.title}
        contentImage={book.image_links.large || book.image_links.medium || book.image_links.small || book.image_links.thumbnail}
        contentYear={book.published_date ? new Date(book.published_date).getFullYear().toString() : undefined}
        contentDescription={book.description}
      />

      {showListUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('listPreview.whoAdded')}</h2>
              <button
                onClick={() => setShowListUsers(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {listUsers.length > 0 ? (
                <div className="space-y-4">
                  {listUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <img
                        src={user.avatar}
                        alt={user.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/${user.username}/list/${encodeURIComponent(user.list_title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`)}
                        className="text-orange-500 hover:text-orange-600 text-sm"
                      >
                        {user.list_title}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {t('listPreview.noOneAdded')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {listsContainingBook && listsContainingBook.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">{t('details.listsContainingItem')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listsContainingBook.map((item: any) => { 
              const listData = item.lists;
              if (!listData) return null;
              const profileData = listData.profiles;
              return (
                <Link key={listData.id} to={`/${profileData?.username}/list/${listData.id}`} className="block bg-white p-3 rounded shadow hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <img src={profileData?.avatar || '/default-avatar.png'} alt={profileData?.full_name || profileData?.username} className="w-6 h-6 rounded-full mr-2"/>
                    <span className="text-sm font-medium">{profileData?.username}</span>
                  </div>
                  <p className="text-gray-800 font-semibold truncate">{listData.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={book.title}
        description={book.description}
      />
    </>
  );
}
