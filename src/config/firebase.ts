import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, Database, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { initializeApp as initializeAdminApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getDatabase as getAdminDatabase } from 'firebase-admin/database';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Firebase service account interface
interface FirebaseServiceAccount extends ServiceAccount {
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
}

// Environment variables validation
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_SERVICE_ACCOUNT'
];

// Validate environment variables
const validateEnvironment = (): void => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all Firebase configuration variables are set.'
    );
  }
};

// Parse Firebase configuration from environment variables
const getFirebaseConfig = (): FirebaseConfig => {
  validateEnvironment();
  
  return {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.FIREBASE_APP_ID!
  };
};

// Parse service account from environment variable
const getServiceAccount = (): FirebaseServiceAccount => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required');
  }
  
  try {
    return JSON.parse(serviceAccountJson) as FirebaseServiceAccount;
  } catch (error) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format');
  }
};

// Initialize Firebase client app
let clientApp: FirebaseApp;
let firestore: Firestore;
let realtimeDb: Database;
let auth: Auth;

// Initialize Firebase Admin app
let adminApp: any;
let adminFirestore: any;
let adminRealtimeDb: any;
let adminAuth: any;

// Initialize Firebase client services
const initializeFirebaseClient = (): void => {
  try {
    const config = getFirebaseConfig();
    clientApp = initializeApp(config);
    
    // Initialize client services
    firestore = getFirestore(clientApp);
    realtimeDb = getDatabase(clientApp);
    auth = getAuth(clientApp);
    
    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development' && process.env.USE_FIREBASE_EMULATOR === 'true') {
      const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost';
      const firestorePort = parseInt(process.env.FIRESTORE_EMULATOR_PORT || '8080');
      const realtimeHost = process.env.REALTIME_EMULATOR_HOST || 'localhost';
      const realtimePort = parseInt(process.env.REALTIME_EMULATOR_PORT || '9000');
      const authHost = process.env.AUTH_EMULATOR_HOST || 'localhost';
      const authPort = parseInt(process.env.AUTH_EMULATOR_PORT || '9099');
      
      connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
      connectDatabaseEmulator(realtimeDb, realtimeHost, realtimePort);
      connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
      
      console.log('🔧 Connected to Firebase emulators');
    }
    
    console.log('✅ Firebase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase client:', error);
    throw error;
  }
};

// Initialize Firebase Admin services
const initializeFirebaseAdmin = (): void => {
  try {
    const serviceAccount = getServiceAccount();
    
    adminApp = initializeAdminApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    
    // Initialize admin services
    adminFirestore = getAdminFirestore(adminApp);
    adminRealtimeDb = getAdminDatabase(adminApp);
    adminAuth = getAdminAuth(adminApp);
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
};

// Initialize all Firebase services
const initializeFirebase = (): void => {
  initializeFirebaseClient();
  initializeFirebaseAdmin();
};

// Create custom token for username-based authentication
const createCustomToken = async (userId: string, customClaims?: object): Promise<string> => {
  try {
    const token = await adminAuth.createCustomToken(userId, customClaims);
    return token;
  } catch (error) {
    console.error('Failed to create custom token:', error);
    throw error;
  }
};

// Verify custom token
const verifyCustomToken = async (token: string): Promise<any> => {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Failed to verify custom token:', error);
    throw error;
  }
};

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Test Firestore connection
    const testDoc = adminFirestore.collection('_test').doc('connection');
    await testDoc.set({ timestamp: new Date(), test: true });
    await testDoc.delete();
    
    // Test Realtime Database connection
    const testRef = adminRealtimeDb.ref('_test/connection');
    await testRef.set({ timestamp: Date.now(), test: true });
    await testRef.remove();
    
    console.log('✅ Firebase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Get Firebase status
export const getFirebaseStatus = async () => {
  const isConnected = await testFirebaseConnection();
  return {
    connected: isConnected,
    provider: 'Firebase',
    services: {
      firestore: !!adminFirestore,
      realtimeDatabase: !!adminRealtimeDb,
      authentication: !!adminAuth
    },
    timestamp: new Date().toISOString()
  };
};

// Initialize Firebase on module load
try {
  initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  // Don't throw here to allow the app to start even if Firebase config is missing
  // This allows for graceful degradation during development
}

// Export Firebase services
export {
  // Client services
  clientApp,
  firestore,
  realtimeDb as realtimeDatabase,
  auth,
  
  // Admin services
  adminApp,
  adminFirestore,
  adminRealtimeDb as adminRealtimeDatabase,
  adminAuth,
  
  // Configuration
  getFirebaseConfig,
  getServiceAccount,
  
  // Custom authentication
  createCustomToken,
  verifyCustomToken
};

// Export types
export type { FirebaseConfig, FirebaseServiceAccount };