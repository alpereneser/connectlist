import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  title?: string;
  description?: string;
  showRetryButton?: boolean;
}

export function ErrorState({
  error,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  title,
  description,
  showRetryButton = true
}: ErrorStateProps) {
  const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
  const isOffline = !navigator.onLine;

  const getErrorTitle = () => {
    if (title) return title;
    if (isOffline) return 'İnternet Bağlantısı Yok';
    if (isNetworkError) return 'Bağlantı Hatası';
    return 'Bir Hata Oluştu';
  };

  const getErrorDescription = () => {
    if (description) return description;
    if (isOffline) return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    if (isNetworkError) return 'Sunucuya bağlanırken bir hata oluştu. Lütfen tekrar deneyin.';
    return 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya tekrar deneyin.';
  };

  const getIcon = () => {
    if (isOffline) return <WifiOff size={32} className="text-red-600" />;
    if (isNetworkError) return <Wifi size={32} className="text-orange-600" />;
    return <AlertTriangle size={32} className="text-red-600" />;
  };

  const getIconBgColor = () => {
    if (isOffline) return 'bg-red-100';
    if (isNetworkError) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className={`w-16 h-16 ${getIconBgColor()} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {getIcon()}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {getErrorTitle()}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getErrorDescription()}
        </p>

        {retryCount > 0 && retryCount < maxRetries && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Deneme {retryCount}/{maxRetries} başarısız oldu. Tekrar deneniyor...
            </p>
          </div>
        )}

        {retryCount >= maxRetries && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Maksimum deneme sayısına ulaşıldı. Lütfen daha sonra tekrar deneyin.
            </p>
          </div>
        )}

        {showRetryButton && onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying || retryCount >= maxRetries}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 w-full"
          >
            <RefreshCw size={20} className={isRetrying ? 'animate-spin' : ''} />
            {isRetrying ? 'Tekrar Deneniyor...' : 'Tekrar Dene'}
          </button>
        )}

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Hata Detayları (Geliştirici Modu)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ErrorState;