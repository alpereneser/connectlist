import { useState, useRef, useEffect } from 'react';
// Removed unused: useTranslation
import AvatarEditor from 'react-avatar-editor';
import { Sliders as Slider, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AvatarEditorProps {
  image: File | string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export function AvatarCropper({ image, onSave, onCancel }: AvatarEditorProps) {
  const [scale, setScale] = useState(1.2);
  const [rotate, setRotate] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 280, height: 280 });
  const editorRef = useRef<AvatarEditor>(null);
  const { t } = useTranslation();

  // Responsive canvas boyutları
  useEffect(() => {
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth < 768;
      const maxWidth = isMobile ? Math.min(window.innerWidth - 80, 240) : 280;
      setCanvasSize({ width: maxWidth, height: maxWidth });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const handleSave = () => {
    if (editorRef.current) {
      try {
        const canvas = editorRef.current.getImageScaledToCanvas();
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            onSave(blob);
          }
        }, 'image/jpeg', 0.9);
      } catch (error) {
        console.error('Avatar kaydetme hatası:', error);
        // Fallback: Direkt canvas'ı kullan
        try {
          const canvas = editorRef.current.getImage();
          canvas.toBlob((blob: Blob | null) => {
            if (blob) {
              onSave(blob);
            }
          }, 'image/jpeg', 0.9);
        } catch (fallbackError) {
          console.error('Avatar kaydetme fallback hatası:', fallbackError);
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative flex justify-center w-full">
        <AvatarEditor
          ref={editorRef}
          image={image}
          width={canvasSize.width}
          height={canvasSize.height}
          border={Math.max(20, canvasSize.width * 0.07)} // Responsive border
          borderRadius={canvasSize.width / 2} // Tam yuvarlak
          color={[0, 0, 0, 0.6]}
          scale={scale}
          rotate={rotate}
          className="rounded-lg shadow-lg touch-manipulation"
          style={{
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
          crossOrigin="anonymous"
        />
      </div>

      <div className="w-full space-y-4 px-2">
        <div className="space-y-3">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-gray-700">{t('avatar.zoom', 'Yakınlaştır')}</span>
            <div className="flex items-center gap-3">
              <ZoomOut size={16} className="text-gray-500 flex-shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-manipulation"
                style={{
                  touchAction: 'manipulation',
                  WebkitAppearance: 'none',
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${((scale - 1) / 2) * 100}%, #e5e7eb ${((scale - 1) / 2) * 100}%, #e5e7eb 100%)`
                }}
              />
              <ZoomIn size={16} className="text-gray-500 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-gray-700">{t('avatar.rotate', 'Döndür')}</span>
            <div className="flex items-center gap-3">
              <Slider size={16} className="text-gray-500 flex-shrink-0" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotate}
                onChange={(e) => setRotate(parseFloat(e.target.value))}
                className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-manipulation"
                style={{
                  touchAction: 'manipulation',
                  WebkitAppearance: 'none',
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${(rotate / 360) * 100}%, #e5e7eb ${(rotate / 360) * 100}%, #e5e7eb 100%)`
                }}
              />
              <Slider size={16} className="text-gray-500 transform rotate-90 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 max-w-[120px] px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <X size={16} className="inline mr-1" />
            {t('common.cancel', 'İptal')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 max-w-[120px] px-4 py-3 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors touch-manipulation"
            aria-label="Onayla"
            style={{ touchAction: 'manipulation' }}
          >
            <Check size={16} className="inline mr-1" />
            {t('avatar.confirm', 'Onayla')}
          </button>
        </div>
      </div>
    </div>
  );
}