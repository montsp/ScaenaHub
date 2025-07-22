// App configuration
export const APP_NAME = 'ScaenaHub';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = '中学部演劇プロジェクト用Webコミュニケーションアプリ';

// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Message limits
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MENTIONS_PER_MESSAGE = 10;

// UI constants
export const SIDEBAR_WIDTH = 256; // 16rem in pixels
export const HEADER_HEIGHT = 64; // 4rem in pixels
export const MESSAGE_PAGE_SIZE = 50;
export const TYPING_TIMEOUT = 3000; // 3 seconds

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LAST_CHANNEL: 'last_channel',
  DRAFT_MESSAGES: 'draft_messages',
} as const;

// Socket events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  AUTH_ERROR: 'auth_error',
  
  // Channels
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  CHANNEL_NEW: 'channel:new',
  CHANNEL_UPDATED: 'channel:updated',
  CHANNEL_DELETED: 'channel:deleted',
  
  // Messages
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACTION_ADD: 'message:reaction:add',
  MESSAGE_REACTION_REMOVE: 'message:reaction:remove',
  MESSAGE_REACTION: 'message:reaction',
  
  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_TYPING: 'user:typing',
  
  // Users
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  
  // Notifications
  NOTIFICATION_MENTION: 'notification:mention',
  NOTIFICATION_SYSTEM: 'notification:system',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

// Channel types
export const CHANNEL_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  MENTION: 'mention',
  SYSTEM: 'system',
  BACKUP_FAILURE: 'backup_failure',
  BACKUP_SUCCESS: 'backup_success',
} as const;

// Common emoji for reactions
export const COMMON_EMOJI = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡',
  '🎭', '🎪', '🎨', '🎵', '🎬', '📝', '✨',
] as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  NOT_FOUND: 'リソースが見つかりません',
  SERVER_ERROR: 'サーバーエラーが発生しました',
  VALIDATION_ERROR: '入力内容に問題があります',
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます',
  INVALID_FILE_TYPE: 'サポートされていないファイル形式です',
  MESSAGE_TOO_LONG: 'メッセージが長すぎます',
  CONNECTION_LOST: '接続が切断されました',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'ログインしました',
  LOGOUT_SUCCESS: 'ログアウトしました',
  REGISTER_SUCCESS: 'アカウントを作成しました',
  MESSAGE_SENT: 'メッセージを送信しました',
  MESSAGE_UPDATED: 'メッセージを更新しました',
  MESSAGE_DELETED: 'メッセージを削除しました',
  CHANNEL_CREATED: 'チャンネルを作成しました',
  CHANNEL_UPDATED: 'チャンネルを更新しました',
  CHANNEL_DELETED: 'チャンネルを削除しました',
  FILE_UPLOADED: 'ファイルをアップロードしました',
  BACKUP_STARTED: 'バックアップを開始しました',
} as const;

// Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  NOTIFICATION: 1080,
} as const;