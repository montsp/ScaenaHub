import React, { useState, useEffect } from 'react';
import { User, Role, ApiResponse } from '../types';
import { apiService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface UserProfileProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, isOpen, onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersResponse, rolesResponse] = await Promise.all([
        apiService.getUsers(),
        apiService.getRoles()
      ]);

      if (usersResponse.success && usersResponse.data) {
        const foundUser = usersResponse.data.find(u => u.id === userId);
        setUser(foundUser || null);
      }

      if (rolesResponse.success && rolesResponse.data) {
        setRoles(rolesResponse.data);
      }
    } catch (err) {
      setError('ユーザー情報の読み込みに失敗しました');
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDetails = (roleName: string) => {
    return roles.find(role => role.name === roleName);
  };

  const getRoleColor = (roleName: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    
    const index = roleName.length % colors.length;
    return colors[index];
  };

  const getPermissionLabel = (permission: string) => {
    const labels: { [key: string]: string } = {
      'message.create': 'メッセージ作成',
      'message.edit': 'メッセージ編集',
      'message.delete': 'メッセージ削除',
      'channel.create': 'チャンネル作成',
      'channel.edit': 'チャンネル編集',
      'channel.delete': 'チャンネル削除',
      'user.manage': 'ユーザー管理',
      'role.manage': 'ロール管理',
      'system.admin': 'システム管理',
    };
    return labels[permission] || permission;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            ユーザープロフィール
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {user && (
          <div className="space-y-6">
            {/* User Basic Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 text-xl font-medium">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-medium text-gray-900">
                    {user.displayName}
                  </h4>
                  <p className="text-gray-500">@{user.username}</p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">登録日</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">最終更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
            </div>

            {/* User Roles */}
            <div>
              <h5 className="text-md font-medium text-gray-900 mb-3">
                割り当てられたロール ({user.roles.length})
              </h5>
              {user.roles.length > 0 ? (
                <div className="space-y-3">
                  {user.roles.map((roleName) => {
                    const roleDetails = getRoleDetails(roleName);
                    return (
                      <div
                        key={roleName}
                        className={`border rounded-lg p-3 ${getRoleColor(roleName)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h6 className="font-medium">{roleName}</h6>
                            {roleDetails?.description && (
                              <p className="text-sm mt-1 opacity-75">
                                {roleDetails.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {roleDetails && (
                          <div className="mt-3">
                            <div className="text-sm font-medium opacity-75">権限:</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(roleDetails.permissions)
                                .filter(([_, hasPermission]) => hasPermission)
                                .map(([permission, _]) => (
                                  <span
                                    key={permission}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50"
                                  >
                                    {getPermissionLabel(permission)}
                                  </span>
                                ))}
                            </div>
                            
                            {/* Channel Permissions */}
                            <div className="mt-2">
                              <div className="text-sm font-medium opacity-75">チャンネル権限:</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {roleDetails.channelPermissions.default.read && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                                    読み取り
                                  </span>
                                )}
                                {roleDetails.channelPermissions.default.write && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                                    書き込み
                                  </span>
                                )}
                                {roleDetails.channelPermissions.default.manage && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                                    管理
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    ロールが割り当てられていません
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    このユーザーにはまだロールが設定されていません
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !user && !error && (
          <div className="text-center py-6">
            <p className="text-gray-500">ユーザーが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;