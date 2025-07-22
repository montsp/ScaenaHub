import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth';
import { LoginRequest, RegisterRequest } from '../types';
import { authenticateToken, authRateLimit } from '../middleware/auth';

const router = Router();

// Validation rules
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('adminKey')
    .isLength({ min: 1 })
    .withMessage('Admin key is required')
];

// POST /api/auth/login - User login
router.post('/login', authRateLimit(5, 15 * 60 * 1000), loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const loginData: LoginRequest = {
      username: req.body.username,
      password: req.body.password
    };

    const result = await AuthService.login(loginData);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/register - User registration
router.post('/register', authRateLimit(3, 60 * 60 * 1000), registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const registerData: RegisterRequest = {
      username: req.body.username,
      password: req.body.password,
      displayName: req.body.displayName,
      adminKey: req.body.adminKey
    };

    const result = await AuthService.register(registerData);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Register route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authRateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token required'
      });
      return;
    }

    const result = await AuthService.refreshToken(token);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Token refresh route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get current user route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.logout();
    res.status(200).json(result);
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/validate-admin-key - Validate admin key (for frontend)
router.post('/validate-admin-key', authRateLimit(5, 15 * 60 * 1000), async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminKey } = req.body;

    if (!adminKey) {
      res.status(400).json({
        success: false,
        error: 'Admin key is required'
      });
      return;
    }

    const isValid = AuthService.validateAdminKey(adminKey);

    res.status(200).json({
      success: true,
      data: { valid: isValid }
    });
  } catch (error) {
    console.error('Validate admin key route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/check-token - Check if token is valid
router.get('/check-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(200).json({
        success: true,
        data: { valid: false, error: 'No token provided' }
      });
      return;
    }

    const userResult = await AuthService.getCurrentUser(token);
    
    res.status(200).json({
      success: true,
      data: { 
        valid: userResult.success,
        error: userResult.success ? null : userResult.error
      }
    });
  } catch (error) {
    console.error('Check token route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;