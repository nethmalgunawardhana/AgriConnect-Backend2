import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

interface ServiceAccount {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    universe_domain: string;
}

if (!admin.apps.length) {
    const serviceAccount: ServiceAccount = {
        type: process.env.FIREBASE_TYPE!,
        project_id: process.env.FIREBASE_PROJECT_ID!,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID!,
        private_key: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL!,
        client_id: process.env.FIREBASE_CLIENT_ID!,
        auth_uri: process.env.FIREBASE_AUTH_URI!,
        token_uri: process.env.FIREBASE_TOKEN_URI!,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL!,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL!,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN!
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
    console.log('Firebase Admin Initialized');
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };