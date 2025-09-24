// Mailtrap email fonksiyonu test dosyası

async function testMailtrap() {
  try {
    console.log('🧪 Mailtrap email fonksiyonu test ediliyor...');
    
    const testData = {
      to: 'test@example.com',
      subject: 'Test - Liste Beğeni Bildirimi',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
          <h2 style="margin:0 0 8px; color:#f97316">Merhaba Test Kullanıcısı,</h2>
          <p style="margin:0 0 12px; color:#334155"><strong>@testuser</strong> (Test User), "Test Listesi" listenizi beğendi.</p>
          <div style="text-align:center; margin-top:16px;">
            <a href="https://connectlist.me/test/list/test-listesi" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Listeyi Görüntüle</a>
          </div>
          <p style="color:#64748b; font-size:12px; margin-top:24px; text-align:center">
            ConnectList — <a href="https://connectlist.me/settings" style="color:#f97316">E-posta tercihlerini yönet</a>
          </p>
        </div>
      `,
      from: 'ConnectList <noreply@connectlist.me>'
    };

    const response = await fetch('http://localhost:3999/.netlify/functions/mailtrap-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email başarıyla gönderildi!');
      console.log('📧 Response:', result);
    } else {
      console.log('❌ Email gönderiminde hata:');
      console.log('📧 Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Test sırasında hata:', error.message);
  }
}

testMailtrap();