import { X } from 'lucide-react';
import { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/search';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: User[];
}

export function FollowModal({ isOpen, onClose, title, users }: FollowModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={modalRef} className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-4">
          {users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    navigate(`/profile/${user.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-medium">{user.full_name}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Henüz kimse yok</p>
          )}
        </div>
      </div>
    </div>
  );
}