import React, { useState } from 'react';
import { apiService } from '../services/api';

interface FilePreviewProps {
  file: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  };
  onDelete?: (fileId: string) => void;
  canDelete?: boolean;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onDelete,
  canDelete = false,
  className = '',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): JSX.Element => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (mimeType.startsWith('video/')) {
      return (
        <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (mimeType === 'application/pdf') {
      return (
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (mimeType.includes('document') || mimeType.includes('word')) {
      return (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-6 w-6 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const handleDownload = async () => {
    try {
      console.log('📁 Downloading file:', file.id);
      const blob = await apiService.downloadFile(file.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ File downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      alert('ファイルのダウンロードに失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !onDelete) return;

    setIsDeleting(true);
    try {
      console.log('🗑️ Deleting file:', file.id);
      await apiService.deleteFile(file.id);
      onDelete(file.id);
      console.log('✅ File deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      alert('ファイルの削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');

  return (
    <div className={`bg-secondary-50 border border-secondary-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-3">
        {/* File Icon/Preview */}
        <div className="flex-shrink-0">
          {isImage ? (
            <div className="w-12 h-12 bg-secondary-200 rounded-lg overflow-hidden">
              <img
                src={file.url}
                alt={file.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center">
                {getFileIcon(file.mimeType)}
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-secondary-200 rounded-lg flex items-center justify-center">
              {getFileIcon(file.mimeType)}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {file.filename}
              </p>
              <p className="text-xs text-secondary-500">
                {formatFileSize(file.size)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                title="ダウンロード"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* Delete Button */}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="p-1 text-secondary-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
                  title="削除"
                >
                  {isDeleting ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Preview for images/videos */}
          {(isImage || isVideo) && (
            <div className="mt-2">
              {isImage ? (
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-w-full h-auto max-h-48 rounded cursor-pointer"
                  onClick={() => window.open(file.url, '_blank')}
                />
              ) : isVideo ? (
                <video
                  src={file.url}
                  controls
                  className="max-w-full h-auto max-h-48 rounded"
                  preload="metadata"
                >
                  お使いのブラウザは動画の再生に対応していません。
                </video>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 mb-2">
            このファイルを削除してもよろしいですか？
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              削除
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePreview;