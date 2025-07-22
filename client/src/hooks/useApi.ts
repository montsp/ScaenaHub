import { useState, useCallback } from 'react';
import { ApiResponse } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);
        
        if (response.success && response.data) {
          setState({
            data: response.data,
            loading: false,
            error: null,
          });
          return response.data;
        } else {
          const errorMessage = response.error || 'API call failed';
          setState({
            data: null,
            loading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'API call failed';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for API calls that don't return data
export function useApiAction(
  apiFunction: (...args: any[]) => Promise<ApiResponse>
): Omit<UseApiReturn<void>, 'data'> {
  const [state, setState] = useState<Omit<UseApiState<void>, 'data'>>({
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<void> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);
        
        if (response.success) {
          setState({
            loading: false,
            error: null,
          });
        } else {
          const errorMessage = response.error || 'API call failed';
          setState({
            loading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'API call failed';
        setState({
          loading: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useApi;