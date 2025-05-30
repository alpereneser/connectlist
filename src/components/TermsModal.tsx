import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.language;

  const handleScroll = () => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
    
    if (isBottom) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);
  
  // Dil değiştiğinde içeriği güncelle ve scroll durumunu sıfırla
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, currentLanguage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('auth.termsOfService')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="p-6 max-h-[60vh] overflow-y-auto"
        >
          <h1 className="text-2xl font-bold mb-2">{t('terms.title')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('terms.lastUpdated')}</p>
          
          <p className="text-gray-600 mb-8 leading-relaxed">{t('terms.welcome')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.generalTerms.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.generalTerms.platformDefinition.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.generalTerms.platformDefinition.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.generalTerms.acceptance.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.generalTerms.acceptance.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.generalTerms.changes.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.generalTerms.changes.content')}</p>

          <p>{t('terms.generalTerms.ageRequirement')}</p>
          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.registration.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.registration.conditions.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.registration.conditions.content')}</p>

          <p>{t('terms.registration.security.brief')}</p>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.registration.security.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.registration.security.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.registration.accountData.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.registration.accountData.content')}</p>

          <p>{t('terms.platformUsage.listCreation.brief')}</p>
          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.platformUsage.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformUsage.listCreation.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformUsage.listCreation.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformUsage.likeComment.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformUsage.likeComment.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformUsage.followSystem.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformUsage.followSystem.content')}</p>

          <p>{t('terms.platformUsage.messaging.brief')}</p>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformUsage.messaging.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformUsage.messaging.content')}</p>

          <p>{t('terms.dataPrivacy.collection.brief')}</p>
          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.dataPrivacy.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.dataPrivacy.collection.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.dataPrivacy.collection.content')}</p>

          <p>{t('terms.dataPrivacy.storage.brief')}</p>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.dataPrivacy.storage.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.dataPrivacy.storage.content')}</p>

          <p>{t('terms.dataPrivacy.commitment.brief')}</p>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.dataPrivacy.commitment.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.dataPrivacy.commitment.content')}</p>

          <p>{t('terms.userObligations.appropriate.brief')}</p>
          <ul>
            <li>{t('terms.userObligations.appropriate.item1')}</li>
            <li>{t('terms.userObligations.appropriate.item2')}</li>
            <li>{t('terms.userObligations.appropriate.item3')}</li>
          </ul>
          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.userObligations.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.userObligations.appropriate.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.userObligations.appropriate.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.userObligations.contentResponsibility.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.userObligations.contentResponsibility.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.userObligations.copyright.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.userObligations.copyright.content')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.platformRights.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformRights.serviceChanges.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformRights.serviceChanges.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformRights.contentModeration.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformRights.contentModeration.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.platformRights.liability.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.platformRights.liability.content')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.intellectualProperty.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.intellectualProperty.platformRights.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.intellectualProperty.platformRights.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.intellectualProperty.userContent.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.intellectualProperty.userContent.content')}</p>

          <p>{t('terms.termination.accountClosure.brief')}</p>
          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.termination.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.termination.accountClosure.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.termination.accountClosure.content')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.applicableLaw.title')}</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.applicableLaw.law.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.applicableLaw.law.content')}</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">{t('terms.applicableLaw.disputes.title')}</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.applicableLaw.disputes.content')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.contact.title')}</h2>
          <p className="text-gray-600 mb-2">{t('terms.contact.questions')}</p>
          <p className="text-gray-600 mb-2">{t('terms.contact.email')} <a href="mailto:support@connectlist.com" className="text-orange-500 hover:text-orange-600">support@connectlist.com</a></p>
          <p className="text-gray-600 mb-8">{t('terms.contact.address')}</p>

          <h2 className="text-xl font-bold mt-8 mb-4">{t('terms.acceptanceStatement.title')}</h2>
          <p className="text-gray-600 mb-4 leading-relaxed">{t('terms.acceptanceStatement.content')}</p>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onAccept}
            disabled={!hasScrolledToBottom}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              hasScrolledToBottom
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {hasScrolledToBottom ? t('auth.accept') : t('auth.readToEnd')}
          </button>
        </div>
      </div>
    </div>
  );
}