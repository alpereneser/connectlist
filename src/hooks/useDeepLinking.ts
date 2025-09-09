import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface DeepLinkConfig {
  scheme?: string; // App scheme (e.g., 'connectlist://')
  fallbackUrl?: string; // Fallback URL for web
  universalLinkDomain?: string; // Domain for universal links
}

export interface DeepLinkParams {
  [key: string]: string | number | boolean;
}

export const useDeepLinking = (config: DeepLinkConfig = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    scheme = 'connectlist',
    fallbackUrl = 'https://connectlist.me',
    universalLinkDomain = 'connectlist.me'
  } = config;

  // Deep link oluşturma fonksiyonu
  const createDeepLink = useCallback((
    path: string,
    params?: DeepLinkParams
  ): string => {
    const baseUrl = `${scheme}://${path}`;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      return `${baseUrl}?${searchParams.toString()}`;
    }
    
    return baseUrl;
  }, [scheme]);

  // Universal link oluşturma fonksiyonu
  const createUniversalLink = useCallback((
    path: string,
    params?: DeepLinkParams
  ): string => {
    const baseUrl = `https://${universalLinkDomain}${path}`;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      return `${baseUrl}?${searchParams.toString()}`;
    }
    
    return baseUrl;
  }, [universalLinkDomain]);

  // Paylaşım için link oluşturma
  const createShareableLink = useCallback((
    path: string,
    params?: DeepLinkParams,
    options?: {
      preferUniversal?: boolean;
      includeAppFallback?: boolean;
    }
  ): string => {
    const { preferUniversal = true, includeAppFallback = true } = options || {};
    
    if (preferUniversal) {
      const universalLink = createUniversalLink(path, params);
      
      if (includeAppFallback) {
        const deepLink = createDeepLink(path, params);
        // Universal link with app fallback
        return `${universalLink}?app_link=${encodeURIComponent(deepLink)}`;
      }
      
      return universalLink;
    }
    
    return createDeepLink(path, params);
  }, [createDeepLink, createUniversalLink]);

  // Deep link'i açma fonksiyonu
  const openDeepLink = useCallback((link: string) => {
    if (typeof window !== 'undefined') {
      // Mobile cihazlarda app'i açmaya çalış
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS || isAndroid) {
        // App'i açmaya çalış
        window.location.href = link;
        
        // Eğer app açılmazsa fallback URL'e yönlendir
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = fallbackUrl;
          }
        }, 2000);
      } else {
        // Desktop'ta yeni tab'da aç
        window.open(link, '_blank');
      }
    }
  }, [fallbackUrl]);

  // URL'den deep link parametrelerini parse etme
  const parseDeepLinkParams = useCallback((url: string): DeepLinkParams => {
    try {
      const urlObj = new URL(url);
      const params: DeepLinkParams = {};
      
      urlObj.searchParams.forEach((value, key) => {
        // Boolean değerleri parse et
        if (value === 'true' || value === 'false') {
          params[key] = value === 'true';
        }
        // Number değerleri parse et
        else if (!isNaN(Number(value)) && value !== '') {
          params[key] = Number(value);
        }
        // String olarak sakla
        else {
          params[key] = value;
        }
      });
      
      return params;
    } catch (error) {
      console.warn('Deep link parsing error:', error);
      return {};
    }
  }, []);

  // Mevcut sayfa için deep link oluşturma
  const getCurrentPageDeepLink = useCallback((params?: DeepLinkParams): string => {
    const currentParams = parseDeepLinkParams(window.location.href);
    const mergedParams = { ...currentParams, ...params };
    return createShareableLink(location.pathname, mergedParams);
  }, [location.pathname, parseDeepLinkParams, createShareableLink]);

  // Deep link event listener
  useEffect(() => {
    const handleDeepLink = (event: CustomEvent) => {
      const { path, params } = event.detail;
      
      if (path) {
        // Parametreleri URL'e ekle
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, String(value));
          });
        }
        
        const fullPath = searchParams.toString() 
          ? `${path}?${searchParams.toString()}`
          : path;
          
        navigate(fullPath);
      }
    };

    window.addEventListener('deeplink' as any, handleDeepLink);
    
    return () => {
      window.removeEventListener('deeplink' as any, handleDeepLink);
    };
  }, [navigate]);

  // URL değişikliklerini dinleme
  useEffect(() => {
    // URL'den app_link parametresini kontrol et
    const urlParams = new URLSearchParams(location.search);
    const appLink = urlParams.get('app_link');
    
    if (appLink) {
      // App link varsa, onu açmaya çalış
      openDeepLink(decodeURIComponent(appLink));
    }
  }, [location.search, openDeepLink]);

  return {
    createDeepLink,
    createUniversalLink,
    createShareableLink,
    openDeepLink,
    parseDeepLinkParams,
    getCurrentPageDeepLink
  };
};

// Özel deep link türleri için yardımcı fonksiyonlar
export const useProfileDeepLink = () => {
  const { createShareableLink } = useDeepLinking();
  
  return useCallback((username: string, params?: DeepLinkParams) => {
    return createShareableLink(`/profile/${username}`, params);
  }, [createShareableLink]);
};

export const useListDeepLink = () => {
  const { createShareableLink } = useDeepLinking();
  
  return useCallback((listId: string, params?: DeepLinkParams) => {
    return createShareableLink(`/list/${listId}`, params);
  }, [createShareableLink]);
};

export const useContentDeepLink = () => {
  const { createShareableLink } = useDeepLinking();
  
  return useCallback((type: string, id: string, params?: DeepLinkParams) => {
    return createShareableLink(`/${type}/${id}`, params);
  }, [createShareableLink]);
};

// Share API entegrasyonu
export const useNativeShare = () => {
  const shareContent = useCallback(async (data: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.warn('Native share failed:', error);
        return false;
      }
    }
    
    // Fallback: clipboard API
    if (data.url && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(data.url);
        return true;
      } catch (error) {
        console.warn('Clipboard write failed:', error);
        return false;
      }
    }
    
    return false;
  }, []);

  return { shareContent };
};

export default useDeepLinking;