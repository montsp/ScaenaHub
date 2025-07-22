import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { User, LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from '../types';
import { ValidationUtils } from '../utils/validation';
import { supabase } from '../config/database';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private static readonly ADMIN_KEY = process.env.ADMIN_KEY || 'default_admin_key_change_me';

  // Generate JWT token
  static generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      roles: user.roles,
      displayName: user.displayName
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'scaenahub',
      audience: 'scaenahub-users'
    } as jwt.SignOptions);
  }

  // JWTトークン検証（Socket.io用にもexport）
  static verifyToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'scaenahub',
        audience: 'scaenahub-users'
      });
      return { valid: true, payload };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      } else {
        return { valid: false, error: 'Token verification failed' };
      }
    }
  }

  // Login user
  static async login(loginData: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Validate input
      if (!loginData.username || !loginData.password) {
        return {
          success: false,
          error: 'Username and password are required'
        };
      }

      // Find user by username
      const user = await UserModel.findByUsername(loginData.username);
      if (!user) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Verify password
      const isPasswordValid = await UserModel.verifyPassword(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Generate token
      const token = this.generateToken(user);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  // Register new user
  static async register(registerData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Validate admin key
      const adminKey = await this.getSystemAdminKey();
      if (!ValidationUtils.validateAdminKey(registerData.adminKey, adminKey)) {
        return {
          success: false,
          error: 'Invalid admin key'
        };
      }

      // Validate user data
      const userValidation = ValidationUtils.validateUser({
        username: registerData.username,
        displayName: registerData.displayName
      });

      if (!userValidation.isValid) {
        return {
          success: false,
          error: userValidation.errors.join(', ')
        };
      }

      // Validate password
      const passwordValidation = ValidationUtils.validatePassword(registerData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Check if username already exists
      const existingUser = await UserModel.findByUsername(registerData.username);
      if (existingUser) {
        return {
          success: false,
          error: 'Username already exists'
        };
      }

      // Create user
      const createResult = await UserModel.create({
        username: registerData.username,
        password: registerData.password,
        displayName: registerData.displayName,
        roles: ['member'] // Default role
      });

      if (!createResult.success || !createResult.data) {
        return {
          success: false,
          error: createResult.error || 'Failed to create user'
        };
      }

      // Generate token
      const token = this.generateToken(createResult.data);

      return {
        success: true,
        data: {
          user: createResult.data,
          token
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }

  // Get current user from token
  static async getCurrentUser(token: string): Promise<ApiResponse<User>> {
    try {
      const verification = this.verifyToken(token);
      if (!verification.valid) {
        return {
          success: false,
          error: verification.error || 'Invalid token'
        };
      }

      const user = await UserModel.findById(verification.payload.id);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: userWithoutPassword as User
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Failed to get current user'
      };
    }
  }

  // Refresh token
  static async refreshToken(oldToken: string): Promise<ApiResponse<{ token: string }>> {
    try {
      const verification = this.verifyToken(oldToken);
      if (!verification.valid) {
        return {
          success: false,
          error: verification.error || 'Invalid token'
        };
      }

      // Get fresh user data
      const user = await UserModel.findById(verification.payload.id);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Generate new token
      const newToken = this.generateToken(user);

      return {
        success: true,
        data: { token: newToken }
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh token'
      };
    }
  }

  // Validate admin key
  static validateAdminKey(providedKey: string): boolean {
    return ValidationUtils.validateAdminKey(providedKey, this.ADMIN_KEY);
  }

  // Check if user has specific role
  static hasRole(user: User, roleName: string): boolean {
    return UserModel.hasRole(user, roleName);
  }

  // Check if user has any of the specified roles
  static hasAnyRole(user: User, roleNames: string[]): boolean {
    return UserModel.hasAnyRole(user, roleNames);
  }

  // Check if user is admin
  static isAdmin(user: User): boolean {
    return this.hasRole(user, 'admin');
  }

  // Check if user is moderator or admin
  static isModerator(user: User): boolean {
    return this.hasAnyRole(user, ['admin', 'moderator']);
  }

  // Get system admin key (for system settings)
  static async getSystemAdminKey(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'admin_key')
        .single();

      if (error || !data) {
        return this.ADMIN_KEY; // Fallback to env variable
      }

      return JSON.parse(data.value);
    } catch (error) {
      console.error('Error getting system admin key:', error);
      return this.ADMIN_KEY;
    }
  }

  // Update system admin key
  static async updateSystemAdminKey(newKey: string, currentUser: User): Promise<ApiResponse<boolean>> {
    try {
      if (!this.isAdmin(currentUser)) {
        return {
          success: false,
          error: 'Unauthorized: Admin role required'
        };
      }

      if (newKey.length < 8) {
        return {
          success: false,
          error: 'Admin key must be at least 8 characters long'
        };
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'admin_key',
          value: JSON.stringify(newKey),
          description: '管理者登録用キー',
          updated_by: currentUser.id
        });

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

  // Logout (client-side token invalidation)
  static logout(): ApiResponse<boolean> {
    // In a stateless JWT system, logout is primarily handled client-side
    // by removing the token from storage. We could implement a token blacklist
    // for enhanced security, but for now, we'll keep it simple.
    return {
      success: true,
      data: true,
      message: 'Logged out successfully'
    };
  }
}

// トップレベルexport: Socket.io用
export function verifyToken(token: string): any {
  const result = AuthService.verifyToken(token);
  if (!result.valid) throw new Error(result.error || 'Invalid token');
  return result.payload;
}