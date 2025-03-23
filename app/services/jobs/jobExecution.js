/**
 * Job execution service
 * Handles the execution of all job types from cron webhooks
 */
import { logCronJob, logEvent, LogLevel, LogCategory } from "../logging.server.js";
import { sendAlert, AlertLevel } from "../alerting.server.js";
import db from "../../db.server.js";
import { executeAutoTaggingJob } from "./autoTagging.js";
import { executeInventoryAnalysisJob } from "./inventoryAnalysis.js";

/**
 * Validate a cron request
 * @param {Request} request - The request object
 * @returns {Promise<boolean>} - Whether the request is valid
 */
export async function validateCronRequest(request) {
  // Check for API key in headers
  const apiKey = request.headers.get("x-api-key");
  const storedApiKey = process.env.CRON_API_KEY;
  
  if (!apiKey || apiKey !== storedApiKey) {
    return false;
  }
  
  // Check for known IP addresses
  const allowedIPs = (process.env.ALLOWED_CRON_IPS || "").split(",").map(ip => ip.trim());
  const requestIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  
  if (allowedIPs.length > 0 && !allowedIPs.includes(requestIP)) {
    // Log suspicious IP but don't reject in development
    if (process.env.NODE_ENV !== "development") {
      return false;
    }
  }
  
  return true;
}

/**
 * Execute a job based on its type
 * @param {string} jobType - The type of job to execute
 * @param {Object} admin - Shopify admin API client
 * @param {FormData} formData - Form data from the request
 * @param {Object} settings - Shop settings
 * @param {string} shop - Shop domain
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job result
 */
export async function executeJob(jobType, admin, formData, settings, shop, jobId) {
  // Update job status to running
  await updateJobStatus(jobId, shop, jobType, "running");
  
  try {
    let result;
    
    // Execute job based on type
    switch (jobType) {
      case "auto-tagging":
        result = await executeAutoTaggingJob({ admin, formData, settings, shop, jobId });
        break;
      
      case "inventory-analysis":
        result = await executeInventoryAnalysisJob({ admin, formData, settings, shop, jobId });
        break;
      
      // Add more job types here
      
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
    
    // Update job status to completed
    await updateJobStatus(jobId, shop, jobType, "completed");
    
    return result;
  } catch (error) {
    // Update job status to failed
    await updateJobStatus(jobId, shop, jobType, "failed", error.message);
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Update the status of a job
 * @param {string} jobId - Job ID
 * @param {string} shop - Shop domain
 * @param {string} jobType - Job type
 * @param {string} status - Job status
 * @param {string} message - Optional status message
 * @returns {Promise<Object>} - Updated job record
 */
export async function updateJobStatus(jobId, shop, jobType, status, message = "") {
  try {
    // Find the job record
    const existingJob = await db.processingJob.findUnique({
      where: { id: jobId }
    });
    
    // Status-specific data
    let statusData = {};
    
    if (status === "completed") {
      statusData = {
        completedAt: new Date()
      };
    } else if (status === "failed") {
      statusData = {
        error: message
      };
    }
    
    // If job record exists, update it
    if (existingJob) {
      return await db.processingJob.update({
        where: { id: jobId },
        data: {
          status,
          ...statusData,
          updatedAt: new Date()
        }
      });
    } else {
      // Create a new job record
      return await db.processingJob.create({
        data: {
          id: jobId,
          shopDomain: shop,
          jobType,
          status,
          payload: JSON.stringify({
            jobType,
            shop,
            status,
            message
          }),
          ...statusData
        }
      });
    }
  } catch (dbError) {
    // Log error but don't fail the entire operation
    await logEvent({
      message: `Failed to update job status: ${dbError.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.DATABASE,
      shop,
      source: "jobExecution.js",
      correlationId: jobId,
      metadata: {
        jobId,
        status,
        error: dbError.message
      }
    });
    
    // Still return something to avoid undefined
    return {
      id: jobId,
      status,
      error: "Failed to update job status"
    };
  }
}

/**
 * Get shop settings from database
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Shop settings
 */
export async function getAppSettings(shop) {
  try {
    // Find shop settings
    const settings = await db.shopSettings.findUnique({
      where: { shopDomain: shop }
    });
    
    if (settings) {
      return settings;
    }
    
    // If settings don't exist, create default settings
    return await db.shopSettings.create({
      data: {
        shopDomain: shop,
        aiTaggingEnabled: true,
        aiTaggingOnChange: true,
        aiTaggingFrequency: "daily",
        aiTaggingBatchSize: 50,
        performanceAlertThreshold: 60000 // 1 minute
      }
    });
  } catch (error) {
    // Log error
    await logEvent({
      message: `Failed to get shop settings: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.DATABASE,
      shop,
      source: "jobExecution.js",
      metadata: {
        error: error.message
      }
    });
    
    // Return default settings
    return {
      shopDomain: shop,
      aiTaggingEnabled: true,
      aiTaggingOnChange: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50,
      performanceAlertThreshold: 60000 // 1 minute
    };
  }
}

/**
 * Record a job error
 * @param {Error} error - Error object
 * @param {string} jobType - Job type
 * @param {Request} request - Request object
 * @param {string} correlationId - Correlation ID
 * @returns {Promise<void>}
 */
export async function recordJobError(error, jobType, request, correlationId) {
  try {
    // Log the error
    await logEvent({
      message: `Cron job error: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: jobType,
      correlationId,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      request
    });
    
    // Send an alert
    await sendAlert({
      message: `Cron job error: ${error.message}`,
      level: AlertLevel.ERROR,
      source: jobType,
      metadata: {
        error: error.message,
        stack: error.stack,
        correlationId
      }
    });
  } catch (logError) {
    // Last resort console error
    console.error("Failed to log job error:", logError);
    console.error("Original error:", error);
  }
}

/**
 * Schedule a follow-up job
 * @param {string} shop - Shop domain
 * @param {string} parentJobId - Parent job ID
 * @param {Object} options - Job options
 * @returns {Promise<Object>} - Scheduled job record
 */
export async function scheduleFollowUpJob(shop, parentJobId, options) {
  const {
    jobType,
    delay = 3600000, // 1 hour default
    payload = {}
  } = options;
  
  const scheduledTime = new Date(Date.now() + delay);
  const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Create a scheduled job record
    const job = await db.processingJob.create({
      data: {
        id: jobId,
        shopDomain: shop,
        jobType,
        status: "scheduled",
        payload: JSON.stringify({
          ...payload,
          parentJobId,
          scheduledTime: scheduledTime.toISOString()
        })
      }
    });
    
    // Log the scheduled job
    await logCronJob({
      shop,
      jobType,
      jobId,
      status: "scheduled",
      message: `Follow-up job scheduled for ${scheduledTime.toLocaleString()}`,
      metadata: {
        parentJobId,
        scheduledTime: scheduledTime.toISOString(),
        payload
      }
    });
    
    return job;
  } catch (error) {
    // Log error
    await logEvent({
      message: `Failed to schedule follow-up job: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      shop,
      source: "jobExecution.js",
      correlationId: parentJobId,
      metadata: {
        error: error.message,
        jobType,
        scheduledTime: scheduledTime.toISOString()
      }
    });
    
    // Return error info
    return {
      error: true,
      message: `Failed to schedule follow-up job: ${error.message}`
    };
  }
} 