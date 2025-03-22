/**
 * Retry utility for handling retries of failed operations
 * This utility provides a configurable retry mechanism with exponential backoff
 */

import { logEvent, LogLevel, LogCategory } from "../services/logging.server.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,               // Maximum number of retry attempts
  initialDelay: 300,           // Initial delay in ms before first retry
  maxDelay: 5000,              // Maximum delay in ms between retries
  backoffFactor: 2,            // Exponential backoff factor
  retryableErrors: [],         // Array of error types or names that should be retried
  timeout: 30000,              // Overall timeout for all retries in ms
  onRetry: null,               // Callback function executed before each retry
  retryCondition: null         // Function to determine if an error should be retried
};

/**
 * Executes a function with configurable retry logic
 * 
 * @param {Function} fn - Function to execute with retry logic
 * @param {Object} config - Retry configuration
 * @returns {Promise<any>} - Result of the function or throws after max retries
 */
export async function withRetry(fn, config = {}) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let attempt = 0;
  let lastError;

  while (attempt <= retryConfig.maxRetries) {
    try {
      // If we've exceeded the overall timeout, stop retrying
      if (Date.now() - startTime > retryConfig.timeout) {
        throw new Error(`Operation timed out after ${retryConfig.timeout}ms`);
      }

      // Execute the function
      const result = await fn(attempt);
      
      // If successful, return the result
      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      // If we've reached the maximum number of retries, throw the error
      if (attempt > retryConfig.maxRetries) {
        break;
      }

      // Determine if we should retry this error
      const shouldRetry = shouldRetryError(error, retryConfig);
      if (!shouldRetry) {
        // This is not a retryable error, break out of the loop
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateBackoff(attempt, retryConfig);

      // Log the retry attempt
      await logEvent({
        message: `Retrying operation (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms due to: ${error.message}`,
        level: LogLevel.WARNING,
        category: LogCategory.SYSTEM,
        source: "retry.server.js",
        metadata: {
          attempt,
          delay,
          error: error.message,
          stack: error.stack
        }
      }).catch(console.error); // Don't let logging errors disrupt the retry

      // Execute onRetry callback if provided
      if (typeof retryConfig.onRetry === 'function') {
        try {
          await retryConfig.onRetry(error, attempt, delay);
        } catch (callbackError) {
          console.error("Error in retry callback:", callbackError);
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we got here, all retries failed
  throw lastError;
}

/**
 * Determines if an error should be retried based on config
 */
function shouldRetryError(error, config) {
  // If a custom retry condition function is provided, use it
  if (typeof config.retryCondition === 'function') {
    return config.retryCondition(error);
  }

  // Check if error is in the retryable errors list
  if (config.retryableErrors && config.retryableErrors.length > 0) {
    // Check by error name or type
    return config.retryableErrors.some(errType => {
      if (typeof errType === 'string') {
        return error.name === errType || error.message.includes(errType);
      }
      return error instanceof errType;
    });
  }

  // By default, retry network and timeout errors
  return (
    error.name === 'NetworkError' ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.message.includes('timeout') ||
    error.message.includes('network') ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED' ||
    error.status === 429 || // Too Many Requests
    (error.status >= 500 && error.status < 600) // Server errors
  );
}

/**
 * Calculates backoff delay with exponential growth and jitter
 */
function calculateBackoff(attempt, config) {
  // Calculate exponential backoff
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
  
  // Add jitter (±20%) to prevent thundering herd problem
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  
  // Apply jitter and ensure we don't exceed the maximum delay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Creates a retryable version of any function
 * 
 * @param {Function} fn - Function to make retryable
 * @param {Object} config - Retry configuration
 * @returns {Function} - Retryable version of the function
 */
export function createRetryableFunction(fn, config = {}) {
  return (...args) => withRetry(() => fn(...args), config);
} 