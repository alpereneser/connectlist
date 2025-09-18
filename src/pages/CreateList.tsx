import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { CreateListStep1 } from '../components/CreateListStep1';
import { CreateListStep2 } from '../components/CreateListStep2';

type ListItem = {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'video' | 'place' | 'music';
  year?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export function CreateList() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState<ListItem[]>([]);

  // Kategori kontrolü
  if (!category) {
    navigate('/select-category');
    return null;
  }

  const handleItemsChange = (items: ListItem[]) => {
    setSelectedItems(items);
  };

  const handleNextStep = () => {
    setCurrentStep(2);
  };

  const handleBackStep = () => {
    setCurrentStep(1);
  };

  const handleComplete = (newListId: string) => {
    if (newListId) {
      navigate(`/list/${newListId}`);
    } else {
      navigate('/profile');
    }
  };

  return (
    <>
      <Header />
      <div className="pt-[64px]">
        {/* Progress Indicator */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-2 md:px-4 sm:px-6 lg:px-8 py-3 md:py-4">
            <div className="flex items-center justify-center space-x-2 md:space-x-4">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className={`ml-1 md:ml-2 text-xs md:text-sm font-medium ${
                  currentStep >= 1 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {i18n.language === 'tr' ? 'İçerik Seç' : 'Select Content'}
                </span>
              </div>
              <div className={`w-8 md:w-12 h-0.5 ${
                currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-200'
              }`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className={`ml-1 md:ml-2 text-xs md:text-sm font-medium ${
                  currentStep >= 2 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {i18n.language === 'tr' ? 'Liste Oluştur' : 'Create List'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 ? (
          <CreateListStep1
            category={category}
            selectedItems={selectedItems}
            onItemsChange={handleItemsChange}
            onNext={handleNextStep}
          />
        ) : (
          <CreateListStep2
            category={category}
            selectedItems={selectedItems}
            onBack={handleBackStep}
            onComplete={handleComplete}
          />
        )}
      </div>
    </>
  );
}
