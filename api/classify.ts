import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    // Extract base64 data and mime type from data URL
    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    });

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

    const preCheckResult = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      { text: preCheckPrompt }
    ]);

    const preCheckText = preCheckResult.response.text().trim();

    if (preCheckText !== 'VALID') {
      return res.status(400).json({
        error: 'Please take a clear photo of a single item you want to dispose of.'
      });
    }

    // Step 2: Classify the item with structured output
    const classificationPrompt = `You are a waste management expert. Analyze this image and classify the item for proper disposal.

Provide:
1. itemName: What is this item? (be specific but concise)
2. bin: Which bin does it go in? (RECYCLING, LANDFILL, COMPOST, SPECIAL, or UNKNOWN)
3. reason: Brief explanation of why it goes in that bin (1-2 sentences)
4. alternatives: Array of alternative disposal/reuse ideas (2-4 practical suggestions)

Bin categories:
- RECYCLING: Clean paper, cardboard, plastic bottles (#1-2), aluminum/steel cans, glass bottles
- LANDFILL: Non-recyclable plastic, contaminated items, certain packaging
- COMPOST: Food scraps, yard waste, compostable materials
- SPECIAL: Electronics, batteries, hazardous waste, items needing special handling
- UNKNOWN: Cannot identify the item clearly

For alternatives, provide creative but practical reuse, upcycling, or proper disposal options specific to this item.`;

    const classificationResult = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      { text: classificationPrompt }
    ]);

    const responseText = classificationResult.response.text();

    // Try to parse as JSON first
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // If not JSON, try to extract structured data from text
      const itemNameMatch = responseText.match(/itemName[:\s]+["']?([^"'\n]+)["']?/i);
      const binMatch = responseText.match(/bin[:\s]+["']?(RECYCLING|LANDFILL|COMPOST|SPECIAL|UNKNOWN)["']?/i);
      const reasonMatch = responseText.match(/reason[:\s]+["']?([^"'\n]+)["']?/i);

      parsedResult = {
        itemName: itemNameMatch ? itemNameMatch[1].trim() : 'Unknown Item',
        bin: binMatch ? binMatch[1].toUpperCase() : 'UNKNOWN',
        reason: reasonMatch ? reasonMatch[1].trim() : 'Could not determine disposal method.',
        alternatives: ['Contact your local waste management facility for guidance']
      };
    }

    // Ensure alternatives array exists
    if (!parsedResult.alternatives || !Array.isArray(parsedResult.alternatives)) {
      parsedResult.alternatives = ['Check with local recycling center for proper disposal'];
    }

    return res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Classification error:', error);
    return res.status(500).json({
      error: 'Failed to classify item. Please try again.'
    });
  }
}
