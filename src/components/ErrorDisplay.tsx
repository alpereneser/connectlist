import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message = 'Bir hata oluştu', onRetry }: ErrorDisplayProps) {
  return (
    <div className="min-h-[calc(100vh-95px)] flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-gray-600">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}