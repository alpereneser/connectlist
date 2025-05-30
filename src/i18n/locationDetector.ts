/**
 * Kullanıcının konumunu tespit eden fonksiyon
 * 
 * Bu fonksiyon, kullanıcının IP adresine göre ülke kodunu tespit eder
 * ve Türkiye'den erişim yapılıyorsa 'tr', diğer ülkelerden erişim yapılıyorsa 'en' döndürür.
 * 
 * @returns {Promise<string>} Tespit edilen dil kodu ('tr' veya 'en')
 */
export async function detectUserLocation(): Promise<string> {
  try {
    // Daha güvenilir IP tespit servisleri kullan
    const services = [
      'https://ipapi.co/country/',
      'https://ipinfo.io/country',
      'https://api.ipgeolocation.io/ipgeo?apiKey=b63a7d0e5b8c4e3e9c4a7d0e5b8c4e3e&fields=country_code2'
    ];
    
    // Tüm servislere paralel istek gönder
    const responses = await Promise.allSettled(
      services.map(url => 
        fetch(url, { 
          headers: { 'Accept': 'text/plain, application/json' },
          // Zaman aşımını 3 saniye olarak ayarla
          signal: AbortSignal.timeout(3000)
        })
      )
    );
    
    // Başarılı yanıtları filtrele
    const successfulResponses = responses
      .filter((response): response is PromiseFulfilledResult<Response> => 
        response.status === 'fulfilled' && response.value.ok
      )
      .map(async (response) => {
        const contentType = response.value.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.value.json();
          return data.country_code || data.country || data.countryCode;
        } else {
          return await response.value.text();
        }
      });
    
    // En az bir başarılı yanıt varsa devam et
    if (successfulResponses.length > 0) {
      // İlk başarılı yanıtı al
      const countryCode = await Promise.race(successfulResponses);
      
      console.log('IP tespiti başarılı:', countryCode);
      
      // Türkiye'den erişim yapılıyorsa Türkçe, değilse İngilizce
      return countryCode?.toUpperCase() === 'TR' ? 'tr' : 'en';
    }
    
    throw new Error('Hiçbir IP tespit servisi yanıt vermedi');
  } catch (error) {
    console.error('IP bazlı dil tespiti hatası:', error);
    
    // Tarayıcı dilini kullan (fallback)
    const browserLang = navigator.language.split('-')[0];
    console.log('Tarayıcı dili kullanılıyor:', browserLang);
    
    // Tarayıcı dili Türkçe ise Türkçe, değilse İngilizce
    return browserLang.toLowerCase() === 'tr' ? 'tr' : 'en';
  }
}