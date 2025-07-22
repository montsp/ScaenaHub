import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { isIPad, isTouchDevice } from '../utils';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Refs for iPad keyboard handling
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // iPad-specific keyboard handling
  useEffect(() => {
    if (!isIPad()) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT') {
        // Scroll the focused input into view on iPad
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleResize = () => {
      // Handle viewport changes when keyboard appears/disappears
      if (document.activeElement?.tagName === 'INPUT') {
        setTimeout(() => {
          (document.activeElement as HTMLInputElement).scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocus);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'ユーザー名を入力してください';
        if (value.length < 3) return 'ユーザー名は3文字以上で入力してください';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
        return '';
      case 'password':
        if (!value) return 'パスワードを入力してください';
        if (value.length < 6) return 'パスワードは6文字以上で入力してください';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    if (fieldError) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const fieldError = validateField(key, value);
      if (fieldError) {
        errors[key] = fieldError;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      await login(formData);
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.currentTarget.name === 'username') {
        passwordRef.current?.focus();
      } else if (e.currentTarget.name === 'password') {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">
            ScaenaHub
          </h1>
          <h2 className="text-xl text-secondary-700 mb-2">
            ログイン
          </h2>
          <p className="text-sm text-secondary-500">
            演劇プロジェクト用コミュニケーションアプリ
          </p>
        </div>

        {/* Login Form */}
        <form ref={formRef} className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <input
                ref={usernameRef}
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`input-field ${fieldErrors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${isTouchDevice() ? 'text-base' : ''}`}
                placeholder="ユーザー名を入力"
                disabled={isLoading}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className={`input-field pr-12 ${fieldErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${isTouchDevice() ? 'text-base' : ''}`}
                  placeholder="パスワードを入力"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                {/* Show/Hide Password Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-fade-in">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || Object.keys(fieldErrors).some(key => fieldErrors[key])}
              className={`w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${isTouchDevice() ? 'min-h-[48px] text-base' : 'min-h-[44px]'} transition-all duration-200`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </div>

          {/* Register link */}
          <div className="text-center">
            <p className="text-sm text-secondary-600">
              アカウントをお持ちでない場合は{' '}
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
              >
                新規登録
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;