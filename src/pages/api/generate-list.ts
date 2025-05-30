import { Request, Response } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = 'gemini-1.5-flash'; // Or another suitable model
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

console.log('API Key present:', !!API_KEY); // Log if API key is present (without revealing it)

// Define the expected structure of the response from Gemini
interface GeminiResponse {
    listTitle: string;
    listDescription: string;
    itemTitles: string[];
}

// Define the structure of the response sent back to the frontend
type ApiResponseData = GeminiResponse | { error: string; details?: any; safetyRatings?: any; rawResponse?: string };

if (!API_KEY) {
  console.error('FATAL ERROR: Google Gemini API Key (GOOGLE_GEMINI_API_KEY) not found in environment variables.');
  // Don't throw here as it prevents server startup, handle in the request.
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }) : null;

const generationConfig = {
  temperature: 0.8,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096,
  // Ensure response mime type is set if the model supports it and strict JSON is needed
  // responseMimeType: 'application/json',
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Export a handler function that can be used with Express.js
export default async function handler(req: Request, res: Response) {
  console.log('API endpoint called with method:', req.method);
  console.log('Request body:', req.body);

  if (!genAI || !model) {
      console.error('Gemini AI client not initialized. Check API Key in .env.local');
      return res.status(500).json({ error: 'Server configuration error: AI client not initialized. Check API Key.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
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

    console.log('Received raw response object from Gemini.'); // Avoid logging full response if sensitive

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
    // console.log('Raw Gemini response text:', responseText); // Log potentially large/sensitive data
    const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
    console.log('Cleaned Gemini response text for parsing.'); // Avoid logging potentially large/sensitive data

    // Parse the JSON
    try {
        const generatedData: GeminiResponse = JSON.parse(cleanedText);
        console.log('Parsed generated data successfully.');

        // Basic validation of the parsed structure
        if (!generatedData.listTitle || !generatedData.listDescription || !Array.isArray(generatedData.itemTitles)) {
            console.error('Invalid JSON structure after parsing:', generatedData);
            throw new Error('Parsed data is missing required fields (listTitle, listDescription, or itemTitles).');
        }

        return res.status(200).json(generatedData);
    } catch (parseError: any) {
        console.error('Failed to parse Gemini response JSON:', parseError);
        console.error('Cleaned text that failed parsing:', cleanedText); // Log the problematic text
        return res.status(500).json({ 
          error: 'AI yanıtından liste verisi ayrıştırılamadı.',
          details: parseError.message,
          rawResponse: cleanedText // Send the cleaned (but failed to parse) text back
         });
    }

  } catch (error: any) {
    console.error('Error calling Gemini API or processing response:', error);
    return res.status(500).json({ error: 'Liste oluşturulurken AI ile iletişimde hata oluştu.', details: error.message });
  }
}
