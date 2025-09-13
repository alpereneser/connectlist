import { useState, useEffect, FormEvent } from 'react';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from '@google/generative-ai';
import {
  createList,
  searchTMDB,
  searchGames,
  searchBooks,
} from '../lib/api';
import { UserManagement } from '../components/UserManagement'; // Updated import path

// Initialize Gemini API
const MODEL_NAME = 'gemini-1.5-flash';
const API_KEY = 'AIzaSyDJyNCJI9dvmyuMzeigAgXqBhtylmjLKhU'; // API Key from user

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// --- Generation Configuration --- Adjust temperature for more variety
const generationConfig: GenerationConfig = {
  temperature: 0.9, // Increased temperature for more creative/varied responses
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const ADMIN_EMAILS = ['alperen@connectlist.me', 'tuna@connectlist.me'];

// Define a type for the user data we fetch
type Profile = {
  id: string;
  username: string | null; // Use username instead of email
};

// Define type for the list items structure expected by createList
// IMPORTANT: Adjust based on the actual payload required by createList
type ListItemForCreation = {
  external_id: string; // Renamed from api_id
  type: 'movie' | 'tv' | 'series' | 'book' | 'game' | 'music' | 'podcast'; // Renamed from item_type
  title: string; // Now required
  image_url: string; // Now required (will use poster_path or book thumbnail)
  // Add any other fields expected by createList (like year, description if needed/available)
};

// Helper mapping for categories
const categoryMapping: { [key: string]: string } = {
  'Kitap (Books)': 'books',
  'Film (Movies)': 'movies',
  'Dizi (TV Shows)': 'series', // Use 'series' based on table data
  'Oyun (Games)': 'games',
  // Add other potential categories from dropdown if necessary
};

// Helper function to check if the user is an admin
const isAdminUser = (userEmail: string | undefined | null): boolean => {
  return !!userEmail && ADMIN_EMAILS.includes(userEmail);
}

export function Admin() {
  const { user, loading: authLoading } = useAuth();

  // State Variables - Update names, add new ones, adjust defaults
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // Renamed from selectedUser
  const [selectedCategory, setSelectedCategory] = useState<string>('Film (Movies)'); // Keep existing categories
  const [topic, setTopic] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Türkçe'); // Renamed and default to Türkçe
  const [isLoading, setIsLoading] = useState<boolean>(false); // Renamed from isGenerating
  const [statusMessage, setStatusMessage] = useState<string>(''); // Renamed from error
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Added success message state

  // Determine if the current user is an admin
  const isCurrentUserAdmin = isAdminUser(user?.email);

  // Fetch users from Supabase when the component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      console.log('Admin.tsx: useEffect - Attempting to fetch users...');
      setIsLoading(true);
      setStatusMessage('Kullanıcılar yükleniyor...');
      try {
        const { data, error, status } = await supabase
          .from('profiles') // <-- Double-check this table name in Supabase
          .select('id, username') // Select id and username
          .order('username'); // Order by username

        // Log the raw response
        console.log('Admin.tsx: useEffect - Supabase fetch response:', { status, data: data ? `(${data.length} users)` : data, error });

        if (error && status !== 406) {
           console.error('Admin.tsx: useEffect - Error fetching users:', error);
           throw error; // Re-throw to be caught by catch block
        }

        if (data) {
          console.log(`Admin.tsx: useEffect - Fetched ${data.length} users successfully.`);
          setUsers(data);
          if (data.length > 0) {
            setSelectedUserId(data[0].id); // Select the first user by default
            console.log('Admin.tsx: useEffect - Set selected user ID to:', data[0].id);
            setStatusMessage(''); // Clear status message on success
          } else {
             console.log('Admin.tsx: useEffect - No users found in profiles table.');
             setStatusMessage('Sistemde kayıtlı kullanıcı bulunamadı.');
          }
        } else {
          // This case might happen if RLS returns 0 rows but no error
          console.log('Admin.tsx: useEffect - No data returned (data is null/undefined) and no significant error.');
          setUsers([]);
          setStatusMessage('Kullanıcı verisi alınamadı.');
        }
      } catch (catchError: any) {
          // Catch errors from the fetch itself or re-thrown errors
          console.error('Admin.tsx: useEffect - Exception during fetchUsers:', catchError);
          setStatusMessage(`Kullanıcıları çekerken bir hata oluştu: ${catchError.message}`);
          setUsers([]);
      } finally {
        setIsLoading(false);
        console.log('Admin.tsx: useEffect - Finished fetchUsers attempt.');
      }
    };

    fetchUsers();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handle list generation form submission
  const handleGenerateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setStatusMessage('');
    setSuccessMessage(null);
    console.log('handleGenerateList started');
    console.log('Selected User ID:', selectedUserId);
    console.log('Selected Category:', selectedCategory);
    console.log('Topic:', topic);
    console.log('Language:', selectedLanguage);

    if (!selectedUserId) {
      setStatusMessage('Lütfen bir kullanıcı seçin.');
      setIsLoading(false);
      return;
    }

    let generatedListTitle = '';
    let generatedListDescription = '';
    let itemTitlesFromAI: string[] = [];
    let listCategoryInternal: 'movie' | 'tv' | 'series' | 'book' | 'game' | 'music' | 'podcast' = 'book'; // Default to book
    let searchFunction: ((query: string) => Promise<any>) | null = null;

    // Determine the internal category type based on the selected category
    if (selectedCategory === 'Film (Movies)') {
      listCategoryInternal = 'movie';
      searchFunction = searchTMDB;
    } else if (selectedCategory === 'Dizi (TV Shows)') {
      listCategoryInternal = 'tv';
      searchFunction = searchTMDB;
    } else if (selectedCategory === 'Kitap (Books)') {
      listCategoryInternal = 'book';
      searchFunction = searchBooks;
    } else if (selectedCategory === 'Oyun (Games)') {
      listCategoryInternal = 'game';
      searchFunction = searchGames;
    }

    if (!searchFunction || !listCategoryInternal) {
      setStatusMessage(`Kategori için arama fonksiyonu veya iç tür adı bulunamadı: ${selectedCategory}`);
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Call the Gemini API directly
      console.log('Calling Gemini API directly...');
      
      // Create prompt for Gemini
      const prompt = `
        Bir ${selectedLanguage} dilinde, '${selectedCategory}' kategorisiyle ilgili ve '${topic}' konusunu içeren **her seferinde farklı ve özgün** bir liste oluştur.
        Bu liste için yaratıcı ve ilgi çekici bir BAŞLIK (title), kısa (1-2 cümle) bir AÇIKLAMA (description) öner.
        Ayrıca, bu listeye ait 5 ila 10 adet öğe BAŞLIĞI (itemTitles) listele.

        ÇOK ÖNEMLİ: Yanıtını SADECE ve SADECE aşağıdaki yapıya sahip GEÇERLİ bir JSON nesnesi olarak döndür. JSON nesnesi dışında KESİNLİKLE hiçbir metin, açıklama veya markdown formatı (\`\`\`json gibi) ekleme:
        {
          "listTitle": "önerilen başlık",
          "listDescription": "önerilen açıklama",
          "itemTitles": ["öğe başlığı 1", "öğe başlığı 2", ...]
        }
      `;
      
      const parts = [{ text: prompt }];

      // Call Gemini API
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig,
        safetySettings,
      });

      console.log('Received response from Gemini API');

      // Check for blocked prompt or response
      if (!result.response || !result.response.candidates || result.response.candidates.length === 0 || !result.response.candidates[0].content) {
        const blockReason = result.response?.promptFeedback?.blockReason;
        const safetyRatings = result.response?.promptFeedback?.safetyRatings;
        console.error('Gemini response blocked or empty.', { blockReason, safetyRatings });
        throw new Error(`AI yanıtı alınamadı veya içerik güvenlik nedeniyle engellendi. Engellenme Nedeni: ${blockReason || 'Bilinmiyor'}`);
      }

      // Extract text and clean it
      const responseText = result.response.candidates[0].content.parts[0]?.text || '';
      const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
      console.log('Cleaned Gemini response text for parsing.');

      // Parse the JSON
      let generatedData;
      try {
        generatedData = JSON.parse(cleanedText);
        console.log('Parsed generated data successfully:', generatedData);

        // Basic validation of the parsed structure
        if (!generatedData.listTitle || !generatedData.listDescription || !Array.isArray(generatedData.itemTitles)) {
          console.error('Invalid JSON structure after parsing:', generatedData);
          throw new Error('Parsed data is missing required fields (listTitle, listDescription, or itemTitles).');
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response JSON:', parseError);
        console.error('Cleaned text that failed parsing:', cleanedText);
        throw new Error(`AI yanıtından liste verisi ayrıştırılamadı: ${parseError instanceof Error ? parseError.message : 'Bilinmeyen hata'}`);
      }

      generatedListTitle = generatedData.listTitle;
      generatedListDescription = generatedData.listDescription;
      itemTitlesFromAI = generatedData.itemTitles;

      console.log('Generated List Title:', generatedListTitle);
      console.log('Generated List Description:', generatedListDescription);
      console.log('Generated Item Titles:', itemTitlesFromAI);

      if (itemTitlesFromAI.length === 0) {
        throw new Error('API liste için hiçbir öğe başlığı döndürmedi.');
      }

      // Step 2: Search for each item using the appropriate API
      const itemsForList: ListItemForCreation[] = [];
      console.log(`Searching for ${itemTitlesFromAI.length} items for category type: ${listCategoryInternal}...`);

      for (const itemTitle of itemTitlesFromAI) {
        try {
          console.log(`Searching for: "${itemTitle}"`);
          // --- Call the determined search function ---
          const searchResults = await searchFunction(itemTitle);
          console.log(`Search results for "${itemTitle}":`, searchResults);

          if (searchResults && searchResults.length > 0) {
            const firstResult = searchResults[0];
            // --- Data Extraction (Ensure these paths match your API responses) ---
            let externalId = '';
            let title = '';
            
            // Extract data based on the category type
            if (listCategoryInternal === 'book') {
              // Google Books API structure
              externalId = firstResult.id || '';
              title = firstResult.volumeInfo?.title || '';
            } else {
              // Other APIs (TMDB, RAWG)
              externalId = String(firstResult.id || firstResult.trackId || firstResult.collectionId || '');
              title = firstResult.title || firstResult.name || firstResult.trackName || firstResult.collectionName || '';
            }
            let imageUrl = '';

            // Construct image URL based on type - adjust as per your actual API responses
            if (listCategoryInternal === 'movie' || listCategoryInternal === 'tv') {
                imageUrl = firstResult.poster_path ? `https://image.tmdb.org/t/p/w500${firstResult.poster_path}` : '';
            } else if (listCategoryInternal === 'book') {
                imageUrl = firstResult.volumeInfo?.imageLinks?.thumbnail || firstResult.volumeInfo?.imageLinks?.smallThumbnail || '';
            } else if (listCategoryInternal === 'game') {
                imageUrl = firstResult.background_image || '';
            }
            // --- End Image URL Construction ---

            if (externalId && title && listCategoryInternal) {
              console.log(`Adding item to list: ID=${externalId}, Title=${title}, Type=${listCategoryInternal}`);
              itemsForList.push({
                external_id: externalId,
                title: title,
                image_url: imageUrl,
                type: listCategoryInternal, // Use the determined internal type
              });
            } else {
                console.warn(`Skipping item "${itemTitle}" due to missing ID (${externalId}), Title (${title}), or internal type (${listCategoryInternal}).`);
            }
          } else {
            console.warn(`No search results found for "${itemTitle}".`);
          }
        } catch (searchError: any) {
          console.error(`Error searching for item "${itemTitle}":`, searchError);
          // Continue to the next item even if one search fails
        }
         // Optional: Add a small delay between searches to avoid rate limits
         await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      }

      console.log('Final items prepared for list creation:', itemsForList);

      // Ensure we have at least 5 items, but no more than 10
      if (itemsForList.length < 5) {
        setIsLoading(false);
        throw new Error(`Yeterli sayıda öğe bulunamadı. En az 5 öğe gerekli, sadece ${itemsForList.length} öğe bulundu.`);
      }
      
      // Limit to 10 items if we have more
      const finalItemsList = itemsForList.slice(0, 10);

      // Step 3: Create the list using the Supabase API
      try {
        console.log('Calling createList function...');
        
        // Get the correct category value for the database using the mapping
        const categoryForDb = categoryMapping[selectedCategory] || selectedCategory.toLowerCase().split(' ')[0]; // Fallback logic

        console.log(`Mapped category for DB: ${categoryForDb}`); // Log the mapped value
 
         // Prepare the data for list creation
         const listData = {
           userId: selectedUserId,
           title: generatedListTitle,
           description: generatedListDescription,
           category: categoryForDb, // Send the mapped lowercase English value (books, movies, series, games)
           is_public: true, // Set to true for automatic lists
           items: finalItemsList
         };
 
         console.log('Data being sent to createList:', listData);
 
         // The createList function in api.ts needs to handle this structure
         const { data: newList, error: createListError } = await createList(listData);

        if (createListError) {
          console.error('Error creating list in Supabase:', createListError);
          // Attempt to parse Supabase error details if available
          const detailedMessage = createListError.details ? `${createListError.message} (${createListError.details})` : createListError.message;
          throw new Error(`Supabase Hatası: ${detailedMessage}`);
        }

        console.log('List created successfully!', newList); // Log the created list object if available
        // Assuming newList might contain the ID: const newListId = newList?.[0]?.id; (Adjust based on actual return value)
        setSuccessMessage(`Liste "${generatedListTitle}" başarıyla oluşturuldu!`);
        // Optionally clear form or navigate
        setTopic(''); // Clear topic after success
        // if (newListId) { navigate(`/list/${newListId}`); } // Navigate if ID is available

      } catch (err: any) {
        console.error('Admin.tsx: handleGenerateList - Error during list generation process:', err);
        let displayError = err.message || 'Liste oluşturulurken bilinmeyen bir hata oluştu.';
        if (err.message?.includes('Failed to fetch')) {
            displayError = "API endpoint'ine ulaşılamadı (/api/generate-list). Sunucu çalışıyor mu?";
        } else if (err.message?.includes('API Hatası')) {
            displayError = err.message; // Use the error message from the API call step
        } else if (err.message?.includes('Supabase Hatası')) {
            displayError = err.message; // Use the error message from the Supabase step
        }
        setStatusMessage(`HATA: ${displayError}`);
      } finally {
        setIsLoading(false);
        console.log('handleGenerateList finished');
      }
    } catch (err: any) {
      console.error('Admin.tsx: handleGenerateList - Error during list generation process:', err);
      let displayError = err.message || 'Liste oluşturulurken bilinmeyen bir hata oluştu.';
      if (err.message?.includes('Failed to fetch')) {
          displayError = "API endpoint'ine ulaşılamadı (/api/generate-list). Sunucu çalışıyor mu?";
      } else if (err.message?.includes('API Hatası')) {
          displayError = err.message; // Use the error message from the API call step
      } else if (err.message?.includes('Supabase Hatası')) {
          displayError = err.message; // Use the error message from the Supabase step
      }
      setStatusMessage(`HATA: ${displayError}`);
    } finally {
      setIsLoading(false);
      console.log('handleGenerateList finished');
    }
  };

  if (authLoading || isLoading) {
    return <div>Loading...</div>; 
  }

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return <Navigate to="/" replace />; 
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 pt-16 pb-16 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Admin Panel</h1>
          
          <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
            <h2 className="text-xl font-medium text-gray-800 mb-4">Otomatik Liste Oluştur</h2>
            <form onSubmit={handleGenerateList} className="space-y-4">
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700">Kullanıcı Seç</label>
                <select 
                  id="user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="">Kullanıcı Seç</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username || 'İsimsiz'} ({u.id.substring(0, 8)}) 
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori Seç</label>
                <select 
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="Film (Movies)">Film (Movies)</option>
                  <option value="Dizi (TV Shows)">Dizi (TV Shows)</option>
                  <option value="Kitap (Books)">Kitap (Books)</option>
                  <option value="Oyun (Games)">Oyun (Games)</option>
                </select>
              </div>

              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Konu / Tür</label>
                <input 
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: En iyi bilim kurgu, 2024 yapımı komedi" 
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">Liste Dili</label>
                <select 
                  id="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="Türkçe">Türkçe</option>
                  <option value="İngilizce">İngilizce</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Oluşturuluyor...' : 'Listeyi Otomatik Oluştur'}
              </button>

              {statusMessage && (
                <p className={`mt-2 text-sm ${statusMessage.startsWith('HATA') ? 'text-red-600' : 'text-gray-600'}`}>{statusMessage}</p>
              )}
              {successMessage && (
                <p className="mt-2 text-sm text-green-600">{successMessage}</p>
              )}
            </form>
          </div>
          
          <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
            <p>Admin Panel'e hoş geldiniz, {user?.email}!</p>
          </div>

          {/* User Management Section - Only for Admins */}
          {isCurrentUserAdmin && (
            <div className="mt-8">
              <UserManagement />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
