import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { performBackup, performBackupWithRetry, BackupResult } from '../services/backup';

const router = Router();

// Validation rules
const backupValidation = [
  body('method')
    .optional()
    .isIn(['google_drive', 'github', 'both'])
    .withMessage('Method must be google_drive, github, or both'),
  body('retry')
    .optional()
    .isBoolean()
    .withMessage('Retry must be a boolean'),
  body('maxRetries')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max retries must be between 1 and 10')
];

// POST /api/backup - Manual backup execution
router.post('/', authenticateToken, requireAdmin, backupValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { method = 'both', retry = false, maxRetries = 3 } = req.body;

    console.log(`Manual backup requested by user ${req.user?.username} (method: ${method}, retry: ${retry})`);

    let result: BackupResult;

    if (retry) {
      result = await performBackupWithRetry(method, maxRetries);
    } else {
      result = await performBackup(method);
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Manual backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Manual backup execution failed'
    });
  }
});

// GET /api/backup/status - Get backup system status
router.get('/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check environment variables and system status
    const status = {
      googleDrive: {
        configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_DRIVE_FOLDER_ID),
        lastBackup: null // This could be enhanced to track last backup times
      },
      github: {
        configured: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO),
        repository: process.env.GITHUB_REPO || null
      },
      schedule: {
        enabled: !!process.env.BACKUP_SCHEDULE,
        cron: process.env.BACKUP_SCHEDULE || '0 2 * * *'
      },
      system: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    };

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('Backup status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/backup/test - Test backup configuration
router.post('/test', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { method = 'both' } = req.body;

    console.log(`Backup configuration test requested by user ${req.user?.username} (method: ${method})`);

    const testResults: any = {
      timestamp: new Date().toISOString(),
      method,
      tests: {}
    };

    // Test Google Drive configuration
    if (method === 'google_drive' || method === 'both') {
      try {
        const hasGoogleConfig = !!(process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_DRIVE_FOLDER_ID);
        testResults.tests.googleDrive = {
          configured: hasGoogleConfig,
          status: hasGoogleConfig ? 'ready' : 'missing_configuration',
          message: hasGoogleConfig ? 'Google Drive backup is properly configured' : 'Missing GOOGLE_SERVICE_ACCOUNT or GOOGLE_DRIVE_FOLDER_ID'
        };
      } catch (error: any) {
        testResults.tests.googleDrive = {
          configured: false,
          status: 'error',
          message: error.message
        };
      }
    }

    // Test GitHub configuration
    if (method === 'github' || method === 'both') {
      try {
        const hasGitHubConfig = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
        testResults.tests.github = {
          configured: hasGitHubConfig,
          status: hasGitHubConfig ? 'ready' : 'missing_configuration',
          message: hasGitHubConfig ? 'GitHub backup is properly configured' : 'Missing GITHUB_TOKEN or GITHUB_REPO',
          repository: process.env.GITHUB_REPO || null
        };
      } catch (error: any) {
        testResults.tests.github = {
          configured: false,
          status: 'error',
          message: error.message
        };
      }
    }

    const allConfigured = Object.values(testResults.tests).every((test: any) => test.configured);

    res.status(200).json({
      success: true,
      data: {
        ...testResults,
        overall: {
          status: allConfigured ? 'ready' : 'configuration_required',
          message: allConfigured ? 'All backup methods are properly configured' : 'Some backup methods require configuration'
        }
      }
    });
  } catch (error: any) {
    console.error('Backup test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 