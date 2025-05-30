// Türkçe karakterleri İngilizce karakterlere dönüştürme
export function turkishToEnglish(text: string): string {
  const charMap: { [key: string]: string } = {
    'ı': 'i', 'İ': 'i',
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c',
  };

  return text.replace(/[ıİğĞüÜşŞöÖçÇ]/g, letter => charMap[letter] || letter);
}

// URL'ye uygun slug oluşturma
export function createSlug(text: string): string {
  return turkishToEnglish(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') 
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Supabase görsel URL'lerine önbellek parametresi ekle
export function addCacheBustingParam(url: string): string {
  if (!url) return url;
  
  // Eğer URL zaten bir parametre içeriyorsa
  if (url.includes('?')) {
    return `${url}&t=1`;
  }
  
  // Eğer URL parametre içermiyorsa
  return `${url}?t=1`;
}