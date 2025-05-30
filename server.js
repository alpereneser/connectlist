import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3333;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const MODEL_NAME = 'gemini-1.5-flash';
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

console.log('API Key present:', !!API_KEY); // Log if API key is present (without revealing it)

if (!API_KEY) {
  console.error('FATAL ERROR: Google Gemini API Key (GOOGLE_GEMINI_API_KEY) not found in environment variables.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }) : null;

const generationConfig = {
  temperature: 0.8,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// API Endpoint
app.post('/api/generate-list', async (req, res) => {
  console.log('API endpoint called with method:', req.method);
  console.log('Request body:', req.body);

  if (!genAI || !model) {
    console.error('Gemini AI client not initialized. Check API Key in .env.local');
    return res.status(500).json({ error: 'Server configuration error: AI client not initialized. Check API Key.' });
  }

  const { topic, category, language } = req.body;

  if (!topic || !category || !language) {
    return res.status(400).json({ error: 'Missing required fields: topic, category, language' });
  }

  console.log(`API Endpoint: Received request - Topic:"${topic}", Category:"${category}", Language:"${language}"`);

  try {
    // Updated prompt for clearer JSON instruction
    const prompt = `
      Bir ${language} dilinde, '${category}' kategorisiyle ilgili ve '${topic}' konusunu içeren bir liste oluştur.
      Bu liste için yaratıcı ve ilgi çekici bir BAŞLIK (title), kısa (1-2 cümle) bir AÇIKLAMA (description) öner.
      Ayrıca, bu listeye ait 5 ila 10 adet öğe BAŞLIĞI (itemTitles) listele.

      ÇOK ÖNEMLİ: Yanıtını SADECE ve SADECE aşağıdaki yapıya sahip GEÇERLİ bir JSON nesnesi olarak döndür. JSON nesnesi dışında KESİNLİKLE hiçbir metin, açıklama veya markdown formatı (\`\`\`json gibi) ekleme:
      {
        "listTitle": "önerilen başlık",
        "listDescription": "önerilen açıklama",
        "itemTitles": ["öğe başlığı 1", "öğe başlığı 2", ...]
      }
    `;

    const parts = [{ text: prompt }];

    console.log('Sending prompt to Gemini...');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
      safetySettings,
    });

    console.log('Received raw response object from Gemini.');

    // Check for blocked prompt or response
    if (!result.response || !result.response.candidates || result.response.candidates.length === 0 || !result.response.candidates[0].content) {
      const blockReason = result.response?.promptFeedback?.blockReason;
      const safetyRatings = result.response?.promptFeedback?.safetyRatings;
      console.error('Gemini response blocked or empty.', { blockReason, safetyRatings });
      return res.status(500).json({ 
        error: 'AI yanıtı alınamadı veya içerik güvenlik nedeniyle engellendi.', 
        details: `Engellenme Nedeni: ${blockReason || 'Bilinmiyor'}`, 
        safetyRatings: safetyRatings 
      });
    }

    // Extract text and clean it
    const responseText = result.response.candidates[0].content.parts[0].text;
    const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
    console.log('Cleaned Gemini response text for parsing.');

    // Parse the JSON
    try {
      const generatedData = JSON.parse(cleanedText);
      console.log('Parsed generated data successfully.');

      // Basic validation of the parsed structure
      if (!generatedData.listTitle || !generatedData.listDescription || !Array.isArray(generatedData.itemTitles)) {
        console.error('Invalid JSON structure after parsing:', generatedData);
        throw new Error('Parsed data is missing required fields (listTitle, listDescription, or itemTitles).');
      }

      return res.status(200).json(generatedData);
    } catch (parseError) {
      console.error('Failed to parse Gemini response JSON:', parseError);
      console.error('Cleaned text that failed parsing:', cleanedText);
      return res.status(500).json({ 
        error: 'AI yanıtından liste verisi ayrıştırılamadı.',
        details: parseError.message,
        rawResponse: cleanedText
      });
    }

  } catch (error) {
    console.error('Error calling Gemini API or processing response:', error);
    return res.status(500).json({ error: 'Liste oluşturulurken AI ile iletişimde hata oluştu.', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
