import React, { useState, useEffect } from 'react';
import { Channel, Role, ApiResponse } from '../../types';
import { apiService } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';

const ChannelPermissions: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [channelsResponse, rolesResponse] = await Promise.all([
        apiService.getChannels(),
        apiService.getRoles()
      ]);

      if (channelsResponse.success && channelsResponse.data) {
        setChannels(channelsResponse.data);
      }

      if (rolesResponse.success && rolesResponse.data) {
        setRoles(rolesResponse.data);
      }
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const handleRoleToggle = async (roleId: string, checked: boolean) => {
    if (!selectedChannel) return;

    try {
      const updatedAllowedRoles = checked
        ? [...selectedChannel.allowedRoles, roleId]
        : selectedChannel.allowedRoles.filter(r => r !== roleId);

      const response = await apiService.updateChannel(selectedChannel.id, {
        allowedRoles: updatedAllowedRoles
      });

      if (response.success && response.data) {
        const updatedChannel = response.data;
        setChannels(channels.map(c => c.id === selectedChannel.id ? updatedChannel : c));
        setSelectedChannel(updatedChannel);
        setSuccess('チャンネル権限を更新しました');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'チャンネル権限の更新に失敗しました');
      }
    } catch (err) {
      setError('チャンネル権限の更新に失敗しました');
      console.error('Failed to update channel permissions:', err);
    }
  };

  const handleChannelTypeChange = async (type: 'public' | 'private') => {
    if (!selectedChannel) return;

    try {
      const response = await apiService.updateChannel(selectedChannel.id, { type });

      if (response.success && response.data) {
        const updatedChannel = response.data;
        setChannels(channels.map(c => c.id === selectedChannel.id ? updatedChannel : c));
        setSelectedChannel(updatedChannel);
        setSuccess('チャンネルタイプを更新しました');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'チャンネルタイプの更新に失敗しました');
      }
    } catch (err) {
      setError('チャンネルタイプの更新に失敗しました');
      console.error('Failed to update channel type:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            チャンネル権限設定
          </h3>

          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel List */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">チャンネル一覧</h4>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${selectedChannel?.id === channel.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          #{channel.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {channel.description || '説明なし'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${channel.type === 'public'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }
                          `}
                        >
                          {channel.type === 'public' ? '公開' : '非公開'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {channel.allowedRoles.length} ロール
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Settings */}
            <div>
              {selectedChannel ? (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    #{selectedChannel.name} の設定
                  </h4>

                  <div className="space-y-6">
                    {/* Channel Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        チャンネルタイプ
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="channelType"
                            value="public"
                            checked={selectedChannel.type === 'public'}
                            onChange={() => handleChannelTypeChange('public')}
                            className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            公開 - 全ユーザーが参加可能
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="channelType"
                            value="private"
                            checked={selectedChannel.type === 'private'}
                            onChange={() => handleChannelTypeChange('private')}
                            className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            非公開 - 指定されたロールのみ参加可能
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Role Permissions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        アクセス可能なロール
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {roles.map((role) => (
                          <label key={role.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedChannel.allowedRoles.includes(role.name)}
                              onChange={(e) => handleRoleToggle(role.name, e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {role.name}
                            </span>
                            {role.description && (
                              <span className="ml-2 text-xs text-gray-500">
                                - {role.description}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Channel Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        チャンネル情報
                      </h5>
                      <dl className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">作成者:</dt>
                          <dd className="text-gray-900">{selectedChannel.createdBy}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">作成日:</dt>
                          <dd className="text-gray-900">
                            {new Date(selectedChannel.createdAt).toLocaleDateString('ja-JP')}
                          </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">最終更新:</dt>
                          <dd className="text-gray-900">
                            {new Date(selectedChannel.updatedAt).toLocaleDateString('ja-JP')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M7 8v10a2 2 0 002 2h6a2 2 0 002-2V8"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      チャンネルを選択してください
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      左側のリストからチャンネルを選択して権限を設定します
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelPermissions;