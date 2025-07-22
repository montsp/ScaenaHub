// User types
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  displayName: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  channelPermissions: Record<string, any>; // Consider a more specific type
  createdAt: Date;
  updatedAt: Date;
}

// Channel types
export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  allowedRoles: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: 'text' | 'file' | 'system';
  threadId?: string;
  parentMessageId?: string;
  mentions: string[];
  reactions: Reaction[];
  attachments: Attachment[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  googleDriveId: string;
  url: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName: string;
  adminKey: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

// Database types
export interface DatabaseStatus {
  connected: boolean;
  provider: string;
  timestamp: string;
}

// Script types
export interface ScriptElement {
  type: 'character' | 'dialogue' | 'stage_direction' | 'scene_header' | 'act_header' | 'text';
  content: string;
  character?: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
}

export interface ScriptScene {
  id: string;
  title: string;
  elements: ScriptElement[];
}

export interface ScriptAct {
  id: string;
  title: string;
  scenes: ScriptScene[];
}

export interface Script {
  id: string;
  title: string;
  lastUpdated: Date;
  acts: ScriptAct[];
  metadata?: {
    author?: string;
    version?: string;
    notes?: string;
  };
}