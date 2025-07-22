import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { User } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const userResult = await AuthService.getCurrentUser(token);
    if (!userResult.success || !userResult.data) {
      res.status(401).json({
        success: false,
        error: userResult.error || 'Invalid token'
      });
      return;
    }

    req.user = userResult.data;
    next();
  return;
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const userResult = await AuthService.getCurrentUser(token);
      if (userResult.success && userResult.data) {
        req.user = userResult.data;
      }
    }

    next();
  return;
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  return; // Continue without authentication
  }
};

// Admin role middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!AuthService.isAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Admin role required'
    });
  }

  next();
  return;
};

// Moderator role middleware (admin or moderator)
export const requireModerator = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!AuthService.isModerator(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Moderator or admin role required'
    });
  }

  next();
  return;
};

// Role-based middleware factory
export const requireRole = (roleName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!AuthService.hasRole(req.user, roleName)) {
      return res.status(403).json({
        success: false,
        error: `${roleName} role required`
      });
    }

    next();
  return;
  };
};

// Multiple roles middleware factory
export const requireAnyRole = (roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!AuthService.hasAnyRole(req.user, roleNames)) {
      return res.status(403).json({
        success: false,
        error: `One of the following roles required: ${roleNames.join(', ')}`
      });
    }

    next();
  return;
  };
};

// Channel access middleware factory
export const requireChannelAccess = (accessType: 'read' | 'write' | 'manage' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const channelId = req.params.id || req.params.channelId;
      if (!channelId) {
        return res.status(400).json({
          success: false,
          error: 'Channel ID required'
        });
      }

      // Import ChannelModel here to avoid circular dependency
      const { ChannelModel } = await import('../models/Channel');
      
      const hasAccess = await ChannelModel.canUserAccess(
        channelId,
        req.user.roles,
        accessType
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions for ${accessType} access to this channel`
        });
      }

      next();
  return;
    } catch (error) {
      console.error('Channel access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check channel access'
      });
    }
  };
};

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize attempts for this client
    let clientAttempts = attempts.get(clientId) || [];
    
    // Filter out old attempts
    clientAttempts = clientAttempts.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (clientAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...clientAttempts);
      const resetTime = oldestAttempt + windowMs;
      
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        resetTime: new Date(resetTime).toISOString()
      });
    }

    // Add current attempt
    clientAttempts.push(now);
    attempts.set(clientId, clientAttempts);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [key, timestamps] of attempts.entries()) {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        if (validTimestamps.length === 0) {
          attempts.delete(key);
        } else {
          attempts.set(key, validTimestamps);
        }
      }
    }

    next();
  return;
  };
};

// Session validation middleware
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    // Re-validate user exists and is active
    const { UserModel } = await import('../models/User');
    const currentUser = await UserModel.findById(req.user.id);
    
    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Session invalid - user not found or inactive'
      });
    }

    // Update user data if roles have changed
    if (JSON.stringify(currentUser.roles) !== JSON.stringify(req.user.roles)) {
      req.user = { ...currentUser, passwordHash: '' };
    }

    next();
  return;
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Session validation failed'
    });
  }
};