import React, { useState, useEffect } from 'react';
import { Channel } from '../../types';
import { useApi } from '../../hooks/useApi';
import { apiService } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channel: Channel) => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  className?: string;
}

const ChannelList: React.FC<ChannelListProps> = ({
  selectedChannelId,
  onChannelSelect,
  onToggleSidebar,
  sidebarCollapsed = false,
  className = '',
}) => {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  const {
    data: channelsData,
    loading: channelsLoading,
    error: channelsError,
    execute: fetchChannels,
  } = useApi(apiService.getChannels);

  const {
    loading: createLoading,
    execute: createChannel,
  } = useApi(apiService.createChannel);

  // Load channels on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Update local channels when data changes
  useEffect(() => {
    if (channelsData) {
      setChannels(channelsData);
    }
  }, [channelsData]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const newChannel = await createChannel({
        name: newChannelName.trim(),
        type: 'public',
        description: '',
      });

      if (newChannel) {
        setChannels(prev => [...prev, newChannel]);
        setNewChannelName('');
        setIsCreating(false);
        onChannelSelect(newChannel);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const getChannelIcon = (channel: Channel) => {
    return channel.type === 'private' ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ) : (
      <span className="text-secondary-500">#</span>
    );
  };

  const canCreateChannels = (user?.roles || []).includes('admin') || (user?.roles || []).includes('moderator');

  if (channelsLoading && channels.length === 0) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Channels Header */}
      <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-secondary-800">チャンネル</h2>
        {canCreateChannels && (
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 text-secondary-500 hover:text-secondary-700 transition-colors duration-200"
            title="新しいチャンネルを作成"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </div>

      {/* Channel Creation Form */}
      {isCreating && (
        <div className="p-4 border-b border-secondary-200 bg-secondary-50">
          <form onSubmit={handleCreateChannel} className="space-y-2">
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="チャンネル名を入力"
              className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              disabled={createLoading}
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={createLoading || !newChannelName.trim()}
                className="flex-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {createLoading ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewChannelName('');
                }}
                className="px-3 py-1 text-sm text-secondary-600 border border-secondary-300 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
                disabled={createLoading}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-4">
        {channelsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            チャンネルの読み込みに失敗しました
          </div>
        )}

        <div className="space-y-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel)}
              className={`w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                selectedChannelId === channel.id
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'hover:bg-secondary-100 text-secondary-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                {getChannelIcon(channel)}
                <span className="font-medium truncate">{channel.name}</span>
              </div>
              {channel.description && (
                <p className="text-xs text-secondary-500 mt-1 truncate">
                  {channel.description}
                </p>
              )}
            </button>
          ))}

          {channels.length === 0 && !channelsLoading && (
            <div className="text-center py-8 text-secondary-500">
              <svg className="h-12 w-12 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">チャンネルがありません</p>
              {canCreateChannels && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  最初のチャンネルを作成
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="p-4 border-t border-secondary-200">
        <button
          onClick={() => fetchChannels()}
          disabled={channelsLoading}
          className="w-full p-2 text-sm text-secondary-600 hover:text-secondary-800 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50 mb-3"
        >
          {channelsLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              更新中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新
            </div>
          )}
        </button>

        {/* User Info Footer */}
        <div className="p-3 bg-primary-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-800 truncate">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-secondary-500">
                  ScaenaHub
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1 text-secondary-500 hover:text-red-600 transition-colors duration-200"
              title="ログアウト"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelList;