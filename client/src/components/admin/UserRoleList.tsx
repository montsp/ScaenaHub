import React, { useState, useEffect } from 'react';
import { User, Role, ApiResponse } from '../../types';
import { apiService } from '../../services/api';
import { useProfile } from '../../contexts/ProfileContext';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

const UserRoleList: React.FC = () => {
  const { showProfile } = useProfile();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole);
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (roleName: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    
    const index = roleName.length % colors.length;
    return colors[index];
  };

  const getUsersByRole = () => {
    const roleGroups: { [key: string]: User[] } = {};
    
    roles.forEach(role => {
      roleGroups[role.name] = users.filter(user => user.roles.includes(role.name));
    });
    
    // Add users without roles
    const usersWithoutRoles = users.filter(user => user.roles.length === 0);
    if (usersWithoutRoles.length > 0) {
      roleGroups['ロールなし'] = usersWithoutRoles;
    }
    
    return roleGroups;
  };

  if (loading) return <LoadingSpinner />;

  const roleGroups = getUsersByRole();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              ユーザーロール一覧
            </h3>
            <div className="text-sm text-gray-500">
              総ユーザー数: {users.length}人
            </div>
          </div>

          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

          {/* Search and Filter */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                ユーザー検索
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="名前またはユーザー名で検索..."
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700">
                ロールフィルター
              </label>
              <select
                id="role-filter"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">すべてのロール</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User List View */}
          {searchTerm || selectedRole !== 'all' ? (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
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
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ロールなし
                            </span>
                          )}
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
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      該当するユーザーが見つかりません
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      検索条件を変更してください
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Role Group View */
            <div className="space-y-6">
              {Object.entries(roleGroups).map(([roleName, roleUsers]) => (
                <div key={roleName} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${getRoleColor(roleName)}`}>
                        {roleName}
                      </span>
                      ({roleUsers.length}人)
                    </h4>
                  </div>
                  
                  {roleUsers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {roleUsers.map((user) => (
                        <div
                          key={user.id}
                          className="bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div 
                                className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center cursor-pointer"
                                onClick={() => showProfile(user.id)}
                              >
                                <span className="text-primary-600 text-sm font-medium">
                                  {user.displayName.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <div 
                                className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:underline"
                                onClick={() => showProfile(user.id)}
                              >
                                {user.displayName}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                @{user.username}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <span
                                className={`inline-flex items-center w-2 h-2 rounded-full ${
                                  user.isActive ? 'bg-green-400' : 'bg-red-400'
                                }`}
                                title={user.isActive ? '有効' : '無効'}
                              />
                            </div>
                          </div>
                          
                          {user.roles.length > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {user.roles.filter(role => role !== roleName).map((role) => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        このロールに割り当てられたユーザーはいません
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRoleList;