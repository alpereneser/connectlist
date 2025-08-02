# Connectlist - Proje Dokümantasyonu

## İçindekiler
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Tech Stack](#tech-stack)
3. [Proje Yapısı](#proje-yapısı)
4. [Veritabanı Yapısı](#veritabanı-yapısı)
5. [Sayfalar ve Bileşenler](#sayfalar-ve-bileşenler)
6. [Servisler ve API'ler](#servisler-ve-apiler)
7. [Dış Servis Entegrasyonları](#dış-servis-entegrasyonları)
8. [Deployment ve Hosting](#deployment-ve-hosting)
9. [Güvenlik](#güvenlik)
10. [Performans Optimizasyonları](#performans-optimizasyonları)

## Proje Genel Bakış

Connectlist, kullanıcıların film, dizi, kitap, oyun, mekan ve video listelerini oluşturabileceği, paylaşabileceği ve keşfedebileceği sosyal bir platform uygulamasıdır.

### Ana Özellikler
- **Liste Oluşturma**: Farklı kategorilerde (film, dizi, kitap, oyun, mekan, video) listeler oluşturma
- **Sosyal Etkileşim**: Kullanıcıları takip etme, listleri beğenme, yorum yapma
- **Arama ve Keşif**: Gelişmiş arama ve kategori bazlı keşif
- **Mesajlaşma**: Kullanıcılar arası özel mesajlaşma
- **Bildirimler**: Gerçek zamanlı bildirim sistemi
- **Çoklu Dil Desteği**: Türkçe ve İngilizce dil desteği
- **PWA Desteği**: Progressive Web App özellikleri

## Tech Stack

### Frontend
- **React 18**: Modern React hooks ve functional components
- **TypeScript**: Type safety ve geliştirici deneyimi
- **Vite**: Hızlı build tool ve development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **React Query**: Server state management
- **React Hook Form**: Form yönetimi
- **Zod**: Schema validation
- **i18next**: Internationalization
- **Lucide React**: Icon library

### Backend & Database
- **Supabase**: Backend-as-a-Service
  - PostgreSQL veritabanı
  - Authentication
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Edge Functions

### Hosting & Deployment
- **Netlify**: Frontend hosting ve CI/CD
- **Netlify Functions**: Serverless functions
- **Netlify Edge Functions**: Edge computing

### External APIs
- **TMDB API**: Film ve dizi verileri
- **Google Books API**: Kitap verileri
- **RAWG API**: Oyun verileri
- **Google Places API**: Mekan verileri
- **YouTube API**: Video verileri
- **SendGrid**: Email servisi
- **Google Analytics**: Analytics
- **Microsoft Clarity**: User behavior analytics

## Proje Yapısı

```
connectlist/
├── src/
│   ├── components/          # Yeniden kullanılabilir bileşenler
│   ├── pages/              # Sayfa bileşenleri
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility fonksiyonları ve servisler
│   ├── types/              # TypeScript type tanımları
│   ├── contexts/           # React context providers
│   ├── i18n/               # Çoklu dil desteği
│   └── utils/              # Yardımcı fonksiyonlar
├── netlify/
│   └── functions/          # Serverless functions
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Veritabanı migration'ları
├── public/                 # Static assets
└── scripts/                # Build ve deployment scriptleri
```

### Klasör Detayları

#### `/src/components/`
- **AuthLayout.tsx**: Authentication layout wrapper
- **Header.tsx**: Ana navigation header
- **BottomMenu.tsx**: Mobil bottom navigation
- **SearchPopup.tsx**: Arama modal'ı
- **ListPreview.tsx**: Liste önizleme kartı
- **Profile.tsx**: Kullanıcı profil bileşeni
- **NotificationDropdown.tsx**: Bildirim dropdown'u
- **CommentSection.tsx**: Yorum sistemi
- **AddToListModal.tsx**: Listeye ekleme modal'ı

#### `/src/pages/`
- **Search.tsx**: Ana arama sayfası
- **CreateList.tsx**: Liste oluşturma sayfası
- **ListDetails.tsx**: Liste detay sayfası
- **Profile.tsx**: Kullanıcı profil sayfası
- **Messages.tsx**: Mesajlaşma sayfası
- **Notifications.tsx**: Bildirimler sayfası
- **Settings.tsx**: Ayarlar sayfası
- **CategoryLanding.tsx**: Kategori landing sayfaları

#### `/src/hooks/`
- **useDebounce.ts**: Debounce hook
- **useLocalStorage.ts**: Local storage hook
- **useRequireAuth.ts**: Authentication guard hook
- **useListDetails.ts**: Liste detayları hook
- **useMovieDetails.ts**: Film detayları hook
- **useSearch.ts**: Arama hook
- **useLikeMutation.ts**: Beğeni mutation hook

#### `/src/lib/`
- **api.ts**: Ana API fonksiyonları
- **supabase-browser.ts**: Supabase client konfigürasyonu
- **schemas.ts**: Zod validation schemas
- **utils.ts**: Yardımcı fonksiyonlar
- **email-service.ts**: Email servisi
- **notifications.ts**: Bildirim servisi

## Veritabanı Yapısı

### Ana Tablolar

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar TEXT,
  website TEXT,
  location TEXT,
  is_private BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `lists`
```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  items_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `list_items`
```sql
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  type TEXT NOT NULL,
  year TEXT,
  description TEXT,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `follows`
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

#### `likes`
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, list_id)
);
```

#### `comments`
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_user_id UUID REFERENCES profiles(id),
  related_list_id UUID REFERENCES lists(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) Politikaları

Tüm tablolar için RLS aktif edilmiş ve uygun güvenlik politikaları tanımlanmıştır:

- **profiles**: Kullanıcılar kendi profillerini güncelleyebilir, diğerlerini sadece okuyabilir
- **lists**: Kullanıcılar kendi listelerini yönetebilir, public listeleri okuyabilir
- **follows**: Kullanıcılar kendi takip ilişkilerini yönetebilir
- **likes**: Kullanıcılar kendi beğenilerini yönetebilir
- **comments**: Kullanıcılar kendi yorumlarını yönetebilir
- **messages**: Kullanıcılar sadece kendi mesajlarını görebilir

## Sayfalar ve Bileşenler

### Ana Sayfalar

#### Search.tsx
- **Amaç**: Ana arama ve keşif sayfası
- **Özellikler**:
  - Çoklu kategori arama (film, dizi, kitap, oyun, mekan, kullanıcı, liste)
  - Kategori bazlı filtreleme
  - Infinite scroll
  - Responsive tasarım
- **API Entegrasyonları**: TMDB, Google Books, RAWG, Google Places, Supabase

#### CreateList.tsx
- **Amaç**: Yeni liste oluşturma
- **Özellikler**:
  - Kategori seçimi
  - Öğe arama ve ekleme
  - Drag & drop sıralama
  - Form validasyonu
- **Validasyon**: Zod schema ile form validasyonu

#### ListDetails.tsx
- **Amaç**: Liste detay görüntüleme
- **Özellikler**:
  - Liste öğelerini görüntüleme
  - Beğeni/beğenmeme
  - Yorum yapma
  - Paylaşım
  - Liste düzenleme (sahip ise)

#### Profile.tsx
- **Amaç**: Kullanıcı profil sayfası
- **Özellikler**:
  - Kullanıcı bilgileri
  - Oluşturulan listeler
  - Takipçi/takip edilen sayıları
  - Takip etme/etmeme

#### Messages.tsx
- **Amaç**: Mesajlaşma sistemi
- **Özellikler**:
  - Konuşma listesi
  - Gerçek zamanlı mesajlaşma
  - Mesaj durumu (okundu/okunmadı)

### Yeniden Kullanılabilir Bileşenler

#### Header.tsx
- Navigation menüsü
- Kullanıcı dropdown'u
- Bildirim ikonu
- Arama butonu

#### BottomMenu.tsx
- Mobil navigation
- Ana sayfa, arama, oluştur, mesajlar, profil

#### ListPreview.tsx
- Liste kartı bileşeni
- Thumbnail, başlık, açıklama
- Beğeni sayısı, yorum sayısı

## Servisler ve API'ler

### Ana API Fonksiyonları (`/src/lib/api.ts`)

#### Authentication
```typescript
// Kullanıcı takip etme
export async function followUser(userId: string)
export async function unfollowUser(userId: string)
export async function checkIfFollowing(userId: string)
```

#### Liste İşlemleri
```typescript
// Liste CRUD işlemleri
export async function createList(data: CreateListData)
export async function getListDetails(id: string)
export async function updateList(id: string, data: UpdateListData)
export async function deleteList(id: string)

// Liste etkileşimleri
export async function likeList(listId: string)
export async function unlikeList(listId: string)
export async function checkIfLiked(listId: string)
```

#### Arama İşlemleri
```typescript
// Çoklu platform arama
export async function searchTMDB(query: string)
export async function searchGames(query: string)
export async function searchBooks(query: string)
export async function searchPlaces(query: string, language: string)
export async function searchUsers(query: string)
export async function searchLists(query: string)
```

#### Detay Getirme
```typescript
// Detay API'leri
export async function getMovieDetails(id: string)
export async function getSeriesDetails(id: string)
export async function getGameDetails(id: string)
export async function getBookDetails(id: string)
export async function getPersonDetails(id: string)
export async function getPlaceDetails(placeId: string)
```

### Netlify Functions (`/netlify/functions/`)

#### google-places-proxy.ts
- Google Places API proxy
- API key güvenliği
- Rate limiting

#### send-notification.js
- Email bildirim gönderimi
- SendGrid entegrasyonu
- Template yönetimi

#### dynamic-sitemap.ts
- Dinamik sitemap oluşturma
- SEO optimizasyonu

### Supabase Edge Functions

#### send-support-email
- Destek email'leri
- Form işleme

#### sitemap
- Sitemap generation
- Cache yönetimi

## Dış Servis Entegrasyonları

### TMDB API
- **Amaç**: Film ve dizi verileri
- **Endpoints**:
  - `/search/multi`: Genel arama
  - `/movie/{id}`: Film detayları
  - `/tv/{id}`: Dizi detayları
  - `/person/{id}`: Kişi detayları
- **Rate Limit**: 40 requests/10 seconds

### Google Books API
- **Amaç**: Kitap verileri
- **Endpoints**:
  - `/volumes`: Kitap arama
  - `/volumes/{id}`: Kitap detayları
- **Rate Limit**: 1000 requests/day

### RAWG API
- **Amaç**: Oyun verileri
- **Endpoints**:
  - `/games`: Oyun arama
  - `/games/{id}`: Oyun detayları
- **Rate Limit**: 20000 requests/month

### Google Places API
- **Amaç**: Mekan verileri
- **Endpoints**:
  - `/places:searchText`: Mekan arama
  - `/places/{id}`: Mekan detayları
  - `/places/{id}/photos`: Mekan fotoğrafları
- **Rate Limit**: Pay-per-use

### SendGrid
- **Amaç**: Email servisi
- **Özellikler**:
  - Transactional emails
  - Template yönetimi
  - Analytics

## Deployment ve Hosting

### Netlify Konfigürasyonu

#### netlify.toml
```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

### Environment Variables
```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs
VITE_GOOGLE_PLACES_API_KEY=your_google_places_key
VITE_FOURSQUARE_API_KEY=your_foursquare_key

# Email Service
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_from_email
RESEND_API_KEY=your_resend_key

# Analytics
GOOGLE_ANALYTICS_ID=your_ga_id
CLARITY_PROJECT_ID=your_clarity_id
```

### CI/CD Pipeline
1. **Git Push**: Kod değişiklikleri GitHub'a push edilir
2. **Netlify Build**: Otomatik build tetiklenir
3. **Tests**: Unit testler çalıştırılır
4. **Build**: Vite ile production build
5. **Deploy**: Netlify'a deploy edilir
6. **Post-Deploy**: Sitemap güncellenir

## Güvenlik

### Authentication
- **Supabase Auth**: JWT tabanlı authentication
- **Row Level Security**: Veritabanı seviyesinde güvenlik
- **Protected Routes**: Client-side route protection

### API Güvenliği
- **API Key Protection**: Netlify Functions ile proxy
- **Rate Limiting**: API çağrılarında rate limiting
- **CORS**: Cross-origin request güvenliği

### Data Validation
- **Zod Schemas**: Client-side validation
- **Supabase Policies**: Server-side validation
- **Input Sanitization**: XSS koruması

### Headers
```javascript
// Security headers
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Performans Optimizasyonları

### Frontend
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP format, lazy loading
- **Bundle Optimization**: Tree shaking, minification
- **Caching**: Browser caching, service worker

### Database
- **Indexing**: Kritik sorgular için index'ler
- **Pagination**: Büyük veri setleri için sayfalama
- **Connection Pooling**: Supabase connection pooling

### API
- **Debouncing**: Arama sorgularında debounce
- **Caching**: API yanıtlarında cache
- **Batch Requests**: Çoklu API çağrılarını birleştirme

### Monitoring
- **Google Analytics**: Kullanıcı davranışı analizi
- **Microsoft Clarity**: Heatmap ve session recordings
- **Supabase Metrics**: Database performance monitoring

## Geliştirme Ortamı

### Kurulum
```bash
# Repository clone
git clone https://github.com/your-repo/connectlist.git
cd connectlist

# Dependencies install
npm install

# Environment variables
cp .env.example .env.local
# .env.local dosyasını düzenleyin

# Development server
npm run dev
```

### Scripts
```json
{
  "scripts": {
    "dev": "netlify dev",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

### Code Quality
- **ESLint**: Code linting
- **TypeScript**: Type checking
- **Prettier**: Code formatting
- **Husky**: Git hooks

## Sonuç

Connectlist, modern web teknolojileri kullanılarak geliştirilmiş, ölçeklenebilir ve güvenli bir sosyal platform uygulamasıdır. React ve TypeScript frontend'i, Supabase backend'i ve çeşitli dış API entegrasyonları ile kullanıcılara zengin bir deneyim sunmaktadır.

Proje, PWA özellikleri, çoklu dil desteği, gerçek zamanlı özellikler ve kapsamlı güvenlik önlemleri ile production-ready bir uygulamadır.