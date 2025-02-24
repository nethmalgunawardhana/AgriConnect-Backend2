import { Request, Response } from 'express';
import { db } from '../config/firebase';

// Update interface to match frontend field structure
interface Field {
    name: string;
    location: string;
    shape: string;
    size: string;
    soilType: string;
    crops: string[];
}

interface FieldWithId extends Field {
    id: string;
}

export const createField = async (req: Request, res: Response) => {
    try {
        const { name, location, shape, size, soilType, crops }: Field = req.body;

        // Validate required fields
        if (!name || !location || !size || !soilType) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Check for duplicate field names
        const existingField = await db.collection('fields').where('name', '==', name).get();
        
        if (!existingField.empty) {
            return res.status(400).json({ error: 'A field with this name already exists' });
        }

        // Create new field
        await db.collection('fields').add({
            name,
            location,
            shape,
            size,
            soilType,
            crops: crops || [],
            createdAt: new Date().toISOString()
        });

        return res.status(201).json({ 
            success: true,
            message: 'Field added successfully' 
        });
    } catch (error) {
        console.error('Error creating field:', error);
        return res.status(500).json({ error: 'Failed to add field' });
    }
};

export const getFields = async (req: Request, res: Response) => {
    try {
        const fields = await db.collection('fields')
            .orderBy('createdAt', 'desc')
            .get();
            
        const fieldList: FieldWithId[] = [];

        fields.forEach((doc) => {
            fieldList.push({
                id: doc.id,
                ...(doc.data() as Field)
            });
        });

        return res.status(200).json(fieldList);
    } catch (error) {
        console.error('Error getting fields:', error);
        return res.status(500).json({ error: 'Failed to fetch fields' });
    }
};

export const deleteField = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: 'Field ID is required' });
        }

        await db.collection('fields').doc(id).delete();

        return res.status(200).json({ 
            success: true,
            message: 'Field deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting field:', error);
        return res.status(500).json({ error: 'Failed to delete field' });
    }
};

export const updateField = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData: Partial<Field> = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Field ID is required' });
        }

        await db.collection('fields').doc(id).update({
            ...updateData,
            updatedAt: new Date().toISOString()
        });

        return res.status(200).json({ 
            success: true,
            message: 'Field updated successfully' 
        });
    } catch (error) {
        console.error('Error updating field:', error);
        return res.status(500).json({ error: 'Failed to update field' });
    }
};