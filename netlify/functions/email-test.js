const axios = require('axios');
 
exports.handler = async function(event, context) {
  // CORS başlıkları
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS isteği için CORS yanıtı
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS destekleniyor' })
    };
  }

  // Sadece GET ve POST isteklerine izin ver
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // GET isteği için HTML form sayfası döndür
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html'
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>E-posta Testi</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 500px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 5px;
              font-weight: bold;
            }
            input, textarea {
              width: 100%;
              padding: 8px;
              margin-bottom: 15px;
              border: 1px solid #ddd;
              border-radius: 4px;
              box-sizing: border-box;
            }
            button {
              background-color: #FF5722;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover {
              background-color: #E64A19;
            }
            #result {
              margin-top: 20px;
              padding: 10px;
              border-radius: 4px;
              display: none;
            }
            .success {
              background-color: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .error {
              background-color: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
          </style>
        </head>
        <body>
          <h1>E-posta Testi</h1>
          <form id="emailForm">
            <div>
              <label for="to">Alıcı E-posta:</label>
              <input type="email" id="to" name="to" required>
            </div>
            <div>
              <label for="subject">Konu:</label>
              <input type="text" id="subject" name="subject" value="Test E-postası" required>
            </div>
            <div>
              <label for="text">Mesaj:</label>
              <textarea id="text" name="text" rows="4" required>Bu bir test e-postasıdır.</textarea>
            </div>
            <button type="submit">E-posta Gönder</button>
          </form>
          <div id="result"></div>

          <script>
            document.getElementById('emailForm').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const to = document.getElementById('to').value;
              const subject = document.getElementById('subject').value;
              const text = document.getElementById('text').value;
              
              const resultDiv = document.getElementById('result');
              resultDiv.className = '';
              resultDiv.style.display = 'block';
              resultDiv.textContent = 'Gönderiliyor...';
              
              try {
                const response = await fetch('/.netlify/functions/email-test', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ to, subject, text })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  resultDiv.className = 'success';
                  resultDiv.textContent = 'E-posta başarıyla gönderildi!';
                } else {
                  resultDiv.className = 'error';
                  resultDiv.textContent = 'Hata: ' + (data.error || 'Bilinmeyen hata');
                }
              } catch (error) {
                resultDiv.className = 'error';
                resultDiv.textContent = 'Hata: ' + error.message;
              }
            });
          </script>
        </body>
        </html>
      `
    };
  }

  // POST isteği için e-posta gönder
  try {
    const { to, subject, text } = JSON.parse(event.body);
    
    // Gerekli alanları kontrol et
    if (!to || !subject || !text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Eksik bilgiler' })
      };
    }
    
    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'MAILTRAP_TOKEN not set' }) };
    }
    const from = process.env.MAIL_FROM || 'ConnectList <noreply@connectlist.me>';
    // Parse from to name/email
    let fromName = 'ConnectList';
    let fromEmail = from;
    const m = /^(.*)<([^>]+)>$/.exec(from);
    if (m) {
      fromName = m[1].trim().replace(/\"|\'/g, '') || 'ConnectList';
      fromEmail = m[2].trim();
    }
    const payload = {
      from: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      text,
      category: 'Email Test'
    };
    await axios.post('https://send.api.mailtrap.io/api/send', payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'E-posta gönderildi' })
    };
  } catch (error) {
    console.error('E-posta gönderilirken hata:', error);
    
    // Hata detaylarını daha ayrıntılı logla
    console.log('Hata detayları:', JSON.stringify({
      message: error.message,
      stack: error.stack,
      response: error.response ? (error.response.data || error.response.body) : null,
      code: error.code,
      statusCode: error.response ? error.response.status : error.statusCode
    }));
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'E-posta gönderilemedi',
        details: error.message,
        code: error.code,
        statusCode: error.response ? error.response.status : error.statusCode,
        response: error.response ? (error.response.data || error.response.body) : null
      })
    };
  }
};
