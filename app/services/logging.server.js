/**
 * logging.server.js - Comprehensive logging service for SkuSight
 * 
 * This service provides structured logging for all app events, with
 * particular focus on webhook and cron job events.
 */

import db from "../db.server";

// Severity levels
export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
};

// Event categories
export const LogCategory = {
  WEBHOOK: "webhook",
  CRON: "cron",
  AUTH: "auth",
  API: "api",
  DATABASE: "database",
  APP: "app",
  SYSTEM: "system"
};

/**
 * Log an event with structured information
 * 
 * @param {Object} options - Logging options
 * @param {string} options.message - The log message
 * @param {string} options.level - Severity level from LogLevel enum
 * @param {string} options.category - Event category from LogCategory enum
 * @param {string} options.shop - The Shopify store domain
 * @param {string} options.source - Source identifier (route, webhook, job name)
 * @param {string} options.correlationId - Identifier to correlate related events
 * @param {Object} options.metadata - Additional structured data for the log entry
 * @param {Error} options.error - Error object if this is an error log
 * @param {Object} options.request - Request object for additional context
 * @returns {Promise<Object>} - The created log entry
 */
export async function logEvent({
  message,
  level = LogLevel.INFO,
  category = LogCategory.APP,
  shop = null,
  source = null,
  correlationId = null,
  metadata = {},
  error = null,
  request = null
}) {
  // Generate a unique log ID if no correlation ID is provided
  const logId = correlationId || generateLogId();
  
  // Extract useful information from the request if available
  const requestData = extractRequestData(request);
  
  // Prepare timestamp with high precision
  const timestamp = new Date();
  
  // Build the log entry
  const logEntry = {
    id: logId,
    timestamp,
    level,
    category,
    shop,
    source,
    message,
    metadata: enrichMetadata(metadata, requestData),
    stack: error?.stack || null
  };
  
  // Log to console with appropriate level
  outputToConsole(logEntry);
  
  // Save to database
  try {
    const savedLog = await saveToDatabase(logEntry);
    return savedLog;
  } catch (dbError) {
    // If database logging fails, at least log to console
    console.error("Failed to save log to database:", dbError);
    console.error("Original log entry:", logEntry);
    return logEntry;
  }
}

/**
 * Log a webhook event with relevant details
 * 
 * @param {Object} options - Webhook logging options
 * @param {string} options.shop - Shop domain
 * @param {string} options.webhookType - Type of webhook (e.g., product-update)
 * @param {string} options.message - Description of the event
 * @param {Object} options.payload - Webhook payload (sensitive data will be redacted)
 * @param {string} options.status - Status of webhook processing (received, processed, error)
 * @param {Object} options.metadata - Additional data
 * @param {Error} options.error - Error object if webhook processing failed
 * @returns {Promise<Object>} - The created log entry
 */
export async function logWebhook({
  shop,
  webhookType,
  message,
  payload,
  status = "received", // received, processed, error
  metadata = {},
  error = null
}) {
  // Generate a correlation ID based on the webhook type and timestamp
  // This helps track a webhook through its lifecycle
  const correlationId = `webhook-${webhookType}-${Date.now()}`;
  
  // Redact sensitive information from payload
  const safePayload = redactSensitiveData(payload);
  
  // Determine log level based on status
  const level = error ? LogLevel.ERROR : LogLevel.INFO;
  
  // Add webhook-specific metadata
  const webhookMetadata = {
    webhookType,
    status,
    payload: safePayload,
    processingTime: metadata.processingTime || null,
    ...metadata
  };
  
  return logEvent({
    message,
    level,
    category: LogCategory.WEBHOOK,
    shop,
    source: webhookType,
    correlationId,
    metadata: webhookMetadata,
    error
  });
}

/**
 * Log a cron job event with relevant details
 * 
 * @param {Object} options - Cron logging options
 * @param {string} options.shop - Shop domain (if applicable)
 * @param {string} options.jobType - Type of cron job
 * @param {string} options.jobId - Unique job identifier
 * @param {string} options.status - Status of the job (scheduled, started, completed, failed)
 * @param {string} options.message - Description of the event
 * @param {Object} options.metadata - Additional job metadata
 * @param {Error} options.error - Error object if job failed
 * @returns {Promise<Object>} - The created log entry
 */
export async function logCronJob({
  shop,
  jobType,
  jobId,
  status = "started", // scheduled, started, completed, failed
  message,
  metadata = {},
  error = null
}) {
  // Use jobId as correlationId to track the same job across multiple log entries
  const correlationId = jobId || `job-${jobType}-${Date.now()}`;
  
  // Determine log level based on status
  let level = LogLevel.INFO;
  if (status === "failed") {
    level = LogLevel.ERROR;
  } else if (status === "completed") {
    level = LogLevel.INFO;
  }
  
  // Add cron-specific metadata
  const cronMetadata = {
    jobType,
    jobId,
    status,
    startTime: metadata.startTime || null,
    endTime: metadata.endTime || null,
    duration: metadata.duration || null,
    ...metadata
  };
  
  return logEvent({
    message,
    level,
    category: LogCategory.CRON,
    shop,
    source: jobType,
    correlationId,
    metadata: cronMetadata,
    error
  });
}

/**
 * Save log entry to database
 * 
 * @param {Object} logEntry - Log entry to save
 * @returns {Promise<Object>} - The saved log entry
 */
async function saveToDatabase(logEntry) {
  try {
    // Convert metadata to string for storage
    const metadataString = JSON.stringify(logEntry.metadata);
    
    // Create the log record
    const dbLog = await db.appLog.create({
      data: {
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        category: logEntry.category,
        shop: logEntry.shop,
        source: logEntry.source,
        message: logEntry.message,
        metadata: metadataString,
        stack: logEntry.stack
      }
    });
    
    return dbLog;
  } catch (error) {
    // Don't throw here, just let the caller know there was an issue
    console.error("Database logging error:", error);
    return null;
  }
}

/**
 * Output log entry to console with appropriate formatting
 * 
 * @param {Object} logEntry - Log entry to output
 */
function outputToConsole(logEntry) {
  const timestamp = logEntry.timestamp.toISOString();
  const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}]`;
  
  // Choose console method based on log level
  let consoleMethod = console.log;
  switch (logEntry.level) {
    case LogLevel.DEBUG:
      consoleMethod = console.debug;
      break;
    case LogLevel.INFO:
      consoleMethod = console.info;
      break;
    case LogLevel.WARNING:
      consoleMethod = console.warn;
      break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      consoleMethod = console.error;
      break;
  }
  
  const shopInfo = logEntry.shop ? `[${logEntry.shop}]` : '';
  const sourceInfo = logEntry.source ? `[${logEntry.source}]` : '';
  
  // Log the message with prefix
  consoleMethod(`${prefix} ${shopInfo} ${sourceInfo} ${logEntry.message}`);
  
  // If this is an error log with a stack trace, log that too
  if (logEntry.stack && (logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL)) {
    consoleMethod(logEntry.stack);
  }
  
  // For debug level, also output the full metadata
  if (logEntry.level === LogLevel.DEBUG) {
    console.debug("Log metadata:", logEntry.metadata);
  }
}

/**
 * Generate a unique log ID
 * 
 * @returns {string} - A unique log ID
 */
function generateLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract useful information from request object
 * 
 * @param {Object} request - The request object
 * @returns {Object} - Extracted data
 */
function extractRequestData(request) {
  if (!request) return {};
  
  try {
    const url = request.url ? new URL(request.url) : null;
    
    return {
      method: request.method,
      url: url?.pathname || null,
      userAgent: request.headers?.get('user-agent') || null,
      ip: request.headers?.get('x-forwarded-for') || null,
      contentType: request.headers?.get('content-type') || null
    };
  } catch (error) {
    console.error("Error extracting request data:", error);
    return {};
  }
}

/**
 * Enrich log metadata with additional context
 * 
 * @param {Object} metadata - Original metadata
 * @param {Object} requestData - Data extracted from request
 * @returns {Object} - Enriched metadata
 */
function enrichMetadata(metadata, requestData) {
  return {
    ...metadata,
    request: requestData,
    environment: process.env.NODE_ENV || 'development',
    appVersion: process.env.APP_VERSION || '1.0.0',
    nodeVersion: process.version
  };
}

/**
 * Redact sensitive data from objects before logging
 * 
 * @param {Object} data - Data to redact
 * @returns {Object} - Redacted data
 */
function redactSensitiveData(data) {
  if (!data) return null;
  
  // Clone the data to avoid modifying the original
  const safeData = JSON.parse(JSON.stringify(data));
  
  // List of sensitive field names to redact
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'credit_card', 'card', 'cvv', 'cvc', 'ssn', 'sin',
    'social_insurance', 'social_security'
  ];
  
  // Recursively redact sensitive fields
  function redact(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        // Recursively check nested objects
        redact(obj[key]);
      }
    });
  }
  
  redact(safeData);
  return safeData;
}

/**
 * Get logs for a specific correlation ID
 * 
 * @param {string} correlationId - Correlation ID to search for
 * @returns {Promise<Array>} - Array of related log entries
 */
export async function getLogsByCorrelationId(correlationId) {
  try {
    const logs = await db.appLog.findMany({
      where: {
        id: correlationId
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
    
    return logs;
  } catch (error) {
    console.error(`Error fetching logs for correlation ID ${correlationId}:`, error);
    return [];
  }
}

/**
 * Get recent logs for a specific shop
 * 
 * @param {string} shop - Shop domain
 * @param {Object} options - Search options
 * @param {number} options.limit - Max number of logs to return
 * @param {string} options.level - Filter by log level
 * @param {string} options.category - Filter by category
 * @returns {Promise<Array>} - Array of log entries
 */
export async function getShopLogs(shop, { limit = 100, level = null, category = null } = {}) {
  try {
    const whereClause = {
      shop
    };
    
    if (level) whereClause.level = level;
    if (category) whereClause.category = category;
    
    const logs = await db.appLog.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return logs;
  } catch (error) {
    console.error(`Error fetching logs for shop ${shop}:`, error);
    return [];
  }
} 