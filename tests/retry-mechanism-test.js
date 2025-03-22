/**
 * Test script for the retry mechanism
 * Run with: node tests/retry-mechanism-test.js
 */

const { withRetry, createRetryableFunction } = require('../app/utils/retry.server.js');

// Mock the logging function since we're running this outside the app context
jest.mock('../app/services/logging.server.js', () => ({
  logEvent: jest.fn().mockResolvedValue({}),
  LogLevel: { WARNING: 'WARNING' },
  LogCategory: { SYSTEM: 'SYSTEM' }
}));

// Test function that fails a certain number of times before succeeding
function createTestFunction(failCount) {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts <= failCount) {
      throw new Error(`Test failure ${attempts}/${failCount}`);
    }
    return `Success on attempt ${attempts}`;
  };
}

// Test the retry mechanism with various configurations
async function runTests() {
  console.log('=== Retry Mechanism Tests ===');
  
  // Test 1: Function that succeeds on the third try (within retry limit)
  try {
    console.log('\nTest 1: Function succeeds on the third try');
    const testFn = createTestFunction(2); // Fails twice, succeeds on third try
    const result = await withRetry(testFn, { 
      maxRetries: 3,
      initialDelay: 50, // Using small delays for testing
      onRetry: (err, attempt) => console.log(`  Retry ${attempt}: ${err.message}`)
    });
    console.log('  ✅ Result:', result);
  } catch (error) {
    console.error('  ❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Function that exceeds retry limit
  try {
    console.log('\nTest 2: Function exceeds retry limit (should fail)');
    const testFn = createTestFunction(5); // Fails 5 times
    const result = await withRetry(testFn, { 
      maxRetries: 3,
      initialDelay: 50,
      onRetry: (err, attempt) => console.log(`  Retry ${attempt}: ${err.message}`)
    });
    console.log('  ❌ Result (should not reach here):', result);
  } catch (error) {
    console.log('  ✅ Expected failure:', error.message);
  }
  
  // Test 3: Using retry condition
  try {
    console.log('\nTest 3: Using retry condition');
    let attempts = 0;
    const testFn = async () => {
      attempts++;
      if (attempts === 1) {
        const error = new Error('Network error');
        error.code = 'ECONNRESET';
        throw error;
      } else if (attempts === 2) {
        const error = new Error('Data validation error');
        error.type = 'ValidationError';
        throw error;
      }
      return 'Success';
    };
    
    const result = await withRetry(testFn, { 
      maxRetries: 3,
      initialDelay: 50,
      // Only retry network errors
      retryCondition: (err) => err.code === 'ECONNRESET',
      onRetry: (err, attempt) => console.log(`  Retry ${attempt}: ${err.message} (${err.code || 'No code'})`)
    });
    console.log('  ❌ Result (should not reach here):', result);
  } catch (error) {
    if (error.type === 'ValidationError') {
      console.log('  ✅ Correctly stopped retrying on validation error:', error.message);
    } else {
      console.error('  ❌ Test 3 failed with unexpected error:', error);
    }
  }
  
  // Test 4: Using retryable function creator
  try {
    console.log('\nTest 4: Using createRetryableFunction');
    const testFn = createTestFunction(2);
    const retryableFn = createRetryableFunction(testFn, {
      maxRetries: 3,
      initialDelay: 50,
      onRetry: (err, attempt) => console.log(`  Retry ${attempt}: ${err.message}`)
    });
    
    const result = await retryableFn();
    console.log('  ✅ Result:', result);
  } catch (error) {
    console.error('  ❌ Test 4 failed:', error.message);
  }
  
  console.log('\n=== Tests Complete ===');
}

// Run the tests
runTests().catch(console.error); 