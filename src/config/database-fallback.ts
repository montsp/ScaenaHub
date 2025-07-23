/**
 * Database Fallback Module
 * 
 * This module provides a fallback mechanism for database operations when Firebase is not configured.
 * It ensures that the application can continue to use Supabase during the migration period.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase configuration. Application may not function correctly.');
}

// Public client for general operations
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

// Service role client for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseKey || 'placeholder-key'
);

// Database connection test
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('❌ Supabase connection test failed: Missing configuration');
      return false;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.warn('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
};

// Database health check
export const getDatabaseStatus = async () => {
  const isConnected = await testDatabaseConnection();
  return {
    connected: isConnected,
    provider: 'Supabase',
    timestamp: new Date().toISOString()
  };
};