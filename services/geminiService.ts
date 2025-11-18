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

        console.log('[CLIENT] Sending request to:', apiUrl);
        console.log('[CLIENT] Image data size:', imageDataUrl.length, 'bytes');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: imageDataUrl
            })
        });

        console.log('[CLIENT] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[CLIENT] Error response:', errorData);

            // If it's a validation error (no clear item), return null
            if (response.status === 400 && errorData.error) {
                console.log('[CLIENT] Validation error:', errorData.error);
                if (errorData.debug) {
                    console.log('[CLIENT] Debug info:', errorData.debug);
                }
                return null;
            }

            // Log debug info for other errors
            if (errorData.debug) {
                console.error('[CLIENT] Server debug info:', errorData.debug);
                throw new Error(`${errorData.error}\n\nDebug: ${JSON.stringify(errorData.debug, null, 2)}`);
            }

            throw new Error(errorData.error || 'Failed to classify item');
        }

        const result: ClassificationResult = await response.json();
        console.log('[CLIENT] Classification result:', result);

        if (result.itemName && result.bin && result.reason) {
            return result;
        } else {
            throw new Error('Invalid response structure from API');
        }
    } catch (e) {
        console.error('[CLIENT] Error during classification:', e);

        // Network errors
        if (e instanceof TypeError && e.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to API. Please check your connection.');
        }

        // Re-throw with original message if it's already an Error
        if (e instanceof Error) {
            throw e;
        }

        throw new Error('Failed to classify the item. Please try again.');
    }
};
