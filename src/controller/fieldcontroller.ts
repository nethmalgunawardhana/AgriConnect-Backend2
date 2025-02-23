import { Request, Response } from 'express';
import { db } from '../config/firebase';

// Define interfaces for better type safety
interface Field {
    fieldname: string;
    fieldlocation: string;
    fieldsize: string;
    fieldtype: string;
}

interface FieldWithId extends Field {
    id: string;
}

export const createField = async (req: Request, res: Response) => {
    try {
        const { fieldname, fieldlocation, fieldsize, fieldtype }: Field = req.body;

        if (!fieldname || !fieldlocation || !fieldsize || !fieldtype) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const field = await db.collection('fields').where('fieldname', '==', fieldname).get();
        
        if (!field.empty) {
            return res.status(400).json({ error: 'Field already exists' });
        }

        await db.collection('fields').add({
            fieldname,
            fieldlocation,
            fieldsize,
            fieldtype
        });

        return res.status(201).json({ message: 'Field created successfully' });
    } catch (error) {
        console.error('Error creating field:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

export const getFields = async (req: Request, res: Response) => {
    try {
        const fields = await db.collection('fields').get();
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
        return res.status(500).json({ error: 'Something went wrong' });
    }
};