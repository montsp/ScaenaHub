import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Public client for general operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseKey
);

// Database connection test
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.warn('Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
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