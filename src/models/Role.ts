import { supabase, supabaseAdmin } from '../config/database';
import { Role, ApiResponse } from '../types';

export interface ChannelPermission {
  read: boolean;
  write: boolean;
  manage: boolean;
}

export interface ChannelPermissions {
  [channelId: string]: ChannelPermission;
  default: ChannelPermission; // デフォルト権限
}

export class RoleModel {
  // Create a new role
  static async create(roleData: {
    name: string;
    description?: string;
    permissions?: Record<string, boolean>;
    channelPermissions?: ChannelPermissions;
  }): Promise<ApiResponse<Role>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('roles')
        .insert({
          name: roleData.name,
          description: roleData.description || '',
          permissions: roleData.permissions || {},
          channel_permissions: roleData.channelPermissions || {
            default: { read: true, write: false, manage: false }
          }
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          channelPermissions: data.channel_permissions || { default: { read: true, write: false, manage: false } },
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all roles
  static async getAll(): Promise<ApiResponse<Role[]>> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const roles = data.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        channelPermissions: role.channel_permissions || { default: { read: true, write: false, manage: false } },
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at)
      }));

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Find role by name
  static async findByName(name: string): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('name', name)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        channelPermissions: data.channel_permissions || { default: { read: true, write: false, manage: false } },
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error finding role by name:', error);
      return null;
    }
  }

  // Update role permissions
  static async updatePermissions(
    roleId: string, 
    permissions: Record<string, boolean>
  ): Promise<ApiResponse<Role>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('roles')
        .update({ permissions })
        .eq('id', roleId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          channelPermissions: data.channel_permissions || { default: { read: true, write: false, manage: false } },
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update channel permissions for a role
  static async updateChannelPermissions(
    roleId: string,
    channelPermissions: ChannelPermissions
  ): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabaseAdmin
        .from('roles')
        .update({ channel_permissions: channelPermissions })
        .eq('id', roleId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get channel permissions for a role
  static async getChannelPermissions(roleName: string): Promise<ChannelPermissions | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('channel_permissions')
        .eq('name', roleName)
        .single();

      if (error || !data) {
        return null;
      }

      return data.channel_permissions as ChannelPermissions;
    } catch (error) {
      console.error('Error getting channel permissions:', error);
      return null;
    }
  }

  // Check if role has specific permission
  static hasPermission(role: Role, permission: string): boolean {
    return role.permissions[permission] === true;
  }

  // Check if role has channel access
  static async hasChannelAccess(
    roleName: string, 
    channelId: string, 
    accessType: 'read' | 'write' | 'manage'
  ): Promise<boolean> {
    try {
      const permissions = await this.getChannelPermissions(roleName);
      if (!permissions) return false;

      // Check specific channel permission first
      if (permissions[channelId]) {
        return permissions[channelId][accessType];
      }

      // Fall back to default permission
      return permissions.default[accessType];
    } catch (error) {
      console.error('Error checking channel access:', error);
      return false;
    }
  }

  // Set specific channel permission for a role
  static async setChannelPermission(
    roleId: string,
    channelId: string,
    permission: ChannelPermission
  ): Promise<ApiResponse<boolean>> {
    try {
      // Get current channel permissions
      const { data: currentRole, error: fetchError } = await supabase
        .from('roles')
        .select('channel_permissions')
        .eq('id', roleId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: fetchError.message
        };
      }

      const currentPermissions = currentRole.channel_permissions as ChannelPermissions;
      
      // Update the specific channel permission
      const updatedPermissions = {
        ...currentPermissions,
        [channelId]: permission
      };

      const { error } = await supabaseAdmin
        .from('roles')
        .update({ channel_permissions: updatedPermissions })
        .eq('id', roleId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Remove specific channel permission (fall back to default)
  static async removeChannelPermission(
    roleId: string,
    channelId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Get current channel permissions
      const { data: currentRole, error: fetchError } = await supabase
        .from('roles')
        .select('channel_permissions')
        .eq('id', roleId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: fetchError.message
        };
      }

      const currentPermissions = currentRole.channel_permissions as ChannelPermissions;
      
      // Remove the specific channel permission
      const { [channelId]: removed, ...updatedPermissions } = currentPermissions;

      const { error } = await supabaseAdmin
        .from('roles')
        .update({ channel_permissions: updatedPermissions })
        .eq('id', roleId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Delete role
  static async delete(roleId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabaseAdmin
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}