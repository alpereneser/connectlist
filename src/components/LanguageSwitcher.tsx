import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
    >
      <option value="tr">Türkçe</option>
      <option value="en">English</option>
    </select>
  );
}