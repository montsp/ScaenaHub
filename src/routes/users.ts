import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';
import { authenticateToken, requireAdmin, requireModerator } from '../middleware/auth';


const router = Router();

// Validation rules
const updateRolesValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('roles')
    .isArray({ min: 1 })
    .withMessage('Roles must be a non-empty array')
    .custom(async (roles) => {
      // Validate that all roles exist
      for (const roleName of roles) {
        const role = await RoleModel.findByName(roleName);
        if (!role) {
          throw new Error(`Role '${roleName}' does not exist`);
        }
      }
      return true;
    })
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await UserModel.getAll();

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/users/:id - Get user by ID (admin/moderator only)
router.get('/:id', authenticateToken, requireModerator, 
  [param('id').isUUID().withMessage('Invalid user ID')],
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

      const user = await UserModel.findById(req.params.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/users/:id/roles - Update user roles (admin only)
router.put('/:id/roles', authenticateToken, requireAdmin, updateRolesValidation,
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

      const { roles } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Prevent removing admin role from the last admin
      if (existingUser.roles.includes('admin') && !roles.includes('admin')) {
        const allUsers = await UserModel.getAll();
        if (allUsers.success && allUsers.data) {
          const adminCount = allUsers.data.filter(user => 
            user.roles.includes('admin') && user.isActive
          ).length;
          
          if (adminCount <= 1) {
            res.status(400).json({
              success: false,
              error: 'Cannot remove admin role from the last active admin user'
            });
            return;
          }
        }
      }

      const result = await UserModel.updateRoles(userId, roles);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Update user roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/users/:id - Update user details (admin only)
router.put('/:id', authenticateToken, requireAdmin, updateUserValidation,
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

      const userId = req.params.id;
      const updates = req.body;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Prevent deactivating the last admin
      if (updates.isActive === false && existingUser.roles.includes('admin')) {
        const allUsers = await UserModel.getAll();
        if (allUsers.success && allUsers.data) {
          const activeAdminCount = allUsers.data.filter(user => 
            user.roles.includes('admin') && user.isActive && user.id !== userId
          ).length;
          
          if (activeAdminCount === 0) {
            res.status(400).json({
              success: false,
              error: 'Cannot deactivate the last active admin user'
            });
            return;
          }
        }
      }

      // For now, we'll implement a simple update by recreating the user
      // In a real implementation, you'd want a proper update method
      if (updates.isActive === false) {
        const result = await UserModel.deactivate(userId);
        if (!result.success) {
          res.status(500).json(result);
          return;
        }
      }

      // Get updated user
      const updatedUser = await UserModel.findById(userId);
      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve updated user'
        });
        return;
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/users/:id - Deactivate user (admin only)
router.delete('/:id', authenticateToken, requireAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
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

      const userId = req.params.id;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Prevent deactivating the last admin
      if (existingUser.roles.includes('admin')) {
        const allUsers = await UserModel.getAll();
        if (allUsers.success && allUsers.data) {
          const activeAdminCount = allUsers.data.filter(user => 
            user.roles.includes('admin') && user.isActive && user.id !== userId
          ).length;
          
          if (activeAdminCount === 0) {
            res.status(400).json({
              success: false,
              error: 'Cannot deactivate the last active admin user'
            });
            return;
          }
        }
      }

      // Prevent self-deactivation
      if (req.user && req.user.id === userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot deactivate your own account'
        });
        return;
      }

      const result = await UserModel.deactivate(userId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/users/search/:query - Search users (moderator only)
router.get('/search/:query', authenticateToken, requireModerator,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.params.query.trim();
      
      if (query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
        return;
      }

      const allUsersResult = await UserModel.getAll();
      if (!allUsersResult.success || !allUsersResult.data) {
        res.status(500).json({
          success: false,
          error: 'Failed to search users'
        });
        return;
      }

      // Simple search by username or display name
      const filteredUsers = allUsersResult.data.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.displayName.toLowerCase().includes(query.toLowerCase())
      );

      res.status(200).json({
        success: true,
        data: filteredUsers
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/users/stats - Get user statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsersResult = await UserModel.getAll();
    if (!allUsersResult.success || !allUsersResult.data) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user statistics'
      });
      return;
    }

    const users = allUsersResult.data;
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {} as Record<string, number>
    };

    // Count users by role
    users.forEach(user => {
      user.roles.forEach(role => {
        stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      });
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;