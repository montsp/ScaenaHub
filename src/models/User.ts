import { supabase, supabaseAdmin } from '../config/database';
import bcrypt from 'bcryptjs';
import { User, ApiResponse } from '../types';

export class UserModel {
  // Create a new user
  static async create(userData: {
    username: string;
    password: string;
    displayName: string;
    roles?: string[];
  }): Promise<ApiResponse<User>> {
    try {
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          username: userData.username,
          password_hash: passwordHash,
          display_name: userData.displayName,
          roles: userData.roles || ['member']
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = data;
      
      return {
        success: true,
        data: {
          ...userWithoutPassword,
          passwordHash: '', // Don't expose hash
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

  // Find user by username
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        passwordHash: data.password_hash,
        roles: data.roles,
        displayName: data.display_name,
        avatar: data.avatar,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        passwordHash: data.password_hash,
        roles: data.roles,
        displayName: data.display_name,
        avatar: data.avatar,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // Update user roles
  static async updateRoles(userId: string, roles: string[]): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ roles })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const { password_hash, ...userWithoutPassword } = data;
      
      return {
        success: true,
        data: {
          ...userWithoutPassword,
          passwordHash: '',
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

  // Get all users (admin only)
  static async getAll(): Promise<ApiResponse<User[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const users = data.map(user => ({
        id: user.id,
        username: user.username,
        passwordHash: '', // Don't expose password hash
        roles: user.roles,
        displayName: user.display_name,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      }));

      return {
        success: true,
        data: users
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get users by role
  static async getByRole(role: string): Promise<ApiResponse<User[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .contains('roles', [role]);
      if (error) {
        return { success: false, error: error.message };
      }
      const users = data.map((user: any) => ({
        id: user.id,
        username: user.username,
        passwordHash: '',
        roles: user.roles,
        displayName: user.display_name,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      }));
      return { success: true, data: users };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Check if user has specific role
  static hasRole(user: User, roleName: string): boolean {
    return user.roles.includes(roleName);
  }

  // Check if user has any of the specified roles
  static hasAnyRole(user: User, roleNames: string[]): boolean {
    return roleNames.some(role => user.roles.includes(role));
  }

  // Deactivate user
  static async deactivate(userId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

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