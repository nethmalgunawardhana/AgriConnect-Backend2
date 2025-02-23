import { Request, Response } from 'express';
import { db } from '../config/firebase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

interface Farmer {
    email: string;
    password: string;
    name: string;
    phone: string;
    location: string;
    insurancePreference: string;
    experienceLevel: string;
}

export const registerFarmer = async (req: Request, res: Response) => {
    try {
        const { email, password, name, phone, location, insurancePreference, experienceLevel }: Farmer = req.body;
        
        if (!email || !password || !name || !phone || !location || !insurancePreference || !experienceLevel) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userSnapshot = await db.collection('farmers').where('email', '==', email).get();
        if (!userSnapshot.empty) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const docRef = await db.collection('farmers').add({
            email,
            password: hashedPassword,
            name,
            phone,
            location,
            insurancePreference,
            experienceLevel,
            createdAt: new Date()
        });

        return res.status(201).json({ 
            message: 'User created successfully',
            userId: docRef.id 
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

export const loginFarmer = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userSnapshot = await db.collection('farmers').where('email', '==', email).get();
        if (userSnapshot.empty) {
            return res.status(400).json({ error: 'User does not exist' });
        }

        const userDoc = userSnapshot.docs[0];
        const userInfo = userDoc.data();
        const isPasswordValid = await bcrypt.compare(password, userInfo.password);
        
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }

        const token = jwt.sign(
            { email: userInfo.email, id: userDoc.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: userDoc.id,
                name: userInfo.name,
                email: userInfo.email,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userDoc = await db.collection('farmers').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        if (!userData) {
            return res.status(404).json({ error: 'User data not found' });
        }

        // Exclude sensitive information
        const { password, ...userProfile } = userData;
        
        return res.status(200).json({
            user: userProfile
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};