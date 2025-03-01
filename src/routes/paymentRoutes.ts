import express,{Router} from 'express';
import { createPaymentIntent, handleStripeWebhook } from '../controller/paymentcontroller';

const paymentRouter: Router = express.Router();

// Route for creating a payment intent
paymentRouter.post('/create-payment-intent', createPaymentIntent);

// Webhook route for Stripe events
paymentRouter.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default paymentRouter;