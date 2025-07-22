import { useState, useCallback, useEffect } from 'react';
import { 
  ValidationRules, 
  ValidationErrors, 
  validateForm, 
  validateField 
} from '../utils/validation';

interface UseFormValidationOptions {
  initialValues: Record<string, string>;
  validationRules: ValidationRules;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface UseFormValidationReturn {
  values: Record<string, string>;
  errors: ValidationErrors;
  isValid: boolean;
  isValidating: boolean;
  setValue: (name: string, value: string) => void;
  setValues: (values: Record<string, string>) => void;
  setError: (name: string, error: string) => void;
  clearError: (name: string) => void;
  clearAllErrors: () => void;
  validateField: (name: string) => string;
  validateForm: () => ValidationErrors;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  reset: () => void;
}

export const useFormValidation = ({
  initialValues,
  validationRules,
  validateOnChange = false,
  validateOnBlur = true,
  debounceMs = 300,
}: UseFormValidationOptions): UseFormValidationReturn => {
  const [values, setValuesState] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const debouncedValidate = useCallback(
    (valuesToValidate: Record<string, string>, fieldName?: string) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      setIsValidating(true);
      
      const timeout = setTimeout(() => {
        if (fieldName) {
          // Validate single field
          const rule = validationRules[fieldName];
          if (rule) {
            const error = validateField(fieldName, valuesToValidate[fieldName] || '', rule, valuesToValidate);
            setErrors(prev => ({
              ...prev,
              [fieldName]: error,
            }));
          }
        } else {
          // Validate all fields
          const newErrors = validateForm(valuesToValidate, validationRules);
          setErrors(newErrors);
        }
        setIsValidating(false);
      }, debounceMs);

      setDebounceTimeout(timeout);
    },
    [validationRules, debounceMs, debounceTimeout]
  );

  // Set single value
  const setValue = useCallback(
    (name: string, value: string) => {
      const newValues = { ...values, [name]: value };
      setValuesState(newValues);

      if (validateOnChange) {
        debouncedValidate(newValues, name);
      } else if (errors[name]) {
        // Clear error if field was previously invalid
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    },
    [values, validateOnChange, debouncedValidate, errors]
  );

  // Set multiple values
  const setValues = useCallback(
    (newValues: Record<string, string>) => {
      setValuesState(newValues);
      if (validateOnChange) {
        debouncedValidate(newValues);
      }
    },
    [validateOnChange, debouncedValidate]
  );

  // Set error for specific field
  const setError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Clear error for specific field
  const clearError = useCallback((name: string) => {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Validate single field
  const validateSingleField = useCallback(
    (name: string): string => {
      const rule = validationRules[name];
      if (!rule) return '';

      const error = validateField(name, values[name] || '', rule, values);
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    },
    [values, validationRules]
  );

  // Validate entire form
  const validateEntireForm = useCallback((): ValidationErrors => {
    const newErrors = validateForm(values, validationRules);
    setErrors(newErrors);
    return newErrors;
  }, [values, validationRules]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setValue(name, value);
    },
    [setValue]
  );

  // Handle input blur
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name } = e.target;
      if (validateOnBlur) {
        validateSingleField(name);
      }
    },
    [validateOnBlur, validateSingleField]
  );

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setIsValidating(false);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      setDebounceTimeout(null);
    }
  }, [initialValues, debounceTimeout]);

  // Calculate if form is valid
  const isValid = Object.keys(errors).every(key => !errors[key]) && 
                  Object.keys(validationRules).every(key => values[key]?.trim());

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    values,
    errors,
    isValid,
    isValidating,
    setValue,
    setValues,
    setError,
    clearError,
    clearAllErrors,
    validateField: validateSingleField,
    validateForm: validateEntireForm,
    handleChange,
    handleBlur,
    reset,
  };
};

export default useFormValidation;