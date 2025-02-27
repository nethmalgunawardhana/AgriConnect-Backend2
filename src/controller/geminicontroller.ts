import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../config/firebase';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Field {
    name: string;
    location: string;
    shape: string;
    size: string;
    soilType: string;
    crops: string[];
}

interface CropSuggestion {
    cropName: string;
    reason: string;
    bestPlantingMonth: string;
    estimatedYield: string;
    careInstructions: string;
}

export const getCropSuggestions = async (req: Request, res: Response) => {
    try {
        const { fieldId } = req.params;

        if (!fieldId) {
            return res.status(400).json({ error: 'Field ID is required' });
        }

        // Get field details from database
        const fieldDoc = await db.collection('fields').doc(fieldId).get();
        
        if (!fieldDoc.exists) {
            return res.status(404).json({ error: 'Field not found' });
        }

        const fieldData = fieldDoc.data() as Field;

        // Construct prompt for Gemini
        const prompt = `As an agricultural expert, provide crop suggestions for a field in Sri Lanka with the following characteristics:

Location: ${fieldData.location}
Soil Type: ${fieldData.soilType}
Field Size: ${fieldData.size}
Current/Past Crops: ${fieldData.crops.join(', ')}

Please suggest 5 suitable crops that would grow well in these conditions. Format your response exactly as follows for each crop (including the numbering):

1. [Crop Name]
Reason: [Why it's suitable for this field]
Best Planting Month: [Month]
Estimated Yield: [Amount per hectare]
Care Instructions: [Basic care instructions]

2. [Next crop...]`;

        // Get model and generate content
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse and structure the response
        const suggestions = parseGeminiResponse(text);

        // Validate parsed suggestions
        if (!suggestions || suggestions.length === 0) {
            throw new Error('Failed to parse crop suggestions from AI response');
        }

        // Sanitize the suggestions to ensure all fields are strings
        const sanitizedSuggestions = suggestions.map(suggestion => ({
            cropName: String(suggestion.cropName || ''),
            reason: String(suggestion.reason || ''),
            bestPlantingMonth: String(suggestion.bestPlantingMonth || ''),
            estimatedYield: String(suggestion.estimatedYield || ''),
            careInstructions: String(suggestion.careInstructions || '')
        }));

        // Save suggestions to database
        await db.collection('fields').doc(fieldId).collection('suggestions').add({
            suggestions: sanitizedSuggestions,
            generatedAt: new Date().toISOString()
        });

        return res.status(200).json({
            success: true,
            suggestions: sanitizedSuggestions
        });

    } catch (error) {
        console.error('Error generating crop suggestions:', error);
        return res.status(500).json({ 
            error: 'Failed to generate crop suggestions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

function parseGeminiResponse(text: string): CropSuggestion[] {
    const suggestions: CropSuggestion[] = [];
    
    // Split text into sections based on numbered entries
    const cropSections = text.split(/^\d+\./m).filter(section => section.trim());
    
    for (const section of cropSections) {
        try {
            // Use more specific regex patterns with named capture groups
            const cropNameRegex = /^\s*([^\n]+)/;
            const reasonRegex = /Reason:\s*([^\n]+)/i;
            const plantingRegex = /Best Planting Month:\s*([^\n]+)/i;
            const yieldRegex = /Estimated Yield:\s*([^\n]+)/i;
            const careRegex = /Care Instructions:\s*([^\n]+)/i;

            const cropMatch = section.match(cropNameRegex);
            const reasonMatch = section.match(reasonRegex);
            const plantingMatch = section.match(plantingRegex);
            const yieldMatch = section.match(yieldRegex);
            const careMatch = section.match(careRegex);

            if (cropMatch) {
                const suggestion: CropSuggestion = {
                    cropName: cropMatch[1].trim(),
                    reason: reasonMatch?.[1]?.trim() || '',
                    bestPlantingMonth: plantingMatch?.[1]?.trim() || '',
                    estimatedYield: yieldMatch?.[1]?.trim() || '',
                    careInstructions: careMatch?.[1]?.trim() || ''
                };

               
                if (suggestion.cropName && (
                    suggestion.reason || 
                    suggestion.bestPlantingMonth || 
                    suggestion.estimatedYield || 
                    suggestion.careInstructions
                )) {
                    suggestions.push(suggestion);
                }
            }
        } catch (error) {
            console.error('Error parsing crop section:', error);
            continue;
        }
    }

    return suggestions;
}

export const getSavedSuggestions = async (req: Request, res: Response) => {
    try {
        const { fieldId } = req.params;

        if (!fieldId) {
            return res.status(400).json({ error: 'Field ID is required' });
        }

        const suggestionsSnapshot = await db.collection('fields')
            .doc(fieldId)
            .collection('suggestions')
            .orderBy('generatedAt', 'desc')
            .limit(1)
            .get();

        if (suggestionsSnapshot.empty) {
            return res.status(404).json({ error: 'No suggestions found for this field' });
        }

        const suggestions = suggestionsSnapshot.docs[0].data();

        return res.status(200).json({
            success: true,
            suggestions: suggestions.suggestions,
            generatedAt: suggestions.generatedAt
        });

    } catch (error) {
        console.error('Error fetching saved suggestions:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch suggestions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};