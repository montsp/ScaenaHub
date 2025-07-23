import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';

interface BackupStatus {
  lastBackup?: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
}

const SystemSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ status: 'idle' });
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      const response = await apiService.getBackupStatus();
      if (response.success && response.data) {
        setBackupStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to load backup status:', err);
    }
  };

  const handleManualBackup = async (method: 'google_drive' | 'github' | 'both') => {
    try {
      setBackupLoading(true);
      setError(null);
      
      const response = await apiService.triggerBackup(method);
      
      if (response.success) {
        setSuccess(`${method === 'both' ? '全ての' : method === 'google_drive' ? 'Google Drive' : 'GitHub'}バックアップを開始しました`);
        setTimeout(() => setSuccess(null), 5000);
        
        // Reload backup status after a delay
        setTimeout(() => {
          loadBackupStatus();
        }, 2000);
      } else {
        setError(response.error || 'バックアップの開始に失敗しました');
      }
    } catch (err) {
      setError('バックアップの開始に失敗しました');
      console.error('Failed to trigger backup:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-yellow-600 bg-yellow-100';
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '実行中';
      case 'success':
        return '成功';
      case 'error':
        return 'エラー';
      default:
        return '待機中';
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            バックアップ管理
          </h3>

          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

          <div className="space-y-6">
            {/* Backup Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">バックアップ状況</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backupStatus.status)}`}
                    >
                      {getStatusText(backupStatus.status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">最終バックアップ</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {backupStatus.lastBackup
                      ? new Date(backupStatus.lastBackup).toLocaleString('ja-JP')
                      : '未実行'
                    }
                  </dd>
                </div>
                {backupStatus.message && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">メッセージ</dt>
                    <dd className="mt-1 text-sm text-gray-900">{backupStatus.message}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Manual Backup Controls */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">手動バックアップ</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  onClick={() => handleManualBackup('google_drive')}
                  disabled={backupLoading}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                      </svg>
                      Google Drive
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleManualBackup('github')}
                  disabled={backupLoading}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleManualBackup('both')}
                  disabled={backupLoading}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                      </svg>
                      両方実行
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                データベースの内容をGoogle DriveまたはGitHubにバックアップします。
              </p>
            </div>

            {/* Backup Schedule Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    自動バックアップについて
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      システムは毎日午前3時に自動的にバックアップを実行します。
                      バックアップが失敗した場合は、管理者に通知が送信されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            システム情報
          </h3>
          
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">アプリケーション名</dt>
              <dd className="mt-1 text-sm text-gray-900">ScaenaHub</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">バージョン</dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">環境</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {process.env.NODE_ENV === 'production' ? '本番環境' : '開発環境'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">データベース</dt>
              <dd className="mt-1 text-sm text-gray-900">Supabase (PostgreSQL)</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            セキュリティ設定
          </h3>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    セキュリティ機能
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>JWT認証によるセッション管理</li>
                      <li>ロールベースアクセス制御 (RBAC)</li>
                      <li>レート制限による不正アクセス防止</li>
                      <li>CORS設定によるクロスオリジン制御</li>
                      <li>入力サニタイゼーションとXSS対策</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;