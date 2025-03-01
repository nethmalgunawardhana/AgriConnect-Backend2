import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { db } from '../config/firebase';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET;

interface PaymentRequestBody {
  amount: number;
  productId: string;
}

interface DecodedToken {
  userId: string;
}

// Create a payment intent
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    try {
      const decoded = jwt.verify(token, SECRET_KEY as string) as DecodedToken;
      userId = decoded.userId;
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    // Extract and validate request body
    const { amount, productId } = req.body as PaymentRequestBody;
    
    // Validate inputs
    if (amount === undefined || amount === null) {
      res.status(400).json({ 
        success: false, 
        error: 'Amount is missing',
        debug: { receivedBody: req.body }
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
      return;
    }

    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    // Verify the product exists and belongs to the user
    const productDoc = await db.collection('harvests').doc(productId).get();
    if (!productDoc.exists) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const productData = productDoc.data();
    if (productData?.userId !== userId) {
      res.status(403).json({ success: false, error: 'You do not have permission to pay for this product' });
      return;
    }

    // Generate a unique idempotency key
    const idempotencyKey = `payment_${productId}_${userId}_${Date.now()}`;

    // Create a Stripe customer
    const customer = await stripe.customers.create({
      metadata: { userId }
    }, { 
      idempotencyKey: `customer_${idempotencyKey}` 
    });

    // Create an ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { 
        apiVersion: '2023-10-16',
        idempotencyKey: `ephemeral_${idempotencyKey}`
      }
    );
    
    // Ensure amount is a number
    let amountValue: number;
    try {
      amountValue = Number(amount);
      if (isNaN(amountValue)) {
        throw new Error('Amount cannot be converted to a number');
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid amount format',
        message: error instanceof Error ? error.message : 'Unknown error',
        debug: { receivedAmount: amount, type: typeof amount }
      });
      return;
    }
    
    // Round to integer (Stripe requires integer amounts in cents)
    amountValue = Math.round(amountValue);
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountValue,
        currency: 'usd',
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        metadata: { 
          productId, 
          userId
        }
      },
      { idempotencyKey }
    );

    res.json({
      paymentIntent: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      success: true
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    let errorResponse: Record<string, any> = { 
      success: false, 
      error: 'Failed to create payment intent',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    // Add Stripe-specific error details if available
    if (error && typeof error === 'object' && 'type' in error && typeof error.type === 'string' && error.type.startsWith('Stripe')) {
      errorResponse.stripeError = {
        type: error.type,
        code: 'code' in error ? error.code : null,
        param: 'param' in error ? error.param : null,
        detail: 'raw' in error && error.raw && typeof error.raw === 'object' && 'message' in error.raw ? error.raw.message : null
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

// Handle Stripe webhook events
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  
  let event;
  
  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err);
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  }
  
  // Only log payment events but don't store them in database
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`PaymentIntent ${failedPayment.id} failed`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    // Return 200 to acknowledge receipt even if processing failed
    // This prevents Stripe from retrying repeatedly
    res.json({ received: true, processingError: error instanceof Error ? error.message : 'Unknown error' });
  }
};