import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
    body: {
        email: string;
        password: string;
    };
}

export const validateRequest = (req: AuthRequest, res: Response, next: NextFunction) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        next();
};