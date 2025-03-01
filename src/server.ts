import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/authRoutes';
import fieldRouter from './routes/fieldRoutes';
import productRouter from './routes/productRoutes';
import suggestionRouter from './routes/suggestionRoutes';
import weatherRouter from './routes/weatherRoutes';
import paymentRouter from './routes/paymentRoutes';

// Initialize dotenv
dotenv.config();

// Create Express app
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/fields', fieldRouter);
app.use('/api/products', productRouter);
app.use('/api/suggestions', suggestionRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/payments', paymentRouter);

// Port configuration
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err: Error) => {
    console.error('Server failed to start:', err);
});

// Export app for testing purposes
export default app;