import React, { useState, useEffect } from 'react';
import { Role, ApiResponse } from '../../types';
import { apiService } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import ConfirmDialog from '../ConfirmDialog';

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const defaultPermissions = {
    'message.create': false,
    'message.edit': false,
    'message.delete': false,
    'channel.create': false,
    'channel.edit': false,
    'channel.delete': false,
    'user.manage': false,
    'role.manage': false,
    'system.admin': false,
  };

  const defaultChannelPermissions = {
    default: {
      read: false,
      write: false,
      manage: false,
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRoles();
      
      if (response.success && response.data) {
        setRoles(response.data);
      } else {
        setError(response.error || 'ロールの読み込みに失敗しました');
      }
    } catch (err) {
      setError('ロールの読み込みに失敗しました');
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole({
      id: '',
      name: '',
      description: '',
      permissions: { ...defaultPermissions },
      channelPermissions: { ...defaultChannelPermissions },
      createdAt: '',
      updatedAt: '',
    });
    setShowCreateForm(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setShowCreateForm(false);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;

    try {
      let response: ApiResponse<Role>;
      
      if (showCreateForm) {
        response = await apiService.createRole({
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions,
          channelPermissions: editingRole.channelPermissions,
        });
      } else {
        response = await apiService.updateRole(editingRole.id, {
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions,
          channelPermissions: editingRole.channelPermissions,
        });
      }

      if (response.success) {
        if (showCreateForm) {
          setRoles([...roles, response.data!]);
          setSuccess('ロールを作成しました');
        } else {
          setRoles(roles.map(r => r.id === editingRole.id ? response.data! : r));
          setSuccess('ロールを更新しました');
        }
        setEditingRole(null);
        setShowCreateForm(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'ロールの保存に失敗しました');
      }
    } catch (err) {
      setError('ロールの保存に失敗しました');
      console.error('Failed to save role:', err);
    }
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowConfirmDialog(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const response = await apiService.deleteRole(roleToDelete.id);
      
      if (response.success) {
        setRoles(roles.filter(r => r.id !== roleToDelete.id));
        setSuccess('ロールを削除しました');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'ロールの削除に失敗しました');
      }
    } catch (err) {
      setError('ロールの削除に失敗しました');
      console.error('Failed to delete role:', err);
    } finally {
      setShowConfirmDialog(false);
      setRoleToDelete(null);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (!editingRole) return;

    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        [permission]: checked,
      },
    });
  };

  const handleChannelPermissionChange = (permissionType: 'read' | 'write' | 'manage', checked: boolean) => {
    if (!editingRole) return;

    setEditingRole({
      ...editingRole,
      channelPermissions: {
        ...editingRole.channelPermissions,
        default: {
          ...editingRole.channelPermissions.default,
          [permissionType]: checked,
        },
      },
    });
  };

  const permissionLabels = {
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              ロール管理
            </h3>
            <button
              onClick={handleCreateRole}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              新しいロール作成
            </button>
          </div>

          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    権限数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {role.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {role.description || '説明なし'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {Object.values(role.permissions).filter(Boolean).length} / {Object.keys(role.permissions).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit/Create Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {showCreateForm ? 'ロール作成' : 'ロール編集'}
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ロール名
                    </label>
                    <input
                      type="text"
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({
                        ...editingRole,
                        name: e.target.value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      説明
                    </label>
                    <textarea
                      value={editingRole.description || ''}
                      onChange={(e) => setEditingRole({
                        ...editingRole,
                        description: e.target.value
                      })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">システム権限</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingRole.permissions[key] || false}
                          onChange={(e) => handlePermissionChange(key, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">デフォルトチャンネル権限</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingRole.channelPermissions.default.read}
                        onChange={(e) => handleChannelPermissionChange('read', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">読み取り</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingRole.channelPermissions.default.write}
                        onChange={(e) => handleChannelPermissionChange('write', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">書き込み</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingRole.channelPermissions.default.manage}
                        onChange={(e) => handleChannelPermissionChange('manage', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">管理</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingRole(null);
                    setShowCreateForm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  {showCreateForm ? '作成' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="ロール削除"
        message={`ロール「${roleToDelete?.name}」を削除しますか？この操作は取り消せません。`}
        confirmText="削除"
        onConfirm={confirmDeleteRole}
        onCancel={() => {
          setShowConfirmDialog(false);
          setRoleToDelete(null);
        }}
      />
    </div>
  );
};

export default RoleManagement;