import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { RoleModel, ChannelPermissions, ChannelPermission } from '../models/Role';
import { authenticateToken, requireAdmin } from '../middleware/auth';


const router = Router();

// Validation rules
const createRoleValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Role name can only contain letters, numbers, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must be less than 255 characters'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('channelPermissions')
    .optional()
    .isObject()
    .withMessage('Channel permissions must be an object')
];

const updateRoleValidation = [
  param('id').isUUID().withMessage('Invalid role ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must be less than 255 characters'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object')
];

const channelPermissionValidation = [
  param('roleId').isUUID().withMessage('Invalid role ID'),
  param('channelId').isUUID().withMessage('Invalid channel ID'),
  body('read').isBoolean().withMessage('Read permission must be a boolean'),
  body('write').isBoolean().withMessage('Write permission must be a boolean'),
  body('manage').isBoolean().withMessage('Manage permission must be a boolean')
];

// GET /api/roles - Get all roles
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await RoleModel.getAll();

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/roles/:id - Get role by ID
router.get('/:id', authenticateToken,
  [param('id').isUUID().withMessage('Invalid role ID')],
  async (req: Request, res: Response): Promise<void> => {
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

      // For now, we'll find by name since we don't have findById
      const allRolesResult = await RoleModel.getAll();
      if (!allRolesResult.success || !allRolesResult.data) {
        res.status(500).json({
          success: false,
          error: 'Failed to get roles'
        });
        return;
      }

      const role = allRolesResult.data.find(r => r.id === req.params.id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Get role by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// POST /api/roles - Create new role (admin only)
router.post('/', authenticateToken, requireAdmin, createRoleValidation,
  async (req: Request, res: Response): Promise<void> => {
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

      const { name, description, permissions, channelPermissions } = req.body;

      // Check if role already exists
      const existingRole = await RoleModel.findByName(name);
      if (existingRole) {
        res.status(400).json({
          success: false,
          error: 'Role with this name already exists'
        });
        return;
      }

      const result = await RoleModel.create({
        name,
        description,
        permissions: permissions || {},
        channelPermissions: channelPermissions || {
          default: { read: true, write: false, manage: false }
        }
      });

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/roles/:id - Update role (admin only)
router.put('/:id', authenticateToken, requireAdmin, updateRoleValidation,
  async (req: Request, res: Response): Promise<void> => {
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

      const roleId = req.params.id;
      const { permissions } = req.body;

      // Check if role exists
      const allRolesResult = await RoleModel.getAll();
      if (!allRolesResult.success || !allRolesResult.data) {
        res.status(500).json({
          success: false,
          error: 'Failed to get roles'
        });
        return;
      }

      const existingRole = allRolesResult.data.find(r => r.id === roleId);
      if (!existingRole) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      // Prevent modifying core system roles
      const protectedRoles = ['admin', 'moderator', 'member', 'viewer'];
      if (protectedRoles.includes(existingRole.name)) {
        res.status(400).json({
          success: false,
          error: 'Cannot modify system roles'
        });
        return;
      }

      const result = await RoleModel.updatePermissions(roleId, permissions);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/roles/:id - Delete role (admin only)
router.delete('/:id', authenticateToken, requireAdmin,
  [param('id').isUUID().withMessage('Invalid role ID')],
  async (req: Request, res: Response): Promise<void> => {
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

      const roleId = req.params.id;

      // Check if role exists
      const allRolesResult = await RoleModel.getAll();
      if (!allRolesResult.success || !allRolesResult.data) {
        res.status(500).json({
          success: false,
          error: 'Failed to get roles'
        });
        return;
      }

      const existingRole = allRolesResult.data.find(r => r.id === roleId);
      if (!existingRole) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      // Prevent deleting core system roles
      const protectedRoles = ['admin', 'moderator', 'member', 'viewer'];
      if (protectedRoles.includes(existingRole.name)) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete system roles'
        });
        return;
      }

      // TODO: Check if any users have this role and prevent deletion if so
      // This would require a method to check role usage

      const result = await RoleModel.delete(roleId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/roles/:roleId/channels/:channelId - Set channel permission for role (admin only)
router.put('/:roleId/channels/:channelId', authenticateToken, requireAdmin, channelPermissionValidation,
  async (req: Request, res: Response): Promise<void> => {
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

      const { roleId, channelId } = req.params;
      const { read, write, manage } = req.body;

      const permission: ChannelPermission = { read, write, manage };

      const result = await RoleModel.setChannelPermission(roleId, channelId, permission);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Channel permission updated successfully'
      });
    } catch (error) {
      console.error('Set channel permission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/roles/:roleId/channels/:channelId - Remove channel permission for role (admin only)
router.delete('/:roleId/channels/:channelId', authenticateToken, requireAdmin,
  [
    param('roleId').isUUID().withMessage('Invalid role ID'),
    param('channelId').isUUID().withMessage('Invalid channel ID')
  ],
  async (req: Request, res: Response): Promise<void> => {
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

      const { roleId, channelId } = req.params;

      const result = await RoleModel.removeChannelPermission(roleId, channelId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Channel permission removed successfully'
      });
    } catch (error) {
      console.error('Remove channel permission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/roles/:roleId/channels/default - Update default channel permissions for role (admin only)
router.put('/:roleId/channels/default', authenticateToken, requireAdmin,
  [
    param('roleId').isUUID().withMessage('Invalid role ID'),
    body('read').isBoolean().withMessage('Read permission must be a boolean'),
    body('write').isBoolean().withMessage('Write permission must be a boolean'),
    body('manage').isBoolean().withMessage('Manage permission must be a boolean')
  ],
  async (req: Request, res: Response): Promise<void> => {
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

      const { roleId } = req.params;
      const { read, write, manage } = req.body;

      // Get current channel permissions
      const allRolesResult = await RoleModel.getAll();
      if (!allRolesResult.success || !allRolesResult.data) {
        res.status(500).json({
          success: false,
          error: 'Failed to get roles'
        });
        return;
      }

      const role = allRolesResult.data.find(r => r.id === roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      const currentPermissions = await RoleModel.getChannelPermissions(role.name);
      const updatedPermissions: ChannelPermissions = {
        ...currentPermissions,
        default: { read, write, manage }
      };

      const result = await RoleModel.updateChannelPermissions(roleId, updatedPermissions);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Default channel permissions updated successfully'
      });
    } catch (error) {
      console.error('Update default channel permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/roles/:roleName/channels/:channelId/access - Check channel access for role
router.get('/:roleName/channels/:channelId/access', authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleName, channelId } = req.params;
      const { type = 'read' } = req.query;

      if (!['read', 'write', 'manage'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: 'Access type must be read, write, or manage'
        });
        return;
      }

      const hasAccess = await RoleModel.hasChannelAccess(
        roleName, 
        channelId, 
        type as 'read' | 'write' | 'manage'
      );

      res.status(200).json({
        success: true,
        data: { hasAccess }
      });
    } catch (error) {
      console.error('Check channel access error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;