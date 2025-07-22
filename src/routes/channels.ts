import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ChannelModel } from '../models/Channel';
import { RoleModel } from '../models/Role';
import { authenticateToken, requireChannelAccess } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/permissions';
import { Channel, ApiResponse } from '../types';

const router = Router();

// Validation middleware
const validateChannelCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/)
    .withMessage('Channel name contains invalid characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('type')
    .isIn(['public', 'private'])
    .withMessage('Channel type must be either public or private'),
  body('allowedRoles')
    .isArray()
    .withMessage('Allowed roles must be an array')
    .custom((roles: string[]) => {
      if (roles.length === 0) {
        throw new Error('At least one role must be specified');
      }
      return true;
    })
];

const validateChannelUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/)
    .withMessage('Channel name contains invalid characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('type')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Channel type must be either public or private'),
  body('allowedRoles')
    .optional()
    .isArray()
    .withMessage('Allowed roles must be an array')
];

const validateChannelId = [
  param('id')
    .isUUID()
    .withMessage('Invalid channel ID format')
];

const validatePermissionUpdate = [
  body('allowedRoles')
    .isArray()
    .withMessage('Allowed roles must be an array')
    .custom((roles: string[]) => {
      if (roles.length === 0) {
        throw new Error('At least one role must be specified');
      }
      return true;
    })
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return true;
  }
  return false;
};

// GET /api/channels - Get channels accessible to user
router.get('/', 
  authenticateToken,
  query('type').optional().isIn(['public', 'private']).withMessage('Invalid channel type filter'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = req.user!;
      const { type, search } = req.query;

      // Get channels accessible to user
      const result = await ChannelModel.getAccessibleChannels(user.roles);
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      let channels = result.data || [];

      // Apply filters
      if (type) {
        channels = channels.filter(channel => channel.type === type);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        channels = channels.filter(channel => 
          channel.name.toLowerCase().includes(searchTerm) ||
          (channel.description && channel.description.toLowerCase().includes(searchTerm))
        );
      }

      // Get channel statistics for each channel
      const channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const statsResult = await ChannelModel.getStats(channel.id);
          return {
            ...channel,
            stats: statsResult.success ? statsResult.data : null
          };
        })
      );

      res.json({
        success: true,
        data: channelsWithStats
      });
    } catch (error) {
      console.error('Get channels error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve channels'
      });
    }
  }
);

// GET /api/channels/all - Get all channels (admin only)
router.get('/all',
  authenticateToken,
  requirePermission('channels.manage'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ChannelModel.getAll();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Get channel statistics for each channel
      const channelsWithStats = await Promise.all(
        (result.data || []).map(async (channel) => {
          const statsResult = await ChannelModel.getStats(channel.id);
          return {
            ...channel,
            stats: statsResult.success ? statsResult.data : null
          };
        })
      );

      res.json({
        success: true,
        data: channelsWithStats
      });
    } catch (error) {
      console.error('Get all channels error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve all channels'
      });
    }
  }
);

// GET /api/channels/:id - Get specific channel
router.get('/:id',
  authenticateToken,
  validateChannelId,
  requireChannelAccess('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const channel = await ChannelModel.findById(id);

      if (!channel) {
        res.status(404).json({
          success: false,
          error: 'Channel not found'
        });
        return;
      }

      // Get channel statistics
      const statsResult = await ChannelModel.getStats(id);

      res.json({
        success: true,
        data: {
          ...channel,
          stats: statsResult.success ? statsResult.data : null
        }
      });
    } catch (error) {
      console.error('Get channel error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve channel'
      });
    }
  }
);

// POST /api/channels - Create new channel
router.post('/',
  authenticateToken,
  requireAnyPermission(['channels.create', 'channels.manage']),
  validateChannelCreation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = req.user!;
      const { name, description, type, allowedRoles } = req.body;

      // Validate that all specified roles exist
      const roleValidation = await Promise.all(
        allowedRoles.map(async (roleName: string) => {
          const role = await RoleModel.findByName(roleName);
          return { roleName, exists: !!role };
        })
      );

      const invalidRoles = roleValidation
        .filter(r => !r.exists)
        .map(r => r.roleName);

      if (invalidRoles.length > 0) {
        res.status(400).json({
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}`
        });
        return;
      }

      // Check for duplicate channel name
      const existingChannels = await ChannelModel.getAll();
      if (existingChannels.success && existingChannels.data) {
        const nameExists = existingChannels.data.some(
          channel => channel.name.toLowerCase() === name.toLowerCase()
        );
        
        if (nameExists) {
          res.status(409).json({
            success: false,
            error: 'Channel name already exists'
          });
          return;
        }
      }

      const result = await ChannelModel.create({
        name,
        description,
        type,
        allowedRoles,
        createdBy: user.id
      });

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Channel created successfully'
      });
    } catch (error) {
      console.error('Create channel error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create channel'
      });
    }
  }
);

// PUT /api/channels/:id - Update channel
router.put('/:id',
  authenticateToken,
  validateChannelId,
  requireChannelAccess('manage'),
  validateChannelUpdate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const updates = req.body;

      // Validate that all specified roles exist (if roles are being updated)
      if (updates.allowedRoles) {
        const roleValidation = await Promise.all(
          updates.allowedRoles.map(async (roleName: string) => {
            const role = await RoleModel.findByName(roleName);
            return { roleName, exists: !!role };
          })
        );

        const invalidRoles = roleValidation
          .filter(r => !r.exists)
          .map(r => r.roleName);

        if (invalidRoles.length > 0) {
          res.status(400).json({
            success: false,
            error: `Invalid roles: ${invalidRoles.join(', ')}`
          });
          return;
        }
      }

      // Check for duplicate channel name (if name is being updated)
      if (updates.name) {
        const existingChannels = await ChannelModel.getAll();
        if (existingChannels.success && existingChannels.data) {
          const nameExists = existingChannels.data.some(
            channel => channel.id !== id && 
            channel.name.toLowerCase() === updates.name.toLowerCase()
          );
          
          if (nameExists) {
            res.status(409).json({
              success: false,
              error: 'Channel name already exists'
            });
            return;
          }
        }
      }

      const result = await ChannelModel.update(id, updates);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Channel updated successfully'
      });
    } catch (error) {
      console.error('Update channel error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update channel'
      });
    }
  }
);

// PUT /api/channels/:id/permissions - Update channel permissions
router.put('/:id/permissions',
  authenticateToken,
  validateChannelId,
  requirePermission('channels.manage'),
  validatePermissionUpdate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const { allowedRoles } = req.body;

      // Validate that all specified roles exist
      const roleValidation = await Promise.all(
        allowedRoles.map(async (roleName: string) => {
          const role = await RoleModel.findByName(roleName);
          return { roleName, exists: !!role };
        })
      );

      const invalidRoles = roleValidation
        .filter(r => !r.exists)
        .map(r => r.roleName);

      if (invalidRoles.length > 0) {
        res.status(400).json({
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}`
        });
        return;
      }

      const result = await ChannelModel.updatePermissions(id, allowedRoles);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Channel permissions updated successfully'
      });
    } catch (error) {
      console.error('Update channel permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update channel permissions'
      });
    }
  }
);

// DELETE /api/channels/:id - Delete channel
router.delete('/:id',
  authenticateToken,
  validateChannelId,
  requirePermission('channels.manage'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;

      // Check if channel exists
      const channel = await ChannelModel.findById(id);
      if (!channel) {
        res.status(404).json({
          success: false,
          error: 'Channel not found'
        });
        return;
      }

      const result = await ChannelModel.delete(id);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Channel deleted successfully'
      });
    } catch (error) {
      console.error('Delete channel error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete channel'
      });
    }
  }
);

// GET /api/channels/:id/stats - Get channel statistics
router.get('/:id/stats',
  authenticateToken,
  validateChannelId,
  requireChannelAccess('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const result = await ChannelModel.getStats(id);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Get channel stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve channel statistics'
      });
    }
  }
);

export default router;