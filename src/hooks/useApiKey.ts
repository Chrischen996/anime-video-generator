'use client';

import { useState, useCallback } from 'react';

interface ApiKeyValidationResult {
  isValid: boolean;
  message: string;
}

export const useApiKey = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ApiKeyValidationResult | null>(null);

  const validateApiKey = useCallback(async (): Promise<ApiKeyValidationResult> => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
      });

      const data = await response.json();
      
      const result: ApiKeyValidationResult = {
        isValid: data.valid,
        message: data.valid ? 'API key is valid' : data.error || 'Invalid API key',
      };

      setValidationResult(result);
      return result;

    } catch (error) {
      const result: ApiKeyValidationResult = {
        isValid: false,
        message: 'Failed to validate server environment. Please check your connection.',
      };
      
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const setApiKey = useCallback((_apiKey: string) => {
    setValidationResult(null);
  }, []);

  const clearApiKey = useCallback(() => {
    setValidationResult(null);
  }, []);

  const hasValidApiKey = useCallback((_model?: 'fal-ai' | 'doubao' | 'agnes'): boolean => {
    return true;
  }, []);

  const setDoubaoApiKey = useCallback((_apiKey: string) => {}, []);

  const setAgnesApiKey = useCallback((_apiKey: string) => {}, []);

  return {
    apiKey: '',
    doubaoApiKey: '',
    agnesApiKey: '',
    isValidating,
    validationResult,
    validateApiKey,
    setApiKey,
    setDoubaoApiKey,
    setAgnesApiKey,
    clearApiKey,
    hasValidApiKey,
  };
};
