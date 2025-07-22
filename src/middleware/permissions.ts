import { Request, Response, NextFunction } from 'express';
import { RoleModel } from '../models/Role';
import { UserModel } from '../models/User';

// Permission checking middleware factory
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has the required permission through any of their roles
      let hasPermission = false;
      
      for (const roleName of req.user.roles) {
        const role = await RoleModel.findByName(roleName);
        if (role && RoleModel.hasPermission(role, permission)) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission '${permission}' required`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Multiple permissions middleware factory (user needs ALL permissions)
export const requireAllPermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get all user's permissions
      const userPermissions = new Set<string>();
      
      for (const roleName of req.user.roles) {
        const role = await RoleModel.findByName(roleName);
        if (role) {
          Object.entries(role.permissions).forEach(([perm, hasIt]) => {
            if (hasIt) {
              userPermissions.add(perm);
            }
          });
        }
      }

      // Check if user has all required permissions
      const missingPermissions = permissions.filter(perm => !userPermissions.has(perm));
      
      if (missingPermissions.length > 0) {
        res.status(403).json({
          success: false,
          error: `Missing permissions: ${missingPermissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('All permissions middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Multiple permissions middleware factory (user needs ANY permission)
export const requireAnyPermission = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has any of the required permissions
      let hasAnyPermission = false;
      
      for (const roleName of req.user.roles) {
        const role = await RoleModel.findByName(roleName);
        if (role) {
          for (const permission of permissions) {
            if (RoleModel.hasPermission(role, permission)) {
              hasAnyPermission = true;
              break;
            }
          }
          if (hasAnyPermission) break;
        }
      }

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: `One of the following permissions required: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Any permission middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Resource ownership middleware (user can access their own resources)
export const requireOwnershipOrPermission = (permission: string, userIdField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[userIdField] || req.body[userIdField];
      if (resourceUserId === req.user.id) {
        next();
        return;
      }

      // Check if user has the required permission
      let hasPermission = false;
      
      for (const roleName of req.user.roles) {
        const role = await RoleModel.findByName(roleName);
        if (role && RoleModel.hasPermission(role, permission)) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Access denied: insufficient permissions or not resource owner'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Ownership or permission middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Dynamic permission middleware (permission name from request)
export const requireDynamicPermission = (permissionField: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const permission = req.params[permissionField] || req.body[permissionField];
      if (!permission) {
        res.status(400).json({
          success: false,
          error: `Permission field '${permissionField}' is required`
        });
        return;
      }

      // Check if user has the required permission
      let hasPermission = false;
      
      for (const roleName of req.user.roles) {
        const role = await RoleModel.findByName(roleName);
        if (role && RoleModel.hasPermission(role, permission)) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission '${permission}' required`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Dynamic permission middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Get user permissions helper
export const getUserPermissions = async (userId: string): Promise<Set<string>> => {
  const permissions = new Set<string>();
  
  try {
    const user = await UserModel.findById(userId);
    if (!user) return permissions;

    for (const roleName of user.roles) {
      const role = await RoleModel.findByName(roleName);
      if (role) {
        Object.entries(role.permissions).forEach(([perm, hasIt]) => {
          if (hasIt) {
            permissions.add(perm);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error getting user permissions:', error);
  }

  return permissions;
};

// Check if user has permission helper
export const userHasPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) return false;

    for (const roleName of user.roles) {
      const role = await RoleModel.findByName(roleName);
      if (role && RoleModel.hasPermission(role, permission)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};