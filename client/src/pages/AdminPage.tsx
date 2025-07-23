import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Navigate } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';
import RoleManagement from '../components/admin/RoleManagement';
import ChannelPermissions from '../components/admin/ChannelPermissions';
import SystemSettings from '../components/admin/SystemSettings';
import UserRoleList from '../components/admin/UserRoleList';
import UserAvatar from '../components/UserAvatar';

type AdminTab = 'users' | 'roles' | 'channels' | 'system' | 'user-roles';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { showProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Check if user has admin role
  const isAdmin = user?.roles.includes('admin') || user?.roles.includes('管理者');

  if (!isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  const tabs = [
    { id: 'users' as AdminTab, label: 'ユーザー管理', icon: '👥' },
    { id: 'roles' as AdminTab, label: 'ロール管理', icon: '🎭' },
    { id: 'channels' as AdminTab, label: 'チャンネル権限', icon: '📢' },
    { id: 'system' as AdminTab, label: 'システム設定', icon: '⚙️' },
    { id: 'user-roles' as AdminTab, label: 'ロール一覧', icon: '📋' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'channels':
        return <ChannelPermissions />;
      case 'system':
        return <SystemSettings />;
      case 'user-roles':
        return <UserRoleList />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理者画面</h1>
            <p className="text-gray-600 mt-1">システムの管理と設定を行います</p>
          </div>
          
          {user && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{user.displayName}</span>
              <UserAvatar 
                userId={user.id} 
                displayName={user.displayName} 
                size="sm" 
              />
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;