#!/usr/bin/env node

/**
 * Firebase Setup Script
 * 
 * This script helps initialize Firebase configuration for ScaenaHub.
 * It provides guidance on setting up Firebase services and environment variables.
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Setup for ScaenaHub');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully\n');
  } else {
    console.log('❌ .env.example file not found\n');
  }
}

console.log('🚀 Firebase Project Setup Instructions:');
console.log('=======================================\n');

console.log('1. Create a Firebase Project:');
console.log('   - Go to https://console.firebase.google.com/');
console.log('   - Click "Create a project"');
console.log('   - Enter project name (e.g., "scaenahub-production")');
console.log('   - Enable Google Analytics (optional)');
console.log('   - Click "Create project"\n');

console.log('2. Enable Required Services:');
console.log('   a) Firestore Database:');
console.log('      - Go to "Firestore Database" in the left sidebar');
console.log('      - Click "Create database"');
console.log('      - Choose "Start in test mode" (we\'ll add security rules later)');
console.log('      - Select a location close to your users');
console.log('');
console.log('   b) Realtime Database:');
console.log('      - Go to "Realtime Database" in the left sidebar');
console.log('      - Click "Create Database"');
console.log('      - Choose "Start in test mode"');
console.log('      - Select a location');
console.log('');
console.log('   c) Authentication:');
console.log('      - Go to "Authentication" in the left sidebar');
console.log('      - Click "Get started"');
console.log('      - Go to "Sign-in method" tab');
console.log('      - Enable "Anonymous" provider');
console.log('      - Note: ScaenaHub uses custom username/password authentication, not email');
console.log('');


console.log('3. Get Configuration Values:');
console.log('   - Go to Project Settings (gear icon)');
console.log('   - Scroll down to "Your apps" section');
console.log('   - Click "Add app" and choose "Web"');
console.log('   - Register your app with nickname "ScaenaHub"');
console.log('   - Copy the configuration object\n');

console.log('4. Create Service Account:');
console.log('   - Go to Project Settings > Service accounts');
console.log('   - Click "Generate new private key"');
console.log('   - Download the JSON file');
console.log('   - Copy the entire JSON content for FIREBASE_SERVICE_ACCOUNT\n');

console.log('5. Update Environment Variables:');
console.log('   Edit your .env file with the following Firebase variables:');
console.log('   - FIREBASE_API_KEY');
console.log('   - FIREBASE_AUTH_DOMAIN');
console.log('   - FIREBASE_DATABASE_URL');
console.log('   - FIREBASE_PROJECT_ID');
console.log('   - FIREBASE_STORAGE_BUCKET');
console.log('   - FIREBASE_MESSAGING_SENDER_ID');
console.log('   - FIREBASE_APP_ID');
console.log('   - FIREBASE_SERVICE_ACCOUNT (entire JSON as string)');
console.log('   Note: Firebase Storage is not used - files are managed via Google Drive API\n');

console.log('6. Test Configuration:');
console.log('   Run: npm run test:firebase\n');

console.log('📚 Additional Resources:');
console.log('   - Firebase Console: https://console.firebase.google.com/');
console.log('   - Firebase Documentation: https://firebase.google.com/docs');
console.log('   - Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started');
console.log('   - Realtime Database Rules: https://firebase.google.com/docs/database/security\n');

console.log('⚠️  Important Notes:');
console.log('   - Keep your service account JSON secure');
console.log('   - Never commit real credentials to version control');
console.log('   - Use Firebase emulators for local development');
console.log('   - Set up proper security rules before production deployment\n');

console.log('🎯 Next Steps:');
console.log('   1. Complete the Firebase project setup above');
console.log('   2. Update your .env file with the configuration');
console.log('   3. Run: npm run dev to start the development server');
console.log('   4. Check the console for Firebase connection status\n');