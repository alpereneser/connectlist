import React, { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

// Define a type for the profile data you expect
interface ManagedProfile {
  id: string;
  username: string | null; // Allow null based on schema
  full_name: string | null; // Allow null based on schema
  avatar: string | null; // Keep as string for URL
  email?: string; // Optional: Might get this from auth users later
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ManagedProfile | null>(null);
  const [editFormData, setEditFormData] = useState<{ username: string; full_name: string }>({ username: '', full_name: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // SECURITY WARNING: Fetching all profiles directly from client-side
        // can expose user data. Replace with a secure Edge Function call 
        // that performs authorization checks for production environments.
        console.warn("Fetching all profiles directly from client. Consider using a secure Edge Function.");
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar');

        if (profilesError) {
          throw profilesError;
        }

        // Note: Email is not in 'profiles' table by default.
        // Fetching corresponding auth users might be needed for email or other auth data.
        setUsers(profilesData as ManagedProfile[] || []);

      } catch (err: any) {
        console.error('Error fetching users:', err);
        setError('Kullanıcılar yüklenirken bir hata oluştu: ' + err.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      user.id.toLowerCase().includes(lowerSearchTerm) ||
      (user.username && user.username.toLowerCase().includes(lowerSearchTerm)) ||
      (user.full_name && user.full_name.toLowerCase().includes(lowerSearchTerm))
    );
  }, [users, searchTerm]);

  const openEditModal = (user: ManagedProfile) => {
    setEditingUser(user);
    setEditFormData({ 
        username: user.username || '', 
        full_name: user.full_name || '' 
    });
    setAvatarPreview(user.avatar);
    setAvatarFile(null); // Reset file input on open
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      }
      reader.readAsDataURL(file);
    } else {
        setAvatarFile(null);
        setAvatarPreview(editingUser?.avatar || null); // Revert to original if file removed
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError(null);

    let newAvatarUrl = editingUser.avatar; // Start with the current avatar URL

    try {
        // 1. Upload new avatar if selected
        if (avatarFile) {
            console.log('Uploading new avatar...');
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${editingUser.id}/${Date.now()}.${fileExt}`;

            // Check if old avatar exists and delete it (optional but recommended)
            if (editingUser.avatar) {
                try {
                    const oldAvatarPath = new URL(editingUser.avatar).pathname.split('/avatars/')[1];
                    if (oldAvatarPath) {
                         console.log(`Deleting old avatar: ${oldAvatarPath}`);
                         await supabase.storage.from('avatars').remove([oldAvatarPath]);
                    }
                } catch (removeError) {
                     console.error('Could not parse or delete old avatar:', removeError);
                     // Decide if you want to proceed or stop if old avatar deletion fails
                }
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars') // Ensure 'avatars' bucket exists and has RLS policies
                .upload(filePath, avatarFile, {
                     cacheControl: '3600',
                     upsert: false // Don't upsert, we are creating a unique path
                });

            if (uploadError) {
                throw new Error(`Avatar yüklenemedi: ${uploadError.message}`);
            }

            // Get public URL of the newly uploaded file
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
                 throw new Error('Avatar URL alınamadı.');
            }
            newAvatarUrl = urlData.publicUrl;
             console.log('New avatar URL:', newAvatarUrl);
        }

        // 2. Update profile data in Supabase
         console.log('Updating profile data...');
        const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({
                username: editFormData.username,
                full_name: editFormData.full_name,
                avatar: newAvatarUrl, // Use the new URL (or original if no upload)
                updated_at: new Date(), // Optional: track updates
            })
            .eq('id', editingUser.id)
            .select() // Select to get the updated row back
            .single(); // Expecting a single row

        if (updateError) {
            throw new Error(`Profil güncellenemedi: ${updateError.message}`);
        }

        if (!updateData) {
             throw new Error('Güncellenmiş profil verisi alınamadı.');
        }

         console.log('Profile updated successfully.');

        // 3. Update local state
        setUsers(currentUsers =>
            currentUsers.map(u => (u.id === editingUser.id ? { ...u, ...updateData } : u))
        );

        // 4. Close modal
        closeEditModal();

    } catch (err: any) {
        console.error('Error saving user:', err);
        setError(`Kaydetme hatası: ${err.message}`);
        // Optionally revert avatar preview if save failed?
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    console.log(`Attempting to delete user: ${userId}`);
    // IMPORTANT: Actual deletion MUST be done via a secure Edge Function
    // using Supabase Admin API (supabase.auth.admin.deleteUser)
    if (window.confirm(`Kullanıcıyı (${userId}) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve **KESİNLİKLE GÜVENLİ BİR SUNUCU FONKSİYONU (EDGE FUNCTION)** gerektirir. Bu buton şimdilik sadece bir uyarıdır.`)) {
       console.warn('User deletion requires a secure Edge Function using the Supabase Admin API.');
       alert('Gerçek silme işlemi için güvenli bir Edge Function oluşturulmalıdır.');
       // Example (commented out): Calling an edge function
       /*
       try {
         setLoading(true); // Indicate loading state
         const { error } = await supabase.functions.invoke('manage-users', { // Replace 'manage-users' with your function name
           method: 'DELETE',
           body: { userIdToDelete: userId }
         });
         setLoading(false);
         if (error) throw error;
         alert('Kullanıcı başarıyla silindi (Edge Function aracılığıyla).');
         // Refresh user list after successful deletion
         setUsers(currentUsers => currentUsers.filter(u => u.id !== userId));
       } catch (err: any) { 
         setLoading(false);
         console.error('Error deleting user via Edge Function:', err);
         alert('Kullanıcı silinirken hata oluştu: ' + err.message);
       }
       */
    }
  };

  if (loading) {
    return <div>Kullanıcılar yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">Hata: {error}</div>;
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Kullanıcı Yönetimi</h2>
      <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded mb-4"><b>Uyarı:</b> Kullanıcı verileri güvenlik nedeniyle doğrudan listelenmektedir. Production ortamı için yetkilendirme kontrollü bir Edge Function kullanın.</p>
      {users.length === 0 ? (
        <p>Gösterilecek kullanıcı bulunamadı.</p>
      ) : (
        <div>
          {/* Search Input */}
          <div className="mb-4">
              <input
                  type="text"
                  placeholder="Kullanıcı ID, Ad veya Kullanıcı Adı ile Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
          </div>

          {/* User Table */}
          {filteredUsers.length === 0 ? (
            <p>Gösterilecek kullanıcı bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tam Ad</th>
                    {/* Add Email header later if fetched */}
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img 
                          className="h-10 w-10 rounded-full object-cover"
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                          alt={`${user.username || 'user'}'s avatar`} 
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name || '-'}</td>
                      {/* Add Email data cell later */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            onClick={() => openEditModal(user)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title="Kullanıcıyı düzenle"
                        >
                            Düzenle
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className="text-red-600 hover:text-red-900"
                          title="Kullanıcıyı sil (Edge Function Gerekli)"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Kullanıcıyı Düzenle ({editingUser.username || editingUser.id})</h3>
              {error && <p className="text-red-500 text-sm mb-3">Hata: {error}</p>}
              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
                  <div className="mb-4">
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                      <input
                          type="text"
                          name="username"
                          id="username"
                          value={editFormData.username}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                  </div>
                  <div className="mb-4">
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Tam Ad</label>
                      <input
                          type="text"
                          name="full_name"
                          id="full_name"
                          value={editFormData.full_name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                  </div>
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Avatar</label>
                      <div className="mt-1 flex items-center">
                          <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100 mr-3">
                              {avatarPreview ? (
                                  <img className="h-full w-full text-gray-300 object-cover" src={avatarPreview} alt="Avatar preview" />
                              ) : (
                                  // Placeholder icon or default image
                                   <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                       <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                   </svg>
                              )}
                          </span>
                          <input 
                            type="file" 
                            id="avatar-upload" 
                            name="avatar-upload" 
                            accept="image/png, image/jpeg, image/gif" 
                            onChange={handleAvatarChange}
                            className="hidden" // Hide default input, style a button instead if needed
                          />
                          <label htmlFor="avatar-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                              Değiştir
                          </label>
                      </div>
                  </div>
                  <div className="items-center px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                          type="submit"
                          disabled={saving}
                          className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                          {saving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button
                          type="button"
                          onClick={closeEditModal}
                          disabled={saving}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                          İptal
                      </button>
                  </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};
