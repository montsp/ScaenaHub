import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { isIPad, isTouchDevice } from '../utils';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    adminKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  // Refs for form navigation
  const usernameRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const adminKeyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // iPad-specific keyboard handling
  useEffect(() => {
    if (!isIPad()) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleResize = () => {
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

  const calculatePasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else if (password.length >= 6) {
      feedback.push('8文字以上にするとより安全です');
    } else {
      feedback.push('6文字以上で入力してください');
    }

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('小文字を含めてください');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('大文字を含めてください');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('数字を含めてください');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('記号を含めるとより安全です');

    return { score, feedback };
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'ユーザー名を入力してください';
        if (value.length < 3) return 'ユーザー名は3文字以上で入力してください';
        if (value.length > 20) return 'ユーザー名は20文字以下で入力してください';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます';
        return '';
      case 'displayName':
        if (!value.trim()) return '表示名を入力してください';
        if (value.length < 2) return '表示名は2文字以上で入力してください';
        if (value.length > 50) return '表示名は50文字以下で入力してください';
        return '';
      case 'password':
        if (!value) return 'パスワードを入力してください';
        if (value.length < 6) return 'パスワードは6文字以上で入力してください';
        if (value.length > 128) return 'パスワードは128文字以下で入力してください';
        return '';
      case 'confirmPassword':
        if (!value) return 'パスワード確認を入力してください';
        if (value !== formData.password) return 'パスワードが一致しません';
        return '';
      case 'adminKey':
        if (!value.trim()) return '管理者キーを入力してください';
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

    // Update password strength for password field
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // Clear confirm password error when password changes
    if (name === 'password' && fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: '',
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
      await register({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
        adminKey: formData.adminKey,
      });
    } catch (err: any) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentField = e.currentTarget.name;
      switch (currentField) {
        case 'username':
          displayNameRef.current?.focus();
          break;
        case 'displayName':
          passwordRef.current?.focus();
          break;
        case 'password':
          confirmPasswordRef.current?.focus();
          break;
        case 'confirmPassword':
          adminKeyRef.current?.focus();
          break;
        case 'adminKey':
          handleSubmit(e as any);
          break;
      }
    }
  };

  const getPasswordStrengthColor = (score: number): string => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-yellow-500';
    if (score <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number): string => {
    if (score <= 1) return '弱い';
    if (score <= 2) return '普通';
    if (score <= 3) return '良い';
    return '強い';
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
            新規登録
          </h2>
          <p className="text-sm text-secondary-500">
            演劇プロジェクト用コミュニケーションアプリ
          </p>
        </div>

        {/* Register Form */}
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
              <p className="text-xs text-secondary-500 mt-1">
                英数字、ハイフン、アンダースコアのみ使用可能
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-secondary-700 mb-1">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                ref={displayNameRef}
                id="displayName"
                name="displayName"
                type="text"
                required
                value={formData.displayName}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`input-field ${fieldErrors.displayName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${isTouchDevice() ? 'text-base' : ''}`}
                placeholder="表示名を入力"
                disabled={isLoading}
                autoComplete="name"
              />
              {fieldErrors.displayName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.displayName}</p>
              )}
              <p className="text-xs text-secondary-500 mt-1">
                チャットで表示される名前です
              </p>
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
                  placeholder="パスワードを入力（6文字以上）"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-secondary-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-secondary-600">
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="mt-1 text-xs text-secondary-500 space-y-1">
                      {passwordStrength.feedback.slice(0, 2).map((feedback, index) => (
                        <li key={index}>• {feedback}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                パスワード確認 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={confirmPasswordRef}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className={`input-field pr-12 ${fieldErrors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${isTouchDevice() ? 'text-base' : ''}`}
                  placeholder="パスワードを再入力"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Admin Key */}
            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium text-secondary-700 mb-1">
                管理者キー <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={adminKeyRef}
                  id="adminKey"
                  name="adminKey"
                  type={showAdminKey ? 'text' : 'password'}
                  required
                  value={formData.adminKey}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className={`input-field pr-12 ${fieldErrors.adminKey ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${isTouchDevice() ? 'text-base' : ''}`}
                  placeholder="管理者キーを入力"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showAdminKey ? (
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
              {fieldErrors.adminKey && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.adminKey}</p>
              )}
              <p className="text-xs text-secondary-500 mt-1">
                ※ 管理者から提供されたキーを入力してください
              </p>
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
                  登録中...
                </>
              ) : (
                'アカウント作成'
              )}
            </button>
          </div>

          {/* Login link */}
          <div className="text-center">
            <p className="text-sm text-secondary-600">
              既にアカウントをお持ちの場合は{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
              >
                ログイン
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;