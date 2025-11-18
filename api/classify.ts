import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Diagnostic checkpoint 1: API key check
console.log('[CHECKPOINT 1] API Key Status:', GEMINI_API_KEY ? 'Present (length: ' + GEMINI_API_KEY.length + ')' : 'MISSING');

if (!GEMINI_API_KEY) {
  console.error('[ERROR] GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  console.log('\n[CHECKPOINT 2] Request received:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    hasBody: !!req.body
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[ERROR] Invalid method:', req.method);
    return res.status(405).json({
      error: 'Method not allowed',
      debug: { method: req.method, expected: 'POST' }
    });
  }

  try {
    const { imageData } = req.body;

    console.log('[CHECKPOINT 3] Body validation:', {
      hasImageData: !!imageData,
      imageDataLength: imageData ? imageData.length : 0,
      imageDataPreview: imageData ? imageData.substring(0, 50) + '...' : 'none'
    });

    if (!imageData) {
      console.log('[ERROR] No image data provided');
      return res.status(400).json({
        error: 'Image data is required',
        debug: { bodyKeys: Object.keys(req.body) }
      });
    }

    if (!GEMINI_API_KEY) {
      console.log('[ERROR] API key not configured');
      return res.status(500).json({
        error: 'Server configuration error: API key not set',
        debug: { envVarsAvailable: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')) }
      });
    }

    // Extract base64 data and mime type from data URL
    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      console.log('[ERROR] Invalid image format');
      return res.status(400).json({
        error: 'Invalid image data format',
        debug: { format: imageData.substring(0, 30) }
      });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    console.log('[CHECKPOINT 4] Image parsed:', {
      mimeType,
      dataSize: base64Data.length,
      estimatedSizeKB: Math.round(base64Data.length * 0.75 / 1024)
    });

    // Test API connection with a simple call
    console.log('[CHECKPOINT 5] Initializing Gemini API...');

    let model;
    try {
      model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        }
      });
      console.log('[CHECKPOINT 6] Model initialized successfully');
    } catch (modelError) {
      console.error('[ERROR] Failed to initialize model:', modelError);
      return res.status(500).json({
        error: 'Failed to initialize AI model',
        debug: {
          message: modelError instanceof Error ? modelError.message : 'Unknown error',
          apiKeyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'none'
        }
      });
    }

    // Step 1: Pre-check if the image contains a clear, single trash item
    console.log('[CHECKPOINT 7] Starting pre-check...');
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

    let preCheckResult;
    try {
      preCheckResult = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        { text: preCheckPrompt }
      ]);
      console.log('[CHECKPOINT 8] Pre-check API call successful');
    } catch (apiError) {
      console.error('[ERROR] Pre-check API call failed:', apiError);
      return res.status(500).json({
        error: 'Failed to connect to Gemini API',
        debug: {
          step: 'pre-check',
          message: apiError instanceof Error ? apiError.message : 'Unknown error',
          type: apiError instanceof Error ? apiError.constructor.name : typeof apiError
        }
      });
    }

    const preCheckText = preCheckResult.response.text().trim();
    console.log('[CHECKPOINT 9] Pre-check result:', preCheckText);

    if (preCheckText !== 'VALID') {
      console.log('[INFO] Pre-check validation failed - not a clear single item');
      return res.status(400).json({
        error: 'Please take a clear photo of a single item you want to dispose of.',
        debug: { preCheckResponse: preCheckText }
      });
    }

    // Step 2: Classify the item with structured output
    console.log('[CHECKPOINT 10] Starting classification...');
    const classificationPrompt = `You are a waste management expert. Analyze this image and classify the item for proper disposal.

Provide your response as a JSON object with this exact structure:
{
  "itemName": "what is this item (be specific but concise)",
  "bin": "RECYCLING or LANDFILL or COMPOST or SPECIAL or UNKNOWN",
  "reason": "brief explanation (1-2 sentences)",
  "alternatives": ["alternative 1", "alternative 2", "alternative 3"]
}

Bin categories:
- RECYCLING: Clean paper, cardboard, plastic bottles (#1-2), aluminum/steel cans, glass bottles
- LANDFILL: Non-recyclable plastic, contaminated items, certain packaging
- COMPOST: Food scraps, yard waste, compostable materials
- SPECIAL: Electronics, batteries, hazardous waste, items needing special handling
- UNKNOWN: Cannot identify the item clearly

For alternatives, provide 2-4 creative but practical reuse, upcycling, or proper disposal options specific to this item.

IMPORTANT: Return ONLY the JSON object, no markdown formatting or code blocks.`;

    let classificationResult;
    try {
      classificationResult = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        { text: classificationPrompt }
      ]);
      console.log('[CHECKPOINT 11] Classification API call successful');
    } catch (apiError) {
      console.error('[ERROR] Classification API call failed:', apiError);
      return res.status(500).json({
        error: 'Failed to classify item',
        debug: {
          step: 'classification',
          message: apiError instanceof Error ? apiError.message : 'Unknown error',
          type: apiError instanceof Error ? apiError.constructor.name : typeof apiError
        }
      });
    }

    const responseText = classificationResult.response.text();
    console.log('[CHECKPOINT 12] Raw AI response (first 200 chars):', responseText.substring(0, 200));

    // Try to parse as JSON first
    let parsedResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
      console.log('[CHECKPOINT 13] JSON parsing successful');
    } catch (parseError) {
      console.log('[WARNING] JSON parsing failed, attempting regex extraction:', parseError);
      // If not JSON, try to extract structured data from text
      const itemNameMatch = responseText.match(/["']?itemName["']?\s*:\s*["']([^"']+)["']/i);
      const binMatch = responseText.match(/["']?bin["']?\s*:\s*["']?(RECYCLING|LANDFILL|COMPOST|SPECIAL|UNKNOWN)["']?/i);
      const reasonMatch = responseText.match(/["']?reason["']?\s*:\s*["']([^"']+)["']/i);

      parsedResult = {
        itemName: itemNameMatch ? itemNameMatch[1].trim() : 'Unknown Item',
        bin: binMatch ? binMatch[1].toUpperCase() : 'UNKNOWN',
        reason: reasonMatch ? reasonMatch[1].trim() : 'Could not determine disposal method.',
        alternatives: ['Contact your local waste management facility for guidance']
      };
      console.log('[CHECKPOINT 14] Regex extraction result:', parsedResult);
    }

    // Ensure alternatives array exists
    if (!parsedResult.alternatives || !Array.isArray(parsedResult.alternatives)) {
      parsedResult.alternatives = ['Check with local recycling center for proper disposal'];
    }

    const duration = Date.now() - startTime;
    console.log('[CHECKPOINT 15] SUCCESS! Classification complete:', {
      itemName: parsedResult.itemName,
      bin: parsedResult.bin,
      duration: duration + 'ms'
    });

    return res.status(200).json(parsedResult);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[FATAL ERROR] Unhandled exception:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: duration + 'ms'
    });

    return res.status(500).json({
      error: 'Failed to classify item. Please try again.',
      debug: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString()
      }
    });
  }
}
