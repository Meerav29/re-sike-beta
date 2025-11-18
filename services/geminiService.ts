
import { GoogleGenAI, Type } from "@google/genai";
import { BinType, ClassificationResult } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. Please provide a valid API key for the app to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE" });

const imageBase64ToGenerativePart = (base64: string) => {
    return {
        inlineData: {
            data: base64,
            mimeType: 'image/jpeg'
        },
    };
};

export const classifyTrash = async (imageBase64: string): Promise<ClassificationResult | null> => {
    const imagePart = imageBase64ToGenerativePart(imageBase64);

    // Step 1: Check if there's trash in the image.
    const precheckPrompt = "Analyze the image. Is there a single, clear item of trash or recycling as the main subject? Answer with only 'yes' or 'no'.";
    
    try {
        const precheckResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: precheckPrompt }] },
        });

        const precheckText = precheckResult.text.trim().toLowerCase();
        
        if (!precheckText.includes('yes')) {
            console.log("No clear trash item detected by pre-check.");
            return null;
        }

        // Step 2: If trash is detected, proceed with classification.
        const classificationPrompt = `
          You are an expert in waste classification called Recyclopedia. Analyze the item in the image and classify it. 
          Provide your response in JSON format according to the provided schema.
          Identify the primary trash item, determine the correct disposal bin for it, and provide a brief, helpful reason.
          The possible bin types are: Recycling, Landfill, Compost, Special.
          If you are unsure, classify it as Unknown and explain why.
        `;
        
        const schema = {
            type: Type.OBJECT,
            properties: {
                itemName: {
                    type: Type.STRING,
                    description: "The name of the item identified (e.g., 'Plastic Water Bottle', 'Apple Core', 'Used Battery')."
                },
                bin: {
                    type: Type.STRING,
                    enum: [BinType.RECYCLING, BinType.LANDFILL, BinType.COMPOST, BinType.SPECIAL, BinType.UNKNOWN],
                    description: "The type of bin the item should be placed in."
                },
                reason: {
                    type: Type.STRING,
                    description: "A brief, user-friendly explanation for the classification."
                }
            },
            required: ["itemName", "bin", "reason"]
        };

        const classificationResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: classificationPrompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const jsonText = classificationResult.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result.itemName && result.bin && result.reason) {
            return result as ClassificationResult;
        } else {
            throw new Error("Invalid JSON structure from API");
        }
    } catch (e) {
        console.error("Error during Gemini API call:", e);
        throw new Error("Failed to classify the item. The AI model may be temporarily unavailable.");
    }
};
