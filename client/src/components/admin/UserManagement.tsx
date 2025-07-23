import React, { useState, useEffect } from 'react';
import { User, Role, ApiResponse } from '../../types';
import { apiService } from '../../services/api';
import { useProfile } from '../../contexts/ProfileContext';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import ConfirmDialog from '../ConfirmDialog';

const UserManagement: React.FC = () => {
  const { showProfile } = useProfile();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        apiService.getUsers(),
        apiService.getRoles()
      ]);

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
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

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const response = await apiService.updateUser(editingUser.id, {
        displayName: editingUser.displayName,
        roles: editingUser.roles
      });

      if (response.success) {
        setUsers(users.map(u => u.id === editingUser.id ? response.data! : u));
        setEditingUser(null);
        setSuccess('ユーザー情報を更新しました');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'ユーザー情報の更新に失敗しました');
      }
    } catch (err) {
      setError('ユーザー情報の更新に失敗しました');
      console.error('Failed to update user:', err);
    }
  };

  const handleToggleUserStatus = (user: User) => {
    setUserToToggle(user);
    setShowConfirmDialog(true);
  };

  const confirmToggleUserStatus = async () => {
    if (!userToToggle) return;

    try {
      const response = await apiService.updateUser(userToToggle.id, {
        isActive: !userToToggle.isActive
      });

      if (response.success) {
        setUsers(users.map(u => u.id === userToToggle.id ? response.data! : u));
        setSuccess(`ユーザーを${userToToggle.isActive ? '無効' : '有効'}にしました`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'ユーザーステータスの変更に失敗しました');
      }
    } catch (err) {
      setError('ユーザーステータスの変更に失敗しました');
      console.error('Failed to toggle user status:', err);
    } finally {
      setShowConfirmDialog(false);
      setUserToToggle(null);
    }
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (!editingUser) return;

    const updatedRoles = checked
      ? [...editingUser.roles, roleId]
      : editingUser.roles.filter(r => r !== roleId);

    setEditingUser({
      ...editingUser,
      roles: updatedRoles
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            ユーザー管理
          </h3>

          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div 
                            className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center cursor-pointer"
                            onClick={() => showProfile(user.id)}
                          >
                            <span className="text-primary-600 font-medium">
                              {user.displayName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:underline"
                            onClick={() => showProfile(user.id)}
                          >
                            {user.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`${
                          user.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.isActive ? '無効化' : '有効化'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ユーザー編集
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    表示名
                  </label>
                  <input
                    type="text"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      displayName: e.target.value
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ロール
                  </label>
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingUser.roles.includes(role.name)}
                          onChange={(e) => handleRoleChange(role.name, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="ユーザーステータス変更"
        message={`${userToToggle?.displayName}を${userToToggle?.isActive ? '無効' : '有効'}にしますか？`}
        confirmText={userToToggle?.isActive ? '無効化' : '有効化'}
        onConfirm={confirmToggleUserStatus}
        onCancel={() => {
          setShowConfirmDialog(false);
          setUserToToggle(null);
        }}
      />
    </div>
  );
};

export default UserManagement;