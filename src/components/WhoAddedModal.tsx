import { useNavigate } from 'react-router-dom';
import { Film, Tv, BookOpen, Gamepad2, Users2, MapPin, X, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ListUser {
  username: string;
  full_name: string;
  avatar: string;
  list_title: string;
  list_id: string;
}

interface WhoAddedModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: ListUser[];
  contentType: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place' | 'music';
}

export function WhoAddedModal({ isOpen, onClose, users, contentType }: WhoAddedModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (contentType) {
      case 'movie':
        return Film;
      case 'series':
        return Tv;
      case 'book':
        return BookOpen;
      case 'game':
        return Gamepad2;
      case 'person':
        return Users2;
      case 'place':
        return MapPin;
      case 'music':
        return Music;
      default:
        return Film;
    }
  };

  // Icon değişkenini JSX içinde kullanıyoruz
  const Icon = getIcon();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <h2 className="text-lg font-semibold">{t('listPreview.whoAdded')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4">
          {users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4"
                >
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    onClick={() => {
                      navigate(`/profile/${user.username}`);
                      onClose();
                    }}
                  />
                  <div className="flex-1">
                    <h3
                      className="font-medium cursor-pointer hover:text-orange-500"
                      onClick={() => {
                        navigate(`/profile/${user.username}`);
                        onClose();
                      }}
                    >
                      {user.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/${user.username}/list/${encodeURIComponent(user.list_title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`, { state: { listId: user.list_id } });
                      onClose();
                    }}
                    className="text-orange-500 hover:text-orange-600 text-sm font-medium"
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
  );
}