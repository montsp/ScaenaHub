-- ScaenaHub Database Schema
-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  roles TEXT[] DEFAULT ARRAY['member'], -- 複数ロール対応
  display_name VARCHAR(100) NOT NULL,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table with channel access permissions
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  channel_permissions JSONB DEFAULT '{}', -- チャンネル別アクセス権限
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'private')),
  allowed_roles TEXT[], -- このチャンネルにアクセス可能なロール
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'file', 'system')),
  thread_id UUID,
  parent_message_id UUID REFERENCES messages(id),
  mentions UUID[],
  reactions JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table for Google Drive integration
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  google_drive_id VARCHAR(255) UNIQUE NOT NULL,
  google_drive_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  channel_id UUID REFERENCES channels(id),
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup logs table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type VARCHAR(50) NOT NULL, -- 'google_drive', 'github'
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  file_path TEXT,
  file_size INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_allowed_roles ON channels USING GIN(allowed_roles);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_files_google_drive_id ON files(google_drive_id);

-- Insert default roles
INSERT INTO roles (name, description, permissions, channel_permissions) VALUES
('admin', '管理者', 
 '{"user_management": true, "channel_management": true, "system_settings": true, "backup_management": true}',
 '{"default": {"read": true, "write": true, "manage": true}}'
),
('moderator', 'モデレーター', 
 '{"channel_management": true, "message_moderation": true}',
 '{"default": {"read": true, "write": true, "manage": false}}'
),
('member', '一般メンバー', 
 '{"message_send": true, "file_upload": true}',
 '{"default": {"read": true, "write": true, "manage": false}}'
),
('viewer', '閲覧者', 
 '{"message_read": true}',
 '{"default": {"read": true, "write": false, "manage": false}}'
)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('admin_key', '"default_admin_key_change_me"', '管理者登録用キー'),
('max_file_size', '10485760', '最大ファイルサイズ（バイト）'),
('backup_schedule', '"0 2 * * *"', 'バックアップスケジュール（cron形式）'),
('google_sheets_id', '""', '台本用Google SheetsのID'),
('maintenance_mode', 'false', 'メンテナンスモード')
ON CONFLICT (key) DO NOTHING;

-- Create default general channel
INSERT INTO channels (name, description, type, allowed_roles, created_by) VALUES
('general', '一般チャット', 'public', ARRAY['admin', 'moderator', 'member'], 
 (SELECT id FROM users WHERE username = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();