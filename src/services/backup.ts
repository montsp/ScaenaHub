import { getDriveClient, googleConfig } from '../config/google';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
// Dynamic import for @octokit/rest to handle ESM compatibility
import { supabase } from '../config/database';
import { NotificationService } from './notification';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    timestamp: string;
    method: 'google_drive' | 'github' | 'both';
    fileSize?: number;
    duration?: number;
  };
}

// Comprehensive Supabase data dump
const dumpSupabaseData = async (): Promise<{ filePath: string; size: number }> => {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const fileName = `scaenahub-backup-${timestamp}.json`;
  const filePath = path.join(__dirname, '../../temp', fileName);

  // Ensure temp directory exists
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Backup all tables
    const backupData: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    // Users table
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw new Error(`Users backup failed: ${usersError.message}`);
    backupData.tables.users = users;

    // Roles table
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) throw new Error(`Roles backup failed: ${rolesError.message}`);
    backupData.tables.roles = roles;

    // Channels table
    const { data: channels, error: channelsError } = await supabase.from('channels').select('*');
    if (channelsError) throw new Error(`Channels backup failed: ${channelsError.message}`);
    backupData.tables.channels = channels;

    // Messages table
    const { data: messages, error: messagesError } = await supabase.from('messages').select('*');
    if (messagesError) throw new Error(`Messages backup failed: ${messagesError.message}`);
    backupData.tables.messages = messages;

    // Write backup data to file
    const backupJson = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(filePath, backupJson);

    const stats = fs.statSync(filePath);
    
    console.log(`Backup created: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);
    
    return { filePath, size: stats.size };
  } catch (error: any) {
    // Clean up file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Database dump failed: ${error.message}`);
  }
};

// Google Driveへバックアップ
export const backupToGoogleDrive = async (filePath: string): Promise<any> => {
  try {
    const drive = await getDriveClient();
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [googleConfig.driveFolder]
      },
      media: {
        mimeType: 'application/json',
        body: fileStream
      }
    });
    
    console.log(`Successfully uploaded to Google Drive: ${fileName} (ID: ${res.data.id})`);
    return res.data;
  } catch (error: any) {
    throw new Error(`Google Drive backup failed: ${error.message}`);
  }
};

// GitHubへバックアップ
export const backupToGitHub = async (filePath: string): Promise<any> => {
  try {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const repo = process.env.GITHUB_REPO;
    
    if (!repo) {
      throw new Error('GITHUB_REPO environment variable is not set');
    }
    
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      throw new Error('GITHUB_REPO must be in format "owner/repository"');
    }
    
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, { encoding: 'base64' });
    
    const res = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: `backup/${fileName}`,
      message: `ScaenaHub Backup: ${fileName}`,
      content,
      committer: { name: 'ScaenaHub BackupBot', email: 'backup@scaenahub.local' },
      author: { name: 'ScaenaHub BackupBot', email: 'backup@scaenahub.local' }
    });
    
    console.log(`Successfully uploaded to GitHub: ${fileName} (SHA: ${res.data.content?.sha})`);
    return res.data;
  } catch (error: any) {
    throw new Error(`GitHub backup failed: ${error.message}`);
  }
};

export const performBackup = async (method: 'google_drive' | 'github' | 'both' = 'both'): Promise<BackupResult> => {
  const startTime = Date.now();
  let backupFile: { filePath: string; size: number } | null = null;
  
  try {
    console.log(`Starting backup process (method: ${method})...`);
    
    // Create database dump
    backupFile = await dumpSupabaseData();
    console.log(`Database dump created: ${path.basename(backupFile.filePath)} (${(backupFile.size / 1024).toFixed(2)} KB)`);

    const results: string[] = [];
    let hasError = false;
    let lastError = '';

    // Backup to Google Drive
    if (method === 'google_drive' || method === 'both') {
      try {
        const driveResult = await backupToGoogleDrive(backupFile.filePath);
        results.push(`Google Drive: ${driveResult.id}`);
        console.log('✓ Google Drive backup completed');
      } catch (error: any) {
        hasError = true;
        lastError = error.message;
        console.error('✗ Google Drive backup failed:', error.message);
        results.push(`Google Drive: FAILED - ${error.message}`);
      }
    }

    // Backup to GitHub
    if (method === 'github' || method === 'both') {
      try {
        const githubResult = await backupToGitHub(backupFile.filePath);
        results.push(`GitHub: ${githubResult.content?.sha || 'success'}`);
        console.log('✓ GitHub backup completed');
      } catch (error: any) {
        hasError = true;
        lastError = error.message;
        console.error('✗ GitHub backup failed:', error.message);
        results.push(`GitHub: FAILED - ${error.message}`);
      }
    }

    // Clean up local file
    if (fs.existsSync(backupFile.filePath)) {
      fs.unlinkSync(backupFile.filePath);
    }

    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    const result: BackupResult = {
      success: !hasError || (method === 'both' && results.some(r => !r.includes('FAILED'))),
      message: hasError ? 
        `Backup completed with errors: ${results.join(', ')}` : 
        `Backup completed successfully: ${results.join(', ')}`,
      details: {
        timestamp,
        method,
        fileSize: backupFile.size,
        duration
      }
    };

    if (hasError) {
      result.error = lastError;
      // Send failure notification
      await NotificationService.notifyBackupFailure(lastError);
    } else {
      // Send success notification
      await NotificationService.notifyBackupSuccess(
        `${results.join(', ')} (${(backupFile.size / 1024).toFixed(2)} KB, ${duration}ms)`
      );
    }

    console.log(`Backup process completed in ${duration}ms`);
    return result;

  } catch (error: any) {
    // Clean up local file if it exists
    if (backupFile && fs.existsSync(backupFile.filePath)) {
      fs.unlinkSync(backupFile.filePath);
    }

    const duration = Date.now() - startTime;
    const errorMessage = `Backup failed: ${error.message}`;
    
    console.error(errorMessage);
    
    // Send failure notification
    await NotificationService.notifyBackupFailure(error.message);

    return {
      success: false,
      error: error.message,
      message: errorMessage,
      details: {
        timestamp: new Date().toISOString(),
        method,
        duration
      }
    };
  }
};

/**
 * Perform backup with retry logic
 */
export const performBackupWithRetry = async (
  method: 'google_drive' | 'github' | 'both' = 'both',
  maxRetries: number = 3
): Promise<BackupResult> => {
  let lastResult: BackupResult | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Backup attempt ${attempt}/${maxRetries}`);
    
    lastResult = await performBackup(method);
    
    if (lastResult.success) {
      if (attempt > 1) {
        console.log(`Backup succeeded on attempt ${attempt}`);
      }
      return lastResult;
    }
    
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
      console.log(`Backup failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All attempts failed
  console.error(`All ${maxRetries} backup attempts failed`);
  return lastResult!;
};