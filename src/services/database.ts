import { supabase, supabaseAdmin, testDatabaseConnection } from '../config/database';
import { getSheetsClient } from '../config/google';
import { ApiResponse } from '../types';

export class DatabaseService {
  private static isSupabaseConnected = true;
  private static fallbackToSheets = false;

  // Initialize database connection
  static async initialize(): Promise<boolean> {
    try {
      this.isSupabaseConnected = await testDatabaseConnection();
      
      if (!this.isSupabaseConnected) {
        console.warn('⚠️ Supabase connection failed, attempting Google Sheets fallback...');
        this.fallbackToSheets = await this.initializeGoogleSheetsFallback();
        
        if (this.fallbackToSheets) {
          console.log('✅ Google Sheets fallback initialized');
        } else {
          console.error('❌ Both Supabase and Google Sheets connections failed');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      return false;
    }
  }

  // Initialize Google Sheets as fallback database
  private static async initializeGoogleSheetsFallback(): Promise<boolean> {
    try {
      const sheets = await getSheetsClient();
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
      
      if (!spreadsheetId) {
        console.error('GOOGLE_SHEETS_ID not configured');
        return false;
      }

      // Test connection by getting spreadsheet info
      await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title'
      });

      // Create necessary sheets if they don't exist
      await this.createSheetsStructure(sheets, spreadsheetId);
      
      return true;
    } catch (error) {
      console.error('Google Sheets fallback initialization failed:', error);
      return false;
    }
  }

  // Create Google Sheets structure for fallback
  private static async createSheetsStructure(sheets: any, spreadsheetId: string): Promise<void> {
    try {
      const requiredSheets = [
        'users',
        'roles', 
        'channels',
        'messages',
        'files',
        'system_settings'
      ];

      // Get existing sheets
      const { data: spreadsheet } = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
      });

      const existingSheets = spreadsheet.sheets.map((sheet: any) => sheet.properties.title);
      const sheetsToCreate = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

      if (sheetsToCreate.length > 0) {
        const requests = sheetsToCreate.map(sheetName => ({
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }));

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests
          }
        });

        console.log(`Created Google Sheets: ${sheetsToCreate.join(', ')}`);
      }

      // Initialize headers for each sheet
      await this.initializeSheetHeaders(sheets, spreadsheetId);
      
    } catch (error) {
      console.error('Error creating sheets structure:', error);
      throw error;
    }
  }

  // Initialize headers for Google Sheets
  private static async initializeSheetHeaders(sheets: any, spreadsheetId: string): Promise<void> {
    const sheetHeaders = {
      users: ['id', 'username', 'password_hash', 'roles', 'display_name', 'avatar', 'is_active', 'created_at', 'updated_at'],
      roles: ['id', 'name', 'description', 'permissions', 'channel_permissions', 'created_at', 'updated_at'],
      channels: ['id', 'name', 'description', 'type', 'allowed_roles', 'created_by', 'created_at', 'updated_at'],
      messages: ['id', 'channel_id', 'user_id', 'content', 'type', 'thread_id', 'parent_message_id', 'mentions', 'reactions', 'attachments', 'is_edited', 'edited_at', 'created_at'],
      files: ['id', 'filename', 'original_name', 'mime_type', 'size_bytes', 'google_drive_id', 'google_drive_url', 'uploaded_by', 'channel_id', 'message_id', 'created_at'],
      system_settings: ['id', 'key', 'value', 'description', 'updated_by', 'updated_at']
    };

    for (const [sheetName, headers] of Object.entries(sheetHeaders)) {
      try {
        // Check if headers already exist
        const { data } = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:Z1`
        });

        if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
          // Add headers
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [headers]
            }
          });
        }
      } catch (error) {
        console.warn(`Could not initialize headers for sheet ${sheetName}:`, error);
      }
    }
  }

  // Switch to Google Sheets fallback
  static async switchToGoogleSheets(): Promise<boolean> {
    console.log('🔄 Switching to Google Sheets fallback...');
    this.isSupabaseConnected = false;
    this.fallbackToSheets = await this.initializeGoogleSheetsFallback();
    return this.fallbackToSheets;
  }

  // Get current database status
  static getStatus(): {
    provider: string;
    connected: boolean;
    fallbackActive: boolean;
  } {
    return {
      provider: this.isSupabaseConnected ? 'Supabase' : 'Google Sheets',
      connected: this.isSupabaseConnected || this.fallbackToSheets,
      fallbackActive: this.fallbackToSheets
    };
  }

  // Health check
  static async healthCheck(): Promise<ApiResponse<{
    supabase: boolean;
    googleSheets: boolean;
    currentProvider: string;
  }>> {
    try {
      const supabaseHealth = await testDatabaseConnection();
      
      let googleSheetsHealth = false;
      try {
        const sheets = await getSheetsClient();
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (spreadsheetId) {
          await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'properties.title'
          });
          googleSheetsHealth = true;
        }
      } catch (error) {
        googleSheetsHealth = false;
      }

      return {
        success: true,
        data: {
          supabase: supabaseHealth,
          googleSheets: googleSheetsHealth,
          currentProvider: this.isSupabaseConnected ? 'Supabase' : 'Google Sheets'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Retry Supabase connection
  static async retrySupabaseConnection(): Promise<boolean> {
    console.log('🔄 Retrying Supabase connection...');
    this.isSupabaseConnected = await testDatabaseConnection();
    
    if (this.isSupabaseConnected) {
      this.fallbackToSheets = false;
      console.log('✅ Supabase connection restored');
    }
    
    return this.isSupabaseConnected;
  }

  // Execute database query with fallback
  static async executeQuery<T>(
    supabaseQuery: () => Promise<T>,
    sheetsQuery?: () => Promise<T>
  ): Promise<T> {
    if (this.isSupabaseConnected) {
      try {
        return await supabaseQuery();
      } catch (error) {
        console.warn('Supabase query failed, checking connection...', error);
        
        // Test connection and potentially switch to fallback
        this.isSupabaseConnected = await testDatabaseConnection();
        if (!this.isSupabaseConnected && sheetsQuery) {
          console.log('Switching to Google Sheets fallback for this query');
          this.fallbackToSheets = true;
          return await sheetsQuery();
        }
        throw error;
      }
    } else if (this.fallbackToSheets && sheetsQuery) {
      return await sheetsQuery();
    } else {
      throw new Error('No database connection available');
    }
  }
}

// Initialize database on module load
DatabaseService.initialize().then(success => {
  if (success) {
    console.log('✅ Database service initialized successfully');
  } else {
    console.error('❌ Database service initialization failed');
  }
}).catch(error => {
  console.error('Database service initialization error:', error);
});