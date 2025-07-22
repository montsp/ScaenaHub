import React, { useState, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface FileUploadProps {
  onFileUploaded?: (file: { id: string; filename: string; url: string; size: number }) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onError,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = '',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        onError?.(`ファイル "${file.name}" のサイズが大きすぎます（最大: ${Math.round(maxSize / 1024 / 1024)}MB）`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Initialize upload progress
    const initialUploads: UploadProgress[] = validFiles.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading',
    }));

    setUploads(prev => [...prev, ...initialUploads]);

    // Upload files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        console.log('📁 Uploading file:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);

        // Simulate progress (since we don't have real progress tracking)
        const uploadIndex = uploads.length + i;
        
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex 
            ? { ...upload, progress: 50 }
            : upload
        ));

        const response = await apiService.uploadFile(formData);
        
        if (response.success && response.data) {
          setUploads(prev => prev.map((upload, index) => 
            index === uploadIndex 
              ? { ...upload, progress: 100, status: 'success' }
              : upload
          ));

          onFileUploaded?.(response.data);
          console.log('✅ File uploaded successfully:', response.data);
        } else {
          throw new Error(response.error || 'Upload failed');
        }
      } catch (error) {
        console.error('❌ File upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
        
        setUploads(prev => prev.map((upload, index) => 
          index === uploads.length + i 
            ? { ...upload, status: 'error', error: errorMessage }
            : upload
        ));

        onError?.(errorMessage);
      }
    }

    // Clear completed uploads after 3 seconds
    setTimeout(() => {
      setUploads(prev => prev.filter(upload => upload.status === 'uploading'));
    }, 3000);
  }, [maxSize, onFileUploaded, onError, uploads.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={className}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        multiple
        disabled={disabled}
      />

      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-secondary-300 hover:border-primary-400 hover:bg-secondary-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center space-y-2">
          <svg 
            className={`h-8 w-8 ${isDragging ? 'text-primary-500' : 'text-secondary-400'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <div className="text-sm">
            <span className="font-medium text-primary-600">ファイルを選択</span>
            <span className="text-secondary-500"> またはドラッグ&ドロップ</span>
          </div>
          <p className="text-xs text-secondary-500">
            最大 {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploads.map((upload, index) => (
            <div key={index} className="bg-secondary-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-900 truncate">
                  {upload.filename}
                </span>
                <div className="flex items-center space-x-2">
                  {upload.status === 'uploading' && (
                    <LoadingSpinner size="sm" />
                  )}
                  {upload.status === 'success' && (
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {upload.status === 'error' && (
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              
              {upload.status === 'uploading' && (
                <div className="w-full bg-secondary-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              
              {upload.status === 'error' && upload.error && (
                <ErrorMessage message={upload.error} className="mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;