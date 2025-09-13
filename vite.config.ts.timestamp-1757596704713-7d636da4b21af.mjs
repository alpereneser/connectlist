// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/Alperen/Desktop/connectlist/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Alperen/Desktop/connectlist/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { createClient } from "file:///C:/Users/Alperen/Desktop/connectlist/node_modules/@supabase/supabase-js/dist/main/index.js";

// src/lib/utils.ts
function turkishToEnglish(text) {
  const charMap = {
    "\u0131": "i",
    "\u0130": "i",
    "\u011F": "g",
    "\u011E": "g",
    "\xFC": "u",
    "\xDC": "u",
    "\u015F": "s",
    "\u015E": "s",
    "\xF6": "o",
    "\xD6": "o",
    "\xE7": "c",
    "\xC7": "c"
  };
  return text.replace(/[ıİğĞüÜşŞöÖçÇ]/g, (letter) => charMap[letter] || letter);
}
function createSlug(text) {
  return turkishToEnglish(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// vite.config.ts
async function getDynamicRoutes(supabaseUrl, supabaseKey) {
  console.log("Fetching dynamic routes for sitemap...");
  const supabase = createClient(supabaseUrl, supabaseKey);
  const routes = [];
  const userMap = /* @__PURE__ */ new Map();
  try {
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, username").filter("username", "not.is", null);
    if (profilesError) {
      console.error("Sitemap: Error fetching profiles:", profilesError.message);
    } else if (profiles) {
      profiles.forEach((profile) => {
        if (profile.id && profile.username) {
          routes.push(`/${profile.username}`);
          userMap.set(profile.id, profile.username);
        }
      });
      console.log(`Sitemap: Fetched ${profiles.length} profiles and mapped users.`);
    }
    const { data: lists, error: listsError } = await supabase.from("lists").select("user_id, title").filter("user_id", "not.is", null).filter("title", "not.is", null);
    if (listsError) {
      console.error("Sitemap: Error fetching lists:", listsError.message);
    } else if (lists) {
      let addedListRoutes = 0;
      lists.forEach((list) => {
        const username = userMap.get(list.user_id);
        if (username && list.title) {
          const slug = createSlug(list.title);
          if (slug) {
            routes.push(`/${username}/${slug}`);
            addedListRoutes++;
          }
        }
      });
      console.log(`Sitemap: Fetched ${lists.length} lists and generated ${addedListRoutes} list routes.`);
    }
  } catch (error) {
    console.error("Sitemap: Unexpected error fetching dynamic routes:", error);
  }
  console.log(`Sitemap: Total dynamic routes fetched: ${routes.length}`);
  return routes;
}
var vite_config_default = defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  let dynamicRoutes = [];
  if (supabaseUrl && supabaseKey) {
    try {
      dynamicRoutes = await getDynamicRoutes(supabaseUrl, supabaseKey);
    } catch (error) {
      console.error("Vite Config: Failed to fetch dynamic routes for sitemap:", error);
    }
  } else {
    console.warn("Vite Config: Supabase URL or Anon Key not found in .env. Skipping dynamic route generation for sitemap.");
  }
  return {
    plugins: [
      react()
      // VitePWA plugin'i devre dışı - manual setup kullanıyoruz
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
      */
      // YORUM SATIRINA ALINDI SONU
    ],
    server: {
      host: true,
      cors: true,
      port: 3e3
    },
    resolve: {
      alias: {
        "@": "/src"
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL2xpYi91dGlscy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFscGVyZW5cXFxcRGVza3RvcFxcXFxjb25uZWN0bGlzdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWxwZXJlblxcXFxEZXNrdG9wXFxcXGNvbm5lY3RsaXN0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BbHBlcmVuL0Rlc2t0b3AvY29ubmVjdGxpc3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuLy8gaW1wb3J0IHNpdGVtYXAgZnJvbSAndml0ZS1wbHVnaW4tc2l0ZW1hcCc7IC8vIFlPUlVNIFNBVElSSU5BIEFMSU5ESVxyXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xyXG5pbXBvcnQgeyBjcmVhdGVTbHVnIH0gZnJvbSAnLi9zcmMvbGliL3V0aWxzJztcclxuXHJcbi8vIFN1cGFiYXNlJ2RlbiBkaW5hbWlrIHlvbGxhclx1MDEzMSBcdTAwRTdla21layBpXHUwMEU3aW4geWFyZFx1MDEzMW1jXHUwMTMxIGZvbmtzaXlvblxyXG5hc3luYyBmdW5jdGlvbiBnZXREeW5hbWljUm91dGVzKHN1cGFiYXNlVXJsOiBzdHJpbmcsIHN1cGFiYXNlS2V5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgY29uc29sZS5sb2coJ0ZldGNoaW5nIGR5bmFtaWMgcm91dGVzIGZvciBzaXRlbWFwLi4uJyk7XHJcbiAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoc3VwYWJhc2VVcmwsIHN1cGFiYXNlS2V5KTtcclxuICBjb25zdCByb3V0ZXM6IHN0cmluZ1tdID0gW107XHJcbiAgY29uc3QgdXNlck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7IC8vIEhhcml0YTogdXNlcl9pZCAtPiB1c2VybmFtZVxyXG5cclxuICB0cnkge1xyXG4gICAgLy8gMS4gQWRcdTAxMzFtOiBQcm9maWxsZXJpIFx1MDBFN2VrIHZlIGhhcml0YXlhIGVrbGUgKC91c2VybmFtZSlcclxuICAgIGNvbnN0IHsgZGF0YTogcHJvZmlsZXMsIGVycm9yOiBwcm9maWxlc0Vycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAuZnJvbSgncHJvZmlsZXMnKVxyXG4gICAgICAuc2VsZWN0KCdpZCwgdXNlcm5hbWUnKSAvLyBpZCB2ZSB1c2VybmFtZSdpIHNlXHUwMEU3XHJcbiAgICAgIC5maWx0ZXIoJ3VzZXJuYW1lJywgJ25vdC5pcycsIG51bGwpO1xyXG5cclxuICAgIGlmIChwcm9maWxlc0Vycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpdGVtYXA6IEVycm9yIGZldGNoaW5nIHByb2ZpbGVzOicsIHByb2ZpbGVzRXJyb3IubWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKHByb2ZpbGVzKSB7XHJcbiAgICAgIHByb2ZpbGVzLmZvckVhY2gocHJvZmlsZSA9PiB7XHJcbiAgICAgICAgaWYgKHByb2ZpbGUuaWQgJiYgcHJvZmlsZS51c2VybmFtZSkge1xyXG4gICAgICAgICAgcm91dGVzLnB1c2goYC8ke3Byb2ZpbGUudXNlcm5hbWV9YCk7IC8vIFByb2ZpbCBVUkwnc2luaSBla2xlXHJcbiAgICAgICAgICB1c2VyTWFwLnNldChwcm9maWxlLmlkLCBwcm9maWxlLnVzZXJuYW1lKTsgLy8gSGFyaXRheWEgZWtsZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTaXRlbWFwOiBGZXRjaGVkICR7cHJvZmlsZXMubGVuZ3RofSBwcm9maWxlcyBhbmQgbWFwcGVkIHVzZXJzLmApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIDIuIEFkXHUwMTMxbTogTGlzdGVsZXJpIFx1MDBFN2VrICgvOnVzZXJuYW1lLzpzbHVnKVxyXG4gICAgLy8gJ2xpc3RzJyB0YWJsb3N1bmRhICd1c2VyX2lkJyB2ZSAndGl0bGUnIG9sZHVcdTAxMUZ1IHZhcnNheVx1MDEzMWxcdTAxMzF5b3JcclxuICAgIGNvbnN0IHsgZGF0YTogbGlzdHMsIGVycm9yOiBsaXN0c0Vycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAuZnJvbSgnbGlzdHMnKVxyXG4gICAgICAuc2VsZWN0KCd1c2VyX2lkLCB0aXRsZScpIC8vIHVzZXJfaWQgdmUgdGl0bGUnXHUwMTMxIHNlXHUwMEU3XHJcbiAgICAgIC5maWx0ZXIoJ3VzZXJfaWQnLCAnbm90LmlzJywgbnVsbClcclxuICAgICAgLmZpbHRlcigndGl0bGUnLCAnbm90LmlzJywgbnVsbCk7IC8vIHRpdGxlJ1x1MDEzMW4gYm9cdTAxNUYgb2xtYWRcdTAxMzFcdTAxMUZcdTAxMzFuXHUwMTMxIGtvbnRyb2wgZXRcclxuXHJcbiAgICBpZiAobGlzdHNFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdTaXRlbWFwOiBFcnJvciBmZXRjaGluZyBsaXN0czonLCBsaXN0c0Vycm9yLm1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIGlmIChsaXN0cykge1xyXG4gICAgICBsZXQgYWRkZWRMaXN0Um91dGVzID0gMDtcclxuICAgICAgbGlzdHMuZm9yRWFjaChsaXN0ID0+IHtcclxuICAgICAgICAvLyB1c2VyX2lkIGt1bGxhbmFyYWsgaGFyaXRhZGFuIHVzZXJuYW1lJ2kgYnVsXHJcbiAgICAgICAgY29uc3QgdXNlcm5hbWUgPSB1c2VyTWFwLmdldChsaXN0LnVzZXJfaWQpO1xyXG4gICAgICAgIGlmICh1c2VybmFtZSAmJiBsaXN0LnRpdGxlKSB7XHJcbiAgICAgICAgICBjb25zdCBzbHVnID0gY3JlYXRlU2x1ZyhsaXN0LnRpdGxlKTsgLy8gQmFcdTAxNUZsXHUwMTMxa3RhbiBzbHVnIG9sdVx1MDE1RnR1clxyXG4gICAgICAgICAgaWYgKHNsdWcpIHsgLy8gQm9cdTAxNUYgc2x1ZyBvbHVcdTAxNUZtYWRcdTAxMzFcdTAxMUZcdTAxMzFuZGFuIGVtaW4gb2xcclxuICAgICAgICAgICAgIHJvdXRlcy5wdXNoKGAvJHt1c2VybmFtZX0vJHtzbHVnfWApOyAvLyBMaXN0ZSBVUkwnc2luaSBvbHVcdTAxNUZ0dXIgdmUgZWtsZVxyXG4gICAgICAgICAgICAgYWRkZWRMaXN0Um91dGVzKys7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgY29uc29sZS5sb2coYFNpdGVtYXA6IEZldGNoZWQgJHtsaXN0cy5sZW5ndGh9IGxpc3RzIGFuZCBnZW5lcmF0ZWQgJHthZGRlZExpc3RSb3V0ZXN9IGxpc3Qgcm91dGVzLmApO1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignU2l0ZW1hcDogVW5leHBlY3RlZCBlcnJvciBmZXRjaGluZyBkeW5hbWljIHJvdXRlczonLCBlcnJvcik7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZyhgU2l0ZW1hcDogVG90YWwgZHluYW1pYyByb3V0ZXMgZmV0Y2hlZDogJHtyb3V0ZXMubGVuZ3RofWApO1xyXG4gIHJldHVybiByb3V0ZXM7XHJcbn1cclxuXHJcbi8vIGRlZmluZUNvbmZpZydpIGFzeW5jIHlhcGFyYWsgYXdhaXQga3VsbGFuYWJpbG1lc2luaSBzYVx1MDExRmxcdTAxMzF5b3J1elxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoYXN5bmMgKHsgbW9kZSB9KSA9PiB7XHJcbiAgLy8gT3J0YW0gZGVcdTAxMUZpXHUwMTVGa2VubGVyaW5pIHlcdTAwRkNrbGVcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCBzdXBhYmFzZVVybCA9IGVudi5WSVRFX1NVUEFCQVNFX1VSTDtcclxuICBjb25zdCBzdXBhYmFzZUtleSA9IGVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZO1xyXG5cclxuICBsZXQgZHluYW1pY1JvdXRlczogc3RyaW5nW10gPSBbXTtcclxuICAvLyBTYWRlY2UgU3VwYWJhc2UgYmlsZ2lsZXJpIHZhcnNhIGRpbmFtaWsgeW9sbGFyXHUwMTMxIFx1MDBFN2VrbWV5ZSBcdTAwRTdhbFx1MDEzMVx1MDE1RlxyXG4gIGlmIChzdXBhYmFzZVVybCAmJiBzdXBhYmFzZUtleSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgZHluYW1pY1JvdXRlcyA9IGF3YWl0IGdldER5bmFtaWNSb3V0ZXMoc3VwYWJhc2VVcmwsIHN1cGFiYXNlS2V5KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJWaXRlIENvbmZpZzogRmFpbGVkIHRvIGZldGNoIGR5bmFtaWMgcm91dGVzIGZvciBzaXRlbWFwOlwiLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgICBjb25zb2xlLndhcm4oJ1ZpdGUgQ29uZmlnOiBTdXBhYmFzZSBVUkwgb3IgQW5vbiBLZXkgbm90IGZvdW5kIGluIC5lbnYuIFNraXBwaW5nIGR5bmFtaWMgcm91dGUgZ2VuZXJhdGlvbiBmb3Igc2l0ZW1hcC4nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIC8vIFZpdGVQV0EgcGx1Z2luJ2kgZGV2cmUgZFx1MDEzMVx1MDE1Rlx1MDEzMSAtIG1hbnVhbCBzZXR1cCBrdWxsYW5cdTAxMzF5b3J1elxyXG4gICAgICAvKiAvLyBZT1JVTSBTQVRJUklOQSBBTElOREkgQkFcdTAxNUVMQU5HSUNJXHJcbiAgICAgIHNpdGVtYXAoe1xyXG4gICAgICAgIGhvc3RuYW1lOiAnaHR0cHM6Ly9jb25uZWN0bGlzdC5tZScsXHJcbiAgICAgICAgZHluYW1pY1JvdXRlczogZHluYW1pY1JvdXRlcyxcclxuICAgICAgICBleGNsdWRlOiBbJy9zZWFyY2gnLCAnL3NlYXJjaC8qJywgJy9hdXRoLyonLCAnL2FkbWluLyonXSwgLy8gU2l0ZSBoYXJpdGFzXHUwMTMxbmRhbiBcdTAwRTdcdTAxMzFrYXJcdTAxMzFsYWNhayB5b2xsYXJcclxuICAgICAgICByb2JvdHM6IFsgLy8gcm9ib3RzLnR4dCBpXHUwMEU3ZXJpXHUwMTFGaW5pIG90b21hdGlrIG9sdVx1MDE1RnR1clxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1c2VyQWdlbnQ6ICcqJyxcclxuICAgICAgICAgICAgYWxsb3c6ICcvJyxcclxuICAgICAgICAgICAgZGlzYWxsb3c6IFsnL2FkbWluLycsICcvYXV0aC8nLCAnL3NlYXJjaC8nXSwgLy8gRW5nZWxsZW5lY2VrIHlvbGxhclxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KSxcclxuICAgICAgKi8gLy8gWU9SVU0gU0FUSVJJTkEgQUxJTkRJIFNPTlVcclxuICAgIF0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgICAgY29yczogdHJ1ZSxcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiAnL3NyYycsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pOyIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWxwZXJlblxcXFxEZXNrdG9wXFxcXGNvbm5lY3RsaXN0XFxcXHNyY1xcXFxsaWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFscGVyZW5cXFxcRGVza3RvcFxcXFxjb25uZWN0bGlzdFxcXFxzcmNcXFxcbGliXFxcXHV0aWxzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BbHBlcmVuL0Rlc2t0b3AvY29ubmVjdGxpc3Qvc3JjL2xpYi91dGlscy50c1wiOy8vIFRcdTAwRkNya1x1MDBFN2Uga2FyYWt0ZXJsZXJpIFx1MDEzMG5naWxpemNlIGthcmFrdGVybGVyZSBkXHUwMEY2blx1MDBGQ1x1MDE1RnRcdTAwRkNybWVcclxuZXhwb3J0IGZ1bmN0aW9uIHR1cmtpc2hUb0VuZ2xpc2godGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBjaGFyTWFwOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge1xyXG4gICAgJ1x1MDEzMSc6ICdpJywgJ1x1MDEzMCc6ICdpJyxcclxuICAgICdcdTAxMUYnOiAnZycsICdcdTAxMUUnOiAnZycsXHJcbiAgICAnXHUwMEZDJzogJ3UnLCAnXHUwMERDJzogJ3UnLFxyXG4gICAgJ1x1MDE1Ric6ICdzJywgJ1x1MDE1RSc6ICdzJyxcclxuICAgICdcdTAwRjYnOiAnbycsICdcdTAwRDYnOiAnbycsXHJcbiAgICAnXHUwMEU3JzogJ2MnLCAnXHUwMEM3JzogJ2MnLFxyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1tcdTAxMzFcdTAxMzBcdTAxMUZcdTAxMUVcdTAwRkNcdTAwRENcdTAxNUZcdTAxNUVcdTAwRjZcdTAwRDZcdTAwRTdcdTAwQzddL2csIGxldHRlciA9PiBjaGFyTWFwW2xldHRlcl0gfHwgbGV0dGVyKTtcclxufVxyXG5cclxuLy8gVVJMJ3llIHV5Z3VuIHNsdWcgb2x1XHUwMTVGdHVybWFcclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsdWcodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gdHVya2lzaFRvRW5nbGlzaCh0ZXh0KVxyXG4gICAgLnRvTG93ZXJDYXNlKClcclxuICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICcgJykgXHJcbiAgICAudHJpbSgpXHJcbiAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXHJcbiAgICAucmVwbGFjZSgvXi0rfC0rJC9nLCAnJyk7XHJcbn1cclxuXHJcbi8vIFN1cGFiYXNlIGdcdTAwRjZyc2VsIFVSTCdsZXJpbmUgXHUwMEY2bmJlbGxlayBwYXJhbWV0cmVzaSBla2xlXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRDYWNoZUJ1c3RpbmdQYXJhbSh1cmw6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKCF1cmwpIHJldHVybiB1cmw7XHJcbiAgXHJcbiAgLy8gRVx1MDExRmVyIFVSTCB6YXRlbiBiaXIgcGFyYW1ldHJlIGlcdTAwRTdlcml5b3JzYVxyXG4gIGlmICh1cmwuaW5jbHVkZXMoJz8nKSkge1xyXG4gICAgcmV0dXJuIGAke3VybH0mdD0xYDtcclxuICB9XHJcbiAgXHJcbiAgLy8gRVx1MDExRmVyIFVSTCBwYXJhbWV0cmUgaVx1MDBFN2VybWl5b3JzYVxyXG4gIHJldHVybiBgJHt1cmx9P3Q9MWA7XHJcbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdTLFNBQVMsY0FBYyxlQUFlO0FBQzlVLE9BQU8sV0FBVztBQUVsQixTQUFTLG9CQUFvQjs7O0FDRnRCLFNBQVMsaUJBQWlCLE1BQXNCO0FBQ3JELFFBQU0sVUFBcUM7QUFBQSxJQUN6QyxVQUFLO0FBQUEsSUFBSyxVQUFLO0FBQUEsSUFDZixVQUFLO0FBQUEsSUFBSyxVQUFLO0FBQUEsSUFDZixRQUFLO0FBQUEsSUFBSyxRQUFLO0FBQUEsSUFDZixVQUFLO0FBQUEsSUFBSyxVQUFLO0FBQUEsSUFDZixRQUFLO0FBQUEsSUFBSyxRQUFLO0FBQUEsSUFDZixRQUFLO0FBQUEsSUFBSyxRQUFLO0FBQUEsRUFDakI7QUFFQSxTQUFPLEtBQUssUUFBUSxtQkFBbUIsWUFBVSxRQUFRLE1BQU0sS0FBSyxNQUFNO0FBQzVFO0FBR08sU0FBUyxXQUFXLE1BQXNCO0FBQy9DLFNBQU8saUJBQWlCLElBQUksRUFDekIsWUFBWSxFQUNaLFFBQVEsZUFBZSxHQUFHLEVBQzFCLEtBQUssRUFDTCxRQUFRLGVBQWUsR0FBRyxFQUMxQixRQUFRLFlBQVksRUFBRTtBQUMzQjs7O0FEZkEsZUFBZSxpQkFBaUIsYUFBcUIsYUFBd0M7QUFDM0YsVUFBUSxJQUFJLHdDQUF3QztBQUNwRCxRQUFNLFdBQVcsYUFBYSxhQUFhLFdBQVc7QUFDdEQsUUFBTSxTQUFtQixDQUFDO0FBQzFCLFFBQU0sVUFBVSxvQkFBSSxJQUFvQjtBQUV4QyxNQUFJO0FBRUYsVUFBTSxFQUFFLE1BQU0sVUFBVSxPQUFPLGNBQWMsSUFBSSxNQUFNLFNBQ3BELEtBQUssVUFBVSxFQUNmLE9BQU8sY0FBYyxFQUNyQixPQUFPLFlBQVksVUFBVSxJQUFJO0FBRXBDLFFBQUksZUFBZTtBQUNqQixjQUFRLE1BQU0scUNBQXFDLGNBQWMsT0FBTztBQUFBLElBQzFFLFdBQVcsVUFBVTtBQUNuQixlQUFTLFFBQVEsYUFBVztBQUMxQixZQUFJLFFBQVEsTUFBTSxRQUFRLFVBQVU7QUFDbEMsaUJBQU8sS0FBSyxJQUFJLFFBQVEsUUFBUSxFQUFFO0FBQ2xDLGtCQUFRLElBQUksUUFBUSxJQUFJLFFBQVEsUUFBUTtBQUFBLFFBQzFDO0FBQUEsTUFDRixDQUFDO0FBQ0QsY0FBUSxJQUFJLG9CQUFvQixTQUFTLE1BQU0sNkJBQTZCO0FBQUEsSUFDOUU7QUFJQSxVQUFNLEVBQUUsTUFBTSxPQUFPLE9BQU8sV0FBVyxJQUFJLE1BQU0sU0FDOUMsS0FBSyxPQUFPLEVBQ1osT0FBTyxnQkFBZ0IsRUFDdkIsT0FBTyxXQUFXLFVBQVUsSUFBSSxFQUNoQyxPQUFPLFNBQVMsVUFBVSxJQUFJO0FBRWpDLFFBQUksWUFBWTtBQUNkLGNBQVEsTUFBTSxrQ0FBa0MsV0FBVyxPQUFPO0FBQUEsSUFDcEUsV0FBVyxPQUFPO0FBQ2hCLFVBQUksa0JBQWtCO0FBQ3RCLFlBQU0sUUFBUSxVQUFRO0FBRXBCLGNBQU0sV0FBVyxRQUFRLElBQUksS0FBSyxPQUFPO0FBQ3pDLFlBQUksWUFBWSxLQUFLLE9BQU87QUFDMUIsZ0JBQU0sT0FBTyxXQUFXLEtBQUssS0FBSztBQUNsQyxjQUFJLE1BQU07QUFDUCxtQkFBTyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtBQUNsQztBQUFBLFVBQ0g7QUFBQSxRQUNGO0FBQUEsTUFDRixDQUFDO0FBQ0QsY0FBUSxJQUFJLG9CQUFvQixNQUFNLE1BQU0sd0JBQXdCLGVBQWUsZUFBZTtBQUFBLElBQ3BHO0FBQUEsRUFFRixTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sc0RBQXNELEtBQUs7QUFBQSxFQUMzRTtBQUVBLFVBQVEsSUFBSSwwQ0FBMEMsT0FBTyxNQUFNLEVBQUU7QUFDckUsU0FBTztBQUNUO0FBR0EsSUFBTyxzQkFBUSxhQUFhLE9BQU8sRUFBRSxLQUFLLE1BQU07QUFFOUMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sY0FBYyxJQUFJO0FBQ3hCLFFBQU0sY0FBYyxJQUFJO0FBRXhCLE1BQUksZ0JBQTBCLENBQUM7QUFFL0IsTUFBSSxlQUFlLGFBQWE7QUFDOUIsUUFBSTtBQUNGLHNCQUFnQixNQUFNLGlCQUFpQixhQUFhLFdBQVc7QUFBQSxJQUNqRSxTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0sNERBQTRELEtBQUs7QUFBQSxJQUNqRjtBQUFBLEVBQ0YsT0FBTztBQUNKLFlBQVEsS0FBSyx5R0FBeUc7QUFBQSxFQUN6SDtBQUVBLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBZ0JSO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSztBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
