#!/usr/bin/env node

/**
 * Firebase Configuration Test Script
 * 
 * This script tests the Firebase configuration and connection.
 */

require('dotenv').config();

const testFirebaseConfig = async () => {
  console.log('🔥 Testing Firebase Configuration');
  console.log('=================================\n');

  // Check environment variables
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_SERVICE_ACCOUNT'
  ];

  console.log('📋 Checking Environment Variables:');
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${varName === 'FIREBASE_SERVICE_ACCOUNT' ? '[JSON Object]' : value.substring(0, 20) + '...'}`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please update your .env file with the missing variables.\n');
    console.log('Run: node scripts/firebase-setup.js for setup instructions.');
    process.exit(1);
  }

  console.log('\n✅ All environment variables are present\n');

  // Test service account JSON parsing
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Service account JSON is valid');
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);
  } catch (error) {
    console.log('❌ Service account JSON is invalid:', error.message);
    process.exit(1);
  }

  // Test Firebase connection
  console.log('\n🔗 Testing Firebase Connection:');
  try {
    // Import Firebase config (this will initialize Firebase)
    const { testFirebaseConnection, getFirebaseStatus } = require('../dist/config/firebase.js');
    
    const isConnected = await testFirebaseConnection();
    if (isConnected) {
      console.log('✅ Firebase connection successful');
      
      const status = await getFirebaseStatus();
      console.log('\n📊 Firebase Status:');
      console.log(`   Provider: ${status.provider}`);
      console.log(`   Connected: ${status.connected}`);
      console.log(`   Services:`);
      console.log(`     - Firestore: ${status.services.firestore ? '✅' : '❌'}`);
      console.log(`     - Realtime Database: ${status.services.realtimeDatabase ? '✅' : '❌'}`);
      console.log(`     - Authentication: ${status.services.authentication ? '✅' : '❌'}`);
      console.log(`     - Storage: ${status.services.storage ? '✅' : '❌'}`);
      console.log(`   Timestamp: ${status.timestamp}`);
    } else {
      console.log('❌ Firebase connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Firebase connection test failed:', error.message);
    console.log('\nMake sure to build the project first: npm run build');
    process.exit(1);
  }

  console.log('\n🎉 Firebase configuration test completed successfully!');
};

// Run the test
testFirebaseConfig().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});