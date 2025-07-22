import React, { useEffect } from 'react';

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ 
  message, 
  onDismiss, 
  autoHide = true,
  autoHideDelay = 5000,
  className = ''
}) => {
  useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  return (
    <div className={`bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm animate-fade-in ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{message}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-green-700 hover:opacity-70 transition-opacity duration-200"
            aria-label="成功メッセージを閉じる"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SuccessMessage;