// Form validation utilities for authentication

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\-\+\(\)\s]+$/,
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field}を入力してください`,
  MIN_LENGTH: (field: string, min: number) => `${field}は${min}文字以上で入力してください`,
  MAX_LENGTH: (field: string, max: number) => `${field}は${max}文字以下で入力してください`,
  PATTERN_MISMATCH: (field: string) => `${field}の形式が正しくありません`,
  USERNAME_INVALID: 'ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます',
  EMAIL_INVALID: 'メールアドレスの形式が正しくありません',
  PASSWORD_WEAK: 'パスワードは6文字以上で入力してください',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
} as const;

// Field display names for Japanese
export const FIELD_NAMES = {
  username: 'ユーザー名',
  displayName: '表示名',
  email: 'メールアドレス',
  password: 'パスワード',
  confirmPassword: 'パスワード確認',
  adminKey: '管理者キー',
  currentPassword: '現在のパスワード',
  newPassword: '新しいパスワード',
} as const;

// Validate a single field
export const validateField = (
  fieldName: string,
  value: string,
  rule: ValidationRule,
  allValues?: Record<string, string>
): string => {
  const fieldDisplayName = FIELD_NAMES[fieldName as keyof typeof FIELD_NAMES] || fieldName;

  // Required validation
  if (rule.required && !value.trim()) {
    return VALIDATION_MESSAGES.REQUIRED(fieldDisplayName);
  }

  // Skip other validations if field is empty and not required
  if (!value.trim() && !rule.required) {
    return '';
  }

  // Min length validation
  if (rule.minLength && value.length < rule.minLength) {
    return VALIDATION_MESSAGES.MIN_LENGTH(fieldDisplayName, rule.minLength);
  }

  // Max length validation
  if (rule.maxLength && value.length > rule.maxLength) {
    return VALIDATION_MESSAGES.MAX_LENGTH(fieldDisplayName, rule.maxLength);
  }

  // Pattern validation
  if (rule.pattern && !rule.pattern.test(value)) {
    // Special cases for common patterns
    if (rule.pattern === VALIDATION_PATTERNS.USERNAME) {
      return VALIDATION_MESSAGES.USERNAME_INVALID;
    }
    if (rule.pattern === VALIDATION_PATTERNS.EMAIL) {
      return VALIDATION_MESSAGES.EMAIL_INVALID;
    }
    return VALIDATION_MESSAGES.PATTERN_MISMATCH(fieldDisplayName);
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      return customError;
    }
  }

  return '';
};

// Validate multiple fields
export const validateForm = (
  values: Record<string, string>,
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.entries(rules).forEach(([fieldName, rule]) => {
    const value = values[fieldName] || '';
    const error = validateField(fieldName, value, rule, values);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

// Common validation rules for authentication forms
export const AUTH_VALIDATION_RULES: ValidationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: VALIDATION_PATTERNS.USERNAME,
  },
  displayName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 128,
  },
  confirmPassword: {
    required: true,
    custom: (value: string) => {
      // This will be handled by the component since it needs access to the password field
      return null;
    },
  },
  adminKey: {
    required: true,
  },
};

// Password strength calculation
export interface PasswordStrength {
  score: number; // 0-5
  feedback: string[];
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, feedback: ['パスワードを入力してください'], level: 'very-weak' };
  }

  // Length check
  if (password.length >= 12) {
    score += 2;
  } else if (password.length >= 8) {
    score += 1;
  } else if (password.length >= 6) {
    feedback.push('8文字以上にするとより安全です');
  } else {
    feedback.push('6文字以上で入力してください');
    return { score: 0, feedback, level: 'very-weak' };
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('小文字を含めてください');
  }

  if (/[A-Z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('大文字を含めてください');
  }

  if (/[0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('数字を含めてください');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('記号を含めるとより安全です');
  }

  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('同じ文字の繰り返しは避けてください');
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    score -= 1;
    feedback.push('一般的なパターンは避けてください');
  }

  // Determine level
  let level: PasswordStrength['level'];
  if (score <= 1) {
    level = 'very-weak';
  } else if (score <= 2) {
    level = 'weak';
  } else if (score <= 3) {
    level = 'fair';
  } else if (score <= 4) {
    level = 'good';
  } else {
    level = 'strong';
  }

  return {
    score: Math.max(0, Math.min(5, Math.round(score))),
    feedback: feedback.slice(0, 3), // Limit feedback to 3 items
    level,
  };
};

// Get password strength color for UI
export const getPasswordStrengthColor = (level: PasswordStrength['level']): string => {
  switch (level) {
    case 'very-weak':
      return 'bg-red-500';
    case 'weak':
      return 'bg-orange-500';
    case 'fair':
      return 'bg-yellow-500';
    case 'good':
      return 'bg-blue-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
};

// Get password strength text for UI
export const getPasswordStrengthText = (level: PasswordStrength['level']): string => {
  switch (level) {
    case 'very-weak':
      return '非常に弱い';
    case 'weak':
      return '弱い';
    case 'fair':
      return '普通';
    case 'good':
      return '良い';
    case 'strong':
      return '強い';
    default:
      return '';
  }
};

// Real-time validation debouncer
export const createDebouncedValidator = (
  callback: (errors: ValidationErrors) => void,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;

  return (values: Record<string, string>, rules: ValidationRules) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const errors = validateForm(values, rules);
      callback(errors);
    }, delay);
  };
};