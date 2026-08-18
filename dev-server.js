// Development server to simulate Vercel API routes locally
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('⚠️  GEMINI_API_KEY is not set in .env.local');
  console.error('⚠️  Please add your API key to .env.local file');
} else {
  console.log('✅ GEMINI_API_KEY loaded successfully');
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

app.post('/api/classify', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    // Extract base64 data from data URL
    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    console.log('📸 Processing image...');

    // Step 1: Pre-check if the image contains a clear, single trash item
    const preCheckPrompt = `You are a trash classification assistant. Analyze this image and determine if it shows a SINGLE, CLEAR item that needs disposal.

Respond with ONLY "VALID" or "INVALID".

VALID if:
- Shows ONE clear item that needs disposal (trash, recyclable, compostable, etc.)
- Item is clearly visible and identifiable
- Focus is on the item itself

INVALID if:
- Multiple different items visible
- No clear item (just background, blurry, dark)
- Person's hand/body is the main subject
- Image is too unclear to identify anything
- Shows a scene/room rather than a specific item`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const preCheckResult = await genAI.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [imagePart, { text: preCheckPrompt }]
      }
    });

    const preCheckText = preCheckResult.text.trim();
    console.log('🔍 Pre-check result:', preCheckText);

    if (!preCheckText.includes('VALID')) {
      return res.status(400).json({
        error: 'Please take a clear photo of a single item you want to dispose of.'
      });
    }

    // Step 2: Classify the item with structured output
    const classificationPrompt = `You are a waste management expert. Analyze this image and classify the item for proper disposal.

Provide your response as a JSON object with this structure:
{
  "itemName": "what is this item (be specific but concise)",
  "bin": "RECYCLING or LANDFILL or COMPOST or SPECIAL or UNKNOWN",
  "reason": "brief explanation (1-2 sentences)",
  "alternatives": ["alternative 1", "alternative 2", "alternative 3", "alternative 4"]
}

Bin categories:
- RECYCLING: Clean paper, cardboard, plastic bottles (#1-2), aluminum/steel cans, glass bottles
- LANDFILL: Non-recyclable plastic, contaminated items, certain packaging
- COMPOST: Food scraps, yard waste, compostable materials
- SPECIAL: Electronics, batteries, hazardous waste, items needing special handling
- UNKNOWN: Cannot identify the item clearly

For alternatives, provide 2-4 creative but practical reuse, upcycling, or proper disposal options.

IMPORTANT: Return ONLY the JSON object, no markdown formatting.`;

    const classificationResult = await genAI.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [imagePart, { text: classificationPrompt }]
      }
    });

    const responseText = classificationResult.text.trim();
    console.log('🤖 AI Response:', responseText.substring(0, 200) + '...');

    // Try to parse as JSON first
    let parsedResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
    } catch (e) {
      console.log('⚠️  Could not parse as JSON, extracting data...');
      // If not JSON, try to extract structured data from text
      const itemNameMatch = responseText.match(/["']?itemName["']?\s*:\s*["']([^"']+)["']/i);
      const binMatch = responseText.match(/["']?bin["']?\s*:\s*["']?(RECYCLING|LANDFILL|COMPOST|SPECIAL|UNKNOWN)["']?/i);
      const reasonMatch = responseText.match(/["']?reason["']?\s*:\s*["']([^"']+)["']/i);

      parsedResult = {
        itemName: itemNameMatch ? itemNameMatch[1].trim() : 'Unknown Item',
        bin: binMatch ? binMatch[1].toUpperCase() : 'UNKNOWN',
        reason: reasonMatch ? reasonMatch[1].trim() : 'Could not determine disposal method.',
        alternatives: ['Contact your local waste management facility for guidance', 'Check municipal recycling guidelines']
      };
    }

    // Ensure alternatives array exists
    if (!parsedResult.alternatives || !Array.isArray(parsedResult.alternatives)) {
      parsedResult.alternatives = ['Check with local recycling center for proper disposal'];
    }

    console.log('✅ Classification successful:', parsedResult.itemName, '->', parsedResult.bin);
    return res.status(200).json(parsedResult);

  } catch (error) {
    console.error('❌ Classification error:', error);
    return res.status(500).json({
      error: 'Failed to classify item. Please try again.'
    });
  }
});

app.listen(port, () => {
  console.log('\n🚀 Dev API server running on http://localhost:' + port);
  console.log('📡 API endpoint: http://localhost:' + port + '/api/classify');
  console.log('💡 Make sure Vite is running on port 3000\n');
});
