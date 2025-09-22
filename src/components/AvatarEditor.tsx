import { useState, useRef } from 'react';
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
  const editorRef = useRef<AvatarEditor>(null);
  const { t } = useTranslation();

  const handleSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          onSave(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <AvatarEditor
          ref={editorRef}
          image={image}
          width={280}
          height={280}
          border={40}
          borderRadius={140}
          color={[0, 0, 0, 0.6]}
          scale={scale}
          rotate={rotate}
          className="rounded-lg shadow-lg"
        />
      </div>

      <div className="w-full space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('avatar.zoom', 'Yakınlaştır')}</span>
            <div className="flex items-center gap-2">
              <ZoomOut size={16} className="text-gray-500" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn size={16} className="text-gray-500" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('avatar.rotate', 'Döndür')}</span>
            <div className="flex items-center gap-2">
              <Slider size={16} className="text-gray-500" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotate}
                onChange={(e) => setRotate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <Slider size={16} className="text-gray-500 transform rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <X size={16} className="inline mr-1" />
            {t('common.cancel', 'İptal')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
            aria-label="Onayla"
          >
            <Check size={16} className="inline mr-1" />
            {t('avatar.confirm', 'Onayla')}
          </button>
        </div>
      </div>
    </div>
  );
}