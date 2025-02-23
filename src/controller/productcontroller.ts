import { Request, Response } from 'express';
import { db } from '../config/firebase';

interface Harvest {
    fieldName: string;
    quantity: number;
    price: number;
    description: string;
    location: string;
    farmerName: string;
    createdAt: Date;
}

export const createHarvest = async (req: Request, res: Response) => {
    try {
        const { fieldName, quantity, price, description, location }: Partial<Harvest> = req.body;

        if (!fieldName || !quantity || !price || !location) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Get farmer name from authenticated user (assuming you have auth middleware)
        const farmerName = req.user?.displayName || 'Anonymous Farmer';

        const harvestData: Harvest = {
            fieldName,
            quantity: Number(quantity),
            price: Number(price),
            description: description || '',
            location,
            farmerName,
            createdAt: new Date()
        };

        await db.collection('harvests').add(harvestData);

        return res.status(201).json({ message: 'Harvest listed successfully' });
    } catch (error) {
        console.error('Create harvest error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

export const getHarvests = async (req: Request, res: Response) => {
    try {
        const harvestsSnapshot = await db.collection('harvests')
            .orderBy('createdAt', 'desc')
            .get();

        const harvests = harvestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.status(200).json(harvests);
    } catch (error) {
        console.error('Get harvests error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

export const buyHarvest = async (req: Request, res: Response) => {
    try {
        const { harvestId } = req.params;
        const { quantity } = req.body;

        const harvestRef = db.collection('harvests').doc(harvestId);
        const harvest = await harvestRef.get();

        if (!harvest.exists) {
            return res.status(404).json({ error: 'Harvest not found' });
        }

        const harvestData = harvest.data() as Harvest;
        if (harvestData.quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient quantity available' });
        }

        // Update the quantity
        await harvestRef.update({
            quantity: harvestData.quantity - quantity
        });

        return res.status(200).json({ message: 'Purchase successful' });
    } catch (error) {
        console.error('Buy harvest error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};