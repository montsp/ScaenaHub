import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Google Service Account configuration
export const getGoogleAuth = () => {
  try {
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
    }

    const credentials = JSON.parse(serviceAccount);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });

    return auth;
  } catch (error) {
    console.error('Google Auth configuration error:', error);
    throw new Error('Failed to configure Google authentication');
  }
};

// Google Drive client
export const getDriveClient = async () => {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
};

// Google Sheets client
export const getSheetsClient = async () => {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
};

// Test Google Services connection
export const testGoogleConnection = async (): Promise<boolean> => {
  try {
    const drive = await getDriveClient();
    await drive.about.get({ fields: 'user' });
    console.log('✅ Google Services connection successful');
    return true;
  } catch (error) {
    console.warn('Google Services connection test failed:', error);
    return false;
  }
};

// Google Services configuration
export const googleConfig = {
  driveFolder: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  sheetsId: process.env.GOOGLE_SHEETS_ID || '',
  documentsId: process.env.GOOGLE_DOCUMENTS_ID || '',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};