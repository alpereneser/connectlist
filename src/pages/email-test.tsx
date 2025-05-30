import React, { useState } from 'react';

export default function EmailTest() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Test E-postası');
  const [message, setMessage] = useState('Bu bir test e-postasıdır.');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          text: message
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus(`Başarılı! E-posta gönderildi: ${JSON.stringify(data)}`);
      } else {
        setStatus(`Hata: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      setStatus(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">E-posta Testi</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Alıcı E-posta:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label className="block mb-1">Konu:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label className="block mb-1">Mesaj:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full p-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {loading ? 'Gönderiliyor...' : 'E-posta Gönder'}
        </button>
      </form>
      
      {status && (
        <div className={`mt-4 p-3 rounded ${status.startsWith('Başarılı') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
