import { ClassificationResult } from '../types';

/**
 * Classifies trash by sending image data to the serverless API endpoint
 * @param imageDataUrl - Base64 encoded image data URL (e.g., "data:image/jpeg;base64,...")
 * @returns Classification result or null if no valid item detected
 */
export const classifyTrash = async (imageDataUrl: string): Promise<ClassificationResult | null> => {
    try {
        // Use full URL for local dev, relative path for production
        const apiUrl = import.meta.env.DEV
            ? 'http://localhost:3001/api/classify'
            : '/api/classify';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: imageDataUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.json();

            // If it's a validation error (no clear item), return null
            if (response.status === 400 && errorData.error) {
                console.log('Validation error:', errorData.error);
                return null;
            }

            throw new Error(errorData.error || 'Failed to classify item');
        }

        const result: ClassificationResult = await response.json();

        if (result.itemName && result.bin && result.reason) {
            return result;
        } else {
            throw new Error('Invalid response structure from API');
        }
    } catch (e) {
        console.error('Error during classification:', e);
        throw new Error('Failed to classify the item. Please try again.');
    }
};
