import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  target_date: string;
  created_at: string;
  updated_at: string;
}

export function RoadMap() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmap = async () => {
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .order('target_date', { ascending: true });

      if (error) {
        console.error('Error fetching roadmap:', error);
        return;
      }

      setItems(data);
      setIsLoading(false);
    };

    fetchRoadmap();
  }, []);

  const getStatusColor = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'delayed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'planned':
        return 'Planlandı';
      case 'in_progress':
        return 'Geliştiriliyor';
      case 'completed':
        return 'Tamamlandı';
      case 'delayed':
        return 'Ertelendi';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/">
            <img 
              src="https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-beta-logo.png" 
              alt="Connectlist" 
              className="h-5"
            />
          </Link>
          <Link 
            to="/auth/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Giriş Yap
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-2">Connectlist Yol Haritası</h1>
              <p className="text-gray-600 mb-8">
                Connectlist'in gelecek planlarını ve geliştirme sürecini takip edin.
              </p>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-16 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>

                  <div className="space-y-8">
                    {items.map((item) => (
                      <div key={item.id} className="relative pl-8">
                        {/* Timeline Dot */}
                        <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ${getStatusColor(item.status)}`}></div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.target_date).toLocaleDateString('tr-TR')}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-12 text-right">
                <p className="text-gray-600 font-['Pacifico'] text-lg">
                  Alperen Eser & Tuna Taşmaz
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}