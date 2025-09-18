import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { AddToListModal } from '../../components/AddToListModal';
import { Breadcrumb } from '../../components/Breadcrumb';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import { getBookDetails } from '../../lib/api';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import ContentComments from '../../components/ContentComments';

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
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [listsContainingBook] = useState<any[]>([]);

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
        const isLoggedIn = await requireAuth(t('details.addToListAuthAction'));
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
        <meta property="og:title" content={bookTitleWithAuthor} />
        <meta property="og:description" content={metaDescription} />
        {book.image_links.large && <meta property="og:image" content={book.image_links.large} />}
        <meta property="og:type" content="book" />
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:hidden">
            <div className="flex gap-4 p-4">
              <div className="w-1/3">
                <img
                  src={book.image_links.large || book.image_links.medium || book.image_links.small}
                  alt={book.title}
                  className="w-full rounded-lg aspect-[2/3] object-cover"
                />
              </div>
              
              <div className="w-2/3">
                <h1 className="text-base font-bold mb-1">{book.title}</h1>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 mb-2">
                  <span>{book.authors.join(', ')}</span>
                  <span>•</span>
                  <span>{new Date(book.published_date).getFullYear()}</span>
                </div>
                {book.categories && book.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {book.categories.map(category => (
                      <span
                        key={category}
                        className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
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
              
              <div className="space-y-4 md:space-y-6 md:hidden">
                <div className="flex flex-wrap gap-3 items-center px-4">
                  <button
                    onClick={handleAttemptAddToList}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                  >
                    <Plus size={18} className="mr-2" />
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
              </div>
            </div>
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
    </>
  );
}
