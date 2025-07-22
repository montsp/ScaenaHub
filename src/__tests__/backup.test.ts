import request from 'supertest';
import { app, server } from '../server';
import { performBackup, performBackupWithRetry, BackupResult } from '../services/backup';

// Mock external dependencies first
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      createOrUpdateFileContents: jest.fn()
    }
  }))
}));

jest.mock('../config/google', () => ({
  getDriveClient: jest.fn(),
  googleConfig: {
    driveFolder: 'test-folder-id'
  }
}));

jest.mock('../config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }
}));

jest.mock('../services/notification', () => ({
  NotificationService: {
    notifyBackupFailure: jest.fn(),
    notifyBackupSuccess: jest.fn()
  }
}));

jest.mock('../services/backup');
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', username: 'testadmin', roles: ['admin'], displayName: 'Test Admin', isActive: true, createdAt: new Date(), updatedAt: new Date() };
    next();
  },
  authRateLimit: () => (req: any, res: any, next: any) => next(),
  requireChannelAccess: () => (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
  requireModerator: (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
  requireAnyRole: () => (req: any, res: any, next: any) => next(),
}));
jest.mock('../middleware/permissions', () => ({
  checkAdmin: (req: any, res: any, next: any) => next(),
  requirePermission: () => (req: any, res: any, next: any) => next(),
  checkPermission: () => (req: any, res: any, next: any) => next(),
  requireAnyPermission: () => (req: any, res: any, next: any) => next(),
  requireAllPermissions: () => (req: any, res: any, next: any) => next(),
}));

const mockPerformBackup = performBackup as jest.MockedFunction<typeof performBackup>;
const mockPerformBackupWithRetry = performBackupWithRetry as jest.MockedFunction<typeof performBackupWithRetry>;

describe('Backup API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/backup', () => {
    it('should perform backup successfully with default settings', async () => {
      const mockResult: BackupResult = {
        success: true,
        message: 'Backup completed successfully',
        details: {
          timestamp: new Date().toISOString(),
          method: 'both',
          fileSize: 1024,
          duration: 5000
        }
      };

      mockPerformBackup.mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Backup completed successfully');
      expect(mockPerformBackup).toHaveBeenCalledWith('both');
    });

    it('should perform backup with specific method', async () => {
      const mockResult: BackupResult = {
        success: true,
        message: 'Google Drive backup completed',
        details: {
          timestamp: new Date().toISOString(),
          method: 'google_drive',
          fileSize: 2048,
          duration: 3000
        }
      };

      mockPerformBackup.mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token')
        .send({ method: 'google_drive' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPerformBackup).toHaveBeenCalledWith('google_drive');
    });

    it('should perform backup with retry enabled', async () => {
      const mockResult: BackupResult = {
        success: true,
        message: 'Backup completed with retry',
        details: {
          timestamp: new Date().toISOString(),
          method: 'github',
          fileSize: 1536,
          duration: 8000
        }
      };

      mockPerformBackupWithRetry.mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token')
        .send({ 
          method: 'github',
          retry: true,
          maxRetries: 5
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPerformBackupWithRetry).toHaveBeenCalledWith('github', 5);
    });

    it('should handle backup failure', async () => {
      const mockResult: BackupResult = {
        success: false,
        error: 'Google Drive connection failed',
        message: 'Backup failed: Google Drive connection failed',
        details: {
          timestamp: new Date().toISOString(),
          method: 'both',
          duration: 2000
        }
      };

      mockPerformBackup.mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Google Drive connection failed');
    });

    it('should validate backup method parameter', async () => {
      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token')
        .send({ method: 'invalid_method' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should validate maxRetries parameter', async () => {
      const res = await request(app)
        .post('/api/backup')
        .set('Authorization', 'Bearer test_token')
        .send({ 
          retry: true,
          maxRetries: 15 // Too high
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/backup/status', () => {
    it('should return backup system status', async () => {
      // Mock environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT = '{"test": "config"}';
      process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id';
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO = 'test-user/test-repo';
      process.env.BACKUP_SCHEDULE = '0 3 * * *';

      const res = await request(app)
        .get('/api/backup/status')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('googleDrive');
      expect(res.body.data).toHaveProperty('github');
      expect(res.body.data).toHaveProperty('schedule');
      expect(res.body.data).toHaveProperty('system');
      expect(res.body.data.googleDrive.configured).toBe(true);
      expect(res.body.data.github.configured).toBe(true);
      expect(res.body.data.github.repository).toBe('test-user/test-repo');
      expect(res.body.data.schedule.cron).toBe('0 3 * * *');
    });

    it('should show unconfigured status when env vars missing', async () => {
      // Clear environment variables
      delete process.env.GOOGLE_SERVICE_ACCOUNT;
      delete process.env.GITHUB_TOKEN;

      const res = await request(app)
        .get('/api/backup/status')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.googleDrive.configured).toBe(false);
      expect(res.body.data.github.configured).toBe(false);
    });
  });

  describe('POST /api/backup/test', () => {
    it('should test backup configuration for all methods', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = '{"test": "config"}';
      process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id';
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO = 'test-user/test-repo';

      const res = await request(app)
        .post('/api/backup/test')
        .set('Authorization', 'Bearer test_token')
        .send({ method: 'both' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tests).toHaveProperty('googleDrive');
      expect(res.body.data.tests).toHaveProperty('github');
      expect(res.body.data.tests.googleDrive.configured).toBe(true);
      expect(res.body.data.tests.github.configured).toBe(true);
      expect(res.body.data.overall.status).toBe('ready');
    });

    it('should test specific backup method', async () => {
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO = 'test-user/test-repo';
      delete process.env.GOOGLE_SERVICE_ACCOUNT;

      const res = await request(app)
        .post('/api/backup/test')
        .set('Authorization', 'Bearer test_token')
        .send({ method: 'github' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tests).toHaveProperty('github');
      expect(res.body.data.tests).not.toHaveProperty('googleDrive');
      expect(res.body.data.tests.github.configured).toBe(true);
    });

    it('should show configuration issues', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT;
      delete process.env.GITHUB_TOKEN;

      const res = await request(app)
        .post('/api/backup/test')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overall.status).toBe('configuration_required');
      expect(res.body.data.tests.googleDrive.configured).toBe(false);
      expect(res.body.data.tests.github.configured).toBe(false);
    });
  });
}); 