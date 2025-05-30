import { useRef } from 'react';
import { X } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '../hooks/useClickOutside';

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function AuthPopup({ isOpen, onClose, message }: AuthPopupProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(popupRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={popupRef} className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('auth.login')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600"
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200"
            >
              {t('auth.register')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}