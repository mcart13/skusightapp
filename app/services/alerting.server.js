/**
 * alerting.server.js - Alerting service for SkuSight
 * 
 * This service handles alerting for critical errors and performance issues
 * in the application. It supports multiple notification channels and
 * can be configured via environment variables or database settings.
 */

import { LogLevel, LogCategory, logEvent } from "./logging.server.js";
import db from "../db.server";

// Alert severity levels
export const AlertLevel = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
};

// Alert channels
export const AlertChannel = {
  EMAIL: "email",
  SLACK: "slack",
  CONSOLE: "console"
};

// Performance thresholds (in milliseconds)
export const PerformanceThresholds = {
  TAGGING_JOB: 60000, // 1 minute
  API_REQUEST: 5000,   // 5 seconds
  WEBHOOK_PROCESSING: 10000 // 10 seconds
};

/**
 * Send an alert notification
 * 
 * @param {Object} options - Alert options
 * @param {string} options.message - Alert message
 * @param {string} options.level - Severity level from AlertLevel enum
 * @param {string} options.source - Source of the alert (component/service)
 * @param {string} options.shop - Shop domain if applicable
 * @param {Error} options.error - Error object if this is an error alert
 * @param {Object} options.metadata - Additional data for the alert
 * @param {Array<string>} options.channels - Notification channels to use
 * @returns {Promise<Object>} - Result of alert operation
 */
export async function sendAlert({
  message,
  level = AlertLevel.ERROR,
  source,
  shop = null,
  error = null,
  metadata = {},
  channels = [AlertChannel.CONSOLE]
}) {
  // Generate a unique alert ID
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // First, log the alert
    await logEvent({
      message: `ALERT: ${message}`,
      level: mapAlertLevelToLogLevel(level),
      category: LogCategory.SYSTEM,
      source,
      shop,
      correlationId: alertId,
      metadata: {
        isAlert: true,
        alertLevel: level,
        ...metadata
      },
      error
    });
    
    // Store the alert in the database
    const alertRecord = await storeAlert({
      id: alertId,
      message,
      level,
      source,
      shop,
      errorMessage: error?.message,
      errorStack: error?.stack,
      metadata: JSON.stringify(metadata),
      timestamp: new Date()
    });
    
    // Send notifications through configured channels
    const notificationResults = await Promise.allSettled(
      channels.map(channel => sendNotification(channel, {
        alertId,
        message,
        level,
        source,
        shop,
        error,
        metadata
      }))
    );
    
    return {
      success: true,
      alertId,
      notifications: notificationResults.map((result, index) => ({
        channel: channels[index],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason : null
      }))
    };
  } catch (alertError) {
    console.error("Failed to send alert:", alertError);
    
    // Emergency fallback - log to console
    console.error(`ALERT [${level}]: ${message}`, {
      source,
      shop,
      error,
      metadata
    });
    
    return {
      success: false,
      error: alertError
    };
  }
}

/**
 * Store alert in the database
 * 
 * @param {Object} alertData - Alert data to store
 * @returns {Promise<Object>} - Stored alert record
 */
async function storeAlert(alertData) {
  try {
    // Store in the alerts table
    const alert = await db.alert.create({
      data: alertData
    });
    
    return alert;
  } catch (error) {
    console.error("Failed to store alert in database:", error);
    return null;
  }
}

/**
 * Send notification through specified channel
 * 
 * @param {string} channel - Notification channel
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} - Notification result
 */
async function sendNotification(channel, alertData) {
  switch (channel) {
    case AlertChannel.EMAIL:
      return sendEmailNotification(alertData);
    
    case AlertChannel.SLACK:
      return sendSlackNotification(alertData);
    
    case AlertChannel.CONSOLE:
    default:
      // Console notification is simple
      const prefix = `ALERT [${alertData.level.toUpperCase()}]`;
      console[alertData.level === AlertLevel.INFO ? 'info' : 'error'](
        `${prefix}: ${alertData.message}`,
        {
          source: alertData.source,
          shop: alertData.shop,
          error: alertData.error,
          metadata: alertData.metadata
        }
      );
      return { success: true, channel: AlertChannel.CONSOLE };
  }
}

/**
 * Send email notification
 * 
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} - Email send result
 */
async function sendEmailNotification(alertData) {
  // In production, this would use nodemailer or similar
  // Example implementation using a mock service for reference
  
  try {
    // For now, just log that we would send an email
    console.log(`[EMAIL ALERT] Would send email for alert: ${alertData.message}`);
    
    // Mock email sending structure for future implementation
    /*
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const result = await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: process.env.ALERT_EMAIL_TO,
      subject: `[${alertData.level.toUpperCase()}] SkuSight Alert: ${alertData.source}`,
      text: generateEmailText(alertData),
      html: generateEmailHtml(alertData)
    });
    */
    
    return { success: true, channel: AlertChannel.EMAIL };
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return { success: false, channel: AlertChannel.EMAIL, error };
  }
}

/**
 * Send Slack notification
 * 
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} - Slack send result
 */
async function sendSlackNotification(alertData) {
  // In production, this would use the Slack API
  // Example implementation using a mock service for reference
  
  try {
    // For now, just log that we would send a Slack message
    console.log(`[SLACK ALERT] Would send Slack message for alert: ${alertData.message}`);
    
    // Mock Slack message sending structure for future implementation
    /*
    const result = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `SkuSight Alert: ${alertData.level.toUpperCase()}`,
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message:* ${alertData.message}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Source:* ${alertData.source}`
              },
              {
                type: "mrkdwn",
                text: `*Shop:* ${alertData.shop || 'N/A'}`
              }
            ]
          }
        ]
      })
    });
    */
    
    return { success: true, channel: AlertChannel.SLACK };
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return { success: false, channel: AlertChannel.SLACK, error };
  }
}

/**
 * Monitor function execution time and trigger performance alerts if needed
 * 
 * @param {Function} fn - Function to monitor
 * @param {Object} options - Monitoring options
 * @param {string} options.name - Name of the operation being monitored
 * @param {string} options.source - Source of the operation
 * @param {string} options.shop - Shop domain if applicable
 * @param {number} options.threshold - Performance threshold in ms
 * @param {Object} options.metadata - Additional context data
 * @returns {Function} - Monitored function that returns [result, durationMs]
 */
export function monitorPerformance(fn, {
  name,
  source,
  shop = null,
  threshold,
  metadata = {}
}) {
  return async (...args) => {
    const startTime = Date.now();
    let result;
    
    try {
      // Execute the function
      result = await fn(...args);
      
      // Calculate execution time
      const duration = Date.now() - startTime;
      
      // Log performance metrics
      await logEvent({
        message: `Performance metric: ${name} took ${duration}ms`,
        level: LogLevel.INFO,
        category: LogCategory.SYSTEM,
        source,
        shop,
        metadata: {
          operation: name,
          duration,
          threshold,
          ...metadata
        }
      });
      
      // Check if performance threshold was exceeded
      if (threshold && duration > threshold) {
        await sendAlert({
          message: `Performance threshold exceeded: ${name} took ${duration}ms (threshold: ${threshold}ms)`,
          level: AlertLevel.WARNING,
          source,
          shop,
          metadata: {
            operation: name,
            duration,
            threshold,
            args: safeStringifyArgs(args),
            ...metadata
          }
        });
      }
      
      return [result, duration];
    } catch (error) {
      // Calculate execution time even if there was an error
      const duration = Date.now() - startTime;
      
      // Log the error
      await sendAlert({
        message: `Error in ${name}: ${error.message}`,
        level: AlertLevel.ERROR,
        source,
        shop,
        error,
        metadata: {
          operation: name,
          duration,
          args: safeStringifyArgs(args),
          ...metadata
        }
      });
      
      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Map alert level to log level
 * 
 * @param {string} alertLevel - Alert level from AlertLevel enum
 * @returns {string} - Corresponding log level
 */
function mapAlertLevelToLogLevel(alertLevel) {
  switch (alertLevel) {
    case AlertLevel.INFO:
      return LogLevel.INFO;
    case AlertLevel.WARNING:
      return LogLevel.WARNING;
    case AlertLevel.ERROR:
      return LogLevel.ERROR;
    case AlertLevel.CRITICAL:
      return LogLevel.CRITICAL;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Safely stringify function arguments for logging
 * 
 * @param {Array} args - Function arguments
 * @returns {string} - Stringified args (safely handling circular refs)
 */
function safeStringifyArgs(args) {
  try {
    // Convert args to a safe representation, handling circular references
    return JSON.stringify(args, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Handle circular references
        const seen = new WeakSet();
        return JSON.stringify(value, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) {
              return '[Circular]';
            }
            seen.add(v);
          }
          return v;
        });
      }
      return value;
    });
  } catch (error) {
    // If stringification fails, return a simple representation
    return `[Complex args: ${args.length} items]`;
  }
}

/**
 * Get recent alerts from the database
 * 
 * @param {Object} options - Query options
 * @param {string} options.shop - Filter by shop
 * @param {number} options.limit - Maximum number of alerts to return
 * @param {string} options.level - Filter by alert level
 * @param {number} options.since - Timestamp to filter alerts after
 * @returns {Promise<Array>} - Array of alert records
 */
export async function getRecentAlerts({
  shop = null,
  limit = 10,
  level = null,
  since = null
} = {}) {
  try {
    // Build query filters
    const where = {};
    if (shop) where.shop = shop;
    if (level) where.level = level;
    if (since) where.timestamp = { gte: new Date(since) };
    
    // Query the database
    const alerts = await db.alert.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return alerts;
  } catch (error) {
    console.error("Failed to retrieve recent alerts:", error);
    return [];
  }
}

/**
 * Get performance metrics for a specific operation
 * 
 * @param {Object} options - Query options
 * @param {string} options.operation - Operation name
 * @param {string} options.shop - Shop domain
 * @param {number} options.limit - Number of data points
 * @param {number} options.since - Timestamp to filter after
 * @returns {Promise<Object>} - Performance metrics
 */
export async function getPerformanceMetrics({
  operation,
  shop = null,
  limit = 100,
  since = null
} = {}) {
  try {
    // Build query to get performance log entries
    const where = {
      category: LogCategory.SYSTEM,
      message: { contains: 'Performance metric' }
    };
    
    if (operation) where['metadata'] = { contains: operation };
    if (shop) where.shop = shop;
    if (since) where.timestamp = { gte: new Date(since) };
    
    // Query the database
    const logs = await db.appLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    // Parse metrics from logs
    const metrics = logs.map(log => {
      const metadata = JSON.parse(log.metadata || '{}');
      return {
        timestamp: log.timestamp,
        operation: metadata.operation,
        duration: metadata.duration,
        shop: log.shop
      };
    });
    
    // Calculate statistics
    let totalDuration = 0;
    let maxDuration = 0;
    let minDuration = Infinity;
    
    metrics.forEach(metric => {
      totalDuration += metric.duration;
      maxDuration = Math.max(maxDuration, metric.duration);
      minDuration = Math.min(minDuration, metric.duration);
    });
    
    const avgDuration = metrics.length > 0 ? totalDuration / metrics.length : 0;
    
    return {
      operation,
      dataPoints: metrics,
      statistics: {
        avg: avgDuration,
        max: maxDuration,
        min: minDuration !== Infinity ? minDuration : 0,
        count: metrics.length
      }
    };
  } catch (error) {
    console.error("Failed to retrieve performance metrics:", error);
    return {
      operation,
      dataPoints: [],
      statistics: {
        avg: 0,
        max: 0,
        min: 0,
        count: 0
      }
    };
  }
} 