import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// import sitemap from 'vite-plugin-sitemap'; // YORUM SATIRINA ALINDI
import { createClient } from '@supabase/supabase-js';
import { createSlug } from './src/lib/utils';

// Supabase'den dinamik yolları çekmek için yardımcı fonksiyon
async function getDynamicRoutes(supabaseUrl: string, supabaseKey: string): Promise<string[]> {
  console.log('Fetching dynamic routes for sitemap...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  const routes: string[] = [];
  const userMap = new Map<string, string>(); // Harita: user_id -> username

  try {
    // 1. Adım: Profilleri çek ve haritaya ekle (/username)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username') // id ve username'i seç
      .filter('username', 'not.is', null);

    if (profilesError) {
      console.error('Sitemap: Error fetching profiles:', profilesError.message);
    } else if (profiles) {
      profiles.forEach(profile => {
        if (profile.id && profile.username) {
          routes.push(`/${profile.username}`); // Profil URL'sini ekle
          userMap.set(profile.id, profile.username); // Haritaya ekle
        }
      });
      console.log(`Sitemap: Fetched ${profiles.length} profiles and mapped users.`);
    }

    // 2. Adım: Listeleri çek (/:username/:slug)
    // 'lists' tablosunda 'user_id' ve 'title' olduğu varsayılıyor
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select('user_id, title') // user_id ve title'ı seç
      .filter('user_id', 'not.is', null)
      .filter('title', 'not.is', null); // title'ın boş olmadığını kontrol et

    if (listsError) {
      console.error('Sitemap: Error fetching lists:', listsError.message);
    } else if (lists) {
      let addedListRoutes = 0;
      lists.forEach(list => {
        // user_id kullanarak haritadan username'i bul
        const username = userMap.get(list.user_id);
        if (username && list.title) {
          const slug = createSlug(list.title); // Başlıktan slug oluştur
          if (slug) { // Boş slug oluşmadığından emin ol
             routes.push(`/${username}/${slug}`); // Liste URL'sini oluştur ve ekle
             addedListRoutes++;
          }
        }
      });
      console.log(`Sitemap: Fetched ${lists.length} lists and generated ${addedListRoutes} list routes.`);
    }

  } catch (error) {
    console.error('Sitemap: Unexpected error fetching dynamic routes:', error);
  }

  console.log(`Sitemap: Total dynamic routes fetched: ${routes.length}`);
  return routes;
}

// defineConfig'i async yaparak await kullanabilmesini sağlıyoruz
export default defineConfig(async ({ mode }) => {
  // Ortam değişkenlerini yükle
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

  let dynamicRoutes: string[] = [];
  // Sadece Supabase bilgileri varsa dinamik yolları çekmeye çalış
  if (supabaseUrl && supabaseKey) {
    try {
      dynamicRoutes = await getDynamicRoutes(supabaseUrl, supabaseKey);
    } catch (error) {
      console.error("Vite Config: Failed to fetch dynamic routes for sitemap:", error);
    }
  } else {
     console.warn('Vite Config: Supabase URL or Anon Key not found in .env. Skipping dynamic route generation for sitemap.');
  }

  return {
    plugins: [
      react(),
      /* // YORUM SATIRINA ALINDI BAŞLANGICI
      sitemap({
        hostname: 'https://connectlist.me',
        dynamicRoutes: dynamicRoutes,
        exclude: ['/search', '/search/*', '/auth/*', '/admin/*'], // Site haritasından çıkarılacak yollar
        robots: [ // robots.txt içeriğini otomatik oluştur
          {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/auth/', '/search/'], // Engellenecek yollar
          },
        ],
      }),
      */ // YORUM SATIRINA ALINDI SONU
    ],
    server: {
      host: true,
      cors: true,
      port: 3000,
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});