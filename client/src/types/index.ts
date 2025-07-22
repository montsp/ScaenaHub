// User types
export interface User {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  displayName: string;
  adminKey: string;
}

// Channel types
export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  allowedRoles: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  editedAt?: string;
  createdAt: string;
  user?: User; // Populated user data
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

// Socket event types
export interface SocketEvents {
  // Message events
  'message:new': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (messageId: string) => void;
  'message:reaction': (messageId: string, reaction: Reaction) => void;
  
  // Channel events
  'channel:new': (channel: Channel) => void;
  'channel:updated': (channel: Channel) => void;
  'channel:deleted': (channelId: string) => void;
  
  // User events
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'user:typing': (channelId: string, userId: string) => void;
  
  // Notification events
  'notification:mention': (notification: Notification) => void;
  'notification:system': (notification: Notification) => void;
}

export interface Notification {
  id: string;
  type: 'mention' | 'system' | 'backup_failure' | 'backup_success';
  title: string;
  message: string;
  userId?: string;
  channelId?: string;
  messageId?: string;
  isRead: boolean;
  createdAt: string;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  channelPermissions: ChannelPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPermissions {
  default: ChannelPermission;
  [channelId: string]: ChannelPermission;
}

export interface ChannelPermission {
  read: boolean;
  write: boolean;
  manage: boolean;
}