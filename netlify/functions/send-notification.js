const { Resend } = require('resend');

// Handler fonksiyonu
exports.handler = async (event, context) => {
  // CORS için header'lar
  const headers = {
    'Access-Control-Allow-Origin': '*', // Üretimde bunu kısıtlayın
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS isteği için CORS yanıtı
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS destekleniyor' }),
    };
  }

  try {
    // İstek gövdesini parse et
    const requestBody = JSON.parse(event.body || '{}');
    const { to, subject, text, html, from = 'noreply@connectlist.me' } = requestBody;

    // Gerekli alanları kontrol et
    if (!to || !subject || (!text && !html)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Eksik parametreler', 
          message: 'to, subject ve text/html alanları gereklidir' 
        }),
      };
    }

    // Resend API anahtarını ortam değişkenlerinden al
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY ortam değişkeni bulunamadı');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Yapılandırma hatası', 
          message: 'E-posta servisi yapılandırılmamış' 
        }),
      };
    }

    // Resend istemcisini başlat
    const resend = new Resend(resendApiKey);

    // E-postayı gönder
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error('Resend API Hatası:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'E-posta gönderilemedi', details: error }),
      };
    }

    // Başarılı yanıt
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'E-posta başarıyla gönderildi', 
        id: data?.id 
      }),
    };
  } catch (error) {
    console.error('Fonksiyon Hatası:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Sunucu hatası', message: error.message }),
    };
  }
};
