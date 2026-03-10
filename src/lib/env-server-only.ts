// This file contains server-only utilities for secure environment handling

/**
 * Server-only utilities for handling sensitive environment variables
 * 
 * SECURITY: This file should NEVER be imported by client-side code
 * All functions here are designed for server-side use only
 */

// Ensure this is only running on server-side
if (typeof window !== 'undefined') {
  throw new Error('SECURITY ERROR: Server-only utilities cannot be used on client-side');
}

import { getValidatedEnvConfig } from './env-validator';

/**
 * Get sanitized environment information for logging
 * Never includes actual values, only configuration status
 */
export function getEnvironmentStatus() {
  const envConfig = getValidatedEnvConfig();
  return {
    database: !!envConfig.DATABASE_URL,
    brla: !!envConfig.BRLA_EMAIL && !!envConfig.BRLA_PASSWORD,
    storage: !!envConfig.STORAGES3_BUCKET_NAME,
    admin: !!envConfig.ADMIN_EMAIL && !!envConfig.ADMIN_PASSWORD,
    thirdweb: !!process.env.THIRDWEB_ENGINE_URL,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate critical server configuration
 * Returns boolean status without exposing sensitive data
 */
export function validateServerConfiguration(): {
  isValid: boolean;
  missingServices: string[];
  timestamp: string;
} {
  const envConfig = getValidatedEnvConfig();
  const missing: string[] = [];
  
  if (!envConfig.DATABASE_URL) missing.push('database');
  if (!envConfig.BRLA_EMAIL || !envConfig.BRLA_PASSWORD) missing.push('payments');
  if (!envConfig.STORAGES3_BUCKET_NAME) missing.push('storage');
  if (!envConfig.ADMIN_EMAIL || !envConfig.ADMIN_PASSWORD) missing.push('admin');
  
  return {
    isValid: missing.length === 0,
    missingServices: missing,
    timestamp: new Date().toISOString()
  };
}

/**
 * Safe logging for server-side operations
 * Automatically sanitizes sensitive data
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const sanitizedData = data ? sanitizeLogData(data) : undefined;
  
  switch (level) {
    case 'info':
      console.log(`[SERVER] ${message}`, sanitizedData);
      break;
    case 'warn':
      console.warn(`[SERVER] ${message}`, sanitizedData);
      break;
    case 'error':
      console.error(`[SERVER] ${message}`, sanitizedData);
      break;
  }
}

/**
 * Sanitize data for logging by removing sensitive information
 */
function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'credential', 'auth',
    'DATABASE_URL', 'ADMIN_PASSWORD', 'ADMIN_EMAIL',
    'BRLA_PASSWORD', 'BRLA_EMAIL',
    'STORAGES3_SECRET_ACCESS_KEY', 'STORAGES3_ACCESS_KEY_ID',
    'THIRDWEB_ENGINE_ACCESS_TOKEN'
  ];
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}