import { User, Role, Channel, Message } from '../types';

export class ValidationUtils {
  // User validation
  static validateUser(userData: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (userData.username) {
      if (userData.username.length < 3 || userData.username.length > 50) {
        errors.push('Username must be between 3 and 50 characters');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
        errors.push('Username can only contain letters, numbers, hyphens, and underscores');
      }
    }

    if (userData.displayName) {
      if (userData.displayName.length < 1 || userData.displayName.length > 100) {
        errors.push('Display name must be between 1 and 100 characters');
      }
    }

    if (userData.roles) {
      if (!Array.isArray(userData.roles) || userData.roles.length === 0) {
        errors.push('User must have at least one role');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Password validation
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Role validation
  static validateRole(roleData: Partial<Role>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (roleData.name) {
      if (roleData.name.length < 1 || roleData.name.length > 50) {
        errors.push('Role name must be between 1 and 50 characters');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(roleData.name)) {
        errors.push('Role name can only contain letters, numbers, hyphens, and underscores');
      }
    }

    if (roleData.permissions) {
      if (typeof roleData.permissions !== 'object') {
        errors.push('Permissions must be an object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Channel validation
  static validateChannel(channelData: Partial<Channel>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (channelData.name) {
      if (channelData.name.length < 1 || channelData.name.length > 100) {
        errors.push('Channel name must be between 1 and 100 characters');
      }
      if (!/^[a-zA-Z0-9_-\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(channelData.name)) {
        errors.push('Channel name contains invalid characters');
      }
    }

    if (channelData.type && !['public', 'private'].includes(channelData.type)) {
      errors.push('Channel type must be either "public" or "private"');
    }

    if (channelData.allowedRoles) {
      if (!Array.isArray(channelData.allowedRoles)) {
        errors.push('Allowed roles must be an array');
      } else if (channelData.allowedRoles.length === 0) {
        errors.push('Channel must have at least one allowed role');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Message validation
  static validateMessage(messageData: Partial<Message>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (messageData.content) {
      if (messageData.content.length === 0) {
        errors.push('Message content cannot be empty');
      }
      if (messageData.content.length > 2000) {
        errors.push('Message content must be less than 2000 characters');
      }
    }

    if (messageData.type && !['text', 'file', 'system'].includes(messageData.type)) {
      errors.push('Message type must be "text", "file", or "system"');
    }

    if (messageData.mentions) {
      if (!Array.isArray(messageData.mentions)) {
        errors.push('Mentions must be an array');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // File validation
  static validateFile(file: {
    filename: string;
    mimeType: string;
    size: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!file.filename || file.filename.length === 0) {
      errors.push('Filename is required');
    }

    if (file.filename.length > 255) {
      errors.push('Filename must be less than 255 characters');
    }

    if (!allowedMimeTypes.includes(file.mimeType)) {
      errors.push('File type not allowed');
    }

    if (file.size > maxFileSize) {
      errors.push('File size must be less than 10MB');
    }

    if (file.size <= 0) {
      errors.push('File size must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Admin key validation
  static validateAdminKey(providedKey: string, actualKey: string): boolean {
    return providedKey === actualKey && actualKey !== 'default_admin_key_change_me';
  }

  // Email validation (for future use)
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // URL validation
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Sanitize HTML content
  static sanitizeHtml(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Extract mentions from message content
  static extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  // Validate UUID format
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Rate limiting validation
  static validateRateLimit(
    timestamps: number[],
    windowMs: number,
    maxRequests: number
  ): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Filter timestamps within the current window
    const recentTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    return {
      allowed: recentTimestamps.length < maxRequests,
      resetTime: recentTimestamps.length > 0 ? recentTimestamps[0] + windowMs : now
    };
  }
}