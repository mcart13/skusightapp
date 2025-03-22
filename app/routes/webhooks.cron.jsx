import { json } from "@remix-run/node";
import { processProductsAutomatic } from "../services/auto-tagging.server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logCronJob, logEvent, LogLevel, LogCategory } from "../services/logging.server.js";
import { sendAlert, AlertLevel, monitorPerformance, PerformanceThresholds } from "../services/alerting.server.js";
import { withRetry } from "../utils/retry.server.js";

/**
 * This route handles scheduled/cron jobs for the application.
 * 
 * Security considerations:
 * - Validate incoming requests with an API key or JWT
 * - Implement rate limiting to prevent abuse
 * - Log all job executions for audit trails
 */
export async function action({ request }) {
  // Generate a unique job run ID
  const jobRunId = `cron-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  
  // Log request received
  await logEvent({
    message: "Cron job request received",
    level: LogLevel.INFO,
    category: LogCategory.CRON,
    source: "cron-webhook",
    correlationId: jobRunId,
    metadata: {
      startTime
    },
    request
  });
  
  // Request validation and security check
  if (!await validateCronRequest(request)) {
    await logEvent({
      message: "Unauthorized cron job request rejected",
      level: LogLevel.WARNING,
      category: LogCategory.CRON,
      source: "cron-webhook",
      correlationId: jobRunId,
      metadata: {
        startTime,
        validationTime: Date.now() - startTime,
        headers: {
          apiKey: request.headers.get("x-api-key") ? "present" : "missing",
          ip: request.headers.get("x-forwarded-for") || "unknown"
        }
      },
      request
    });
    
    // Send security alert
    await sendAlert({
      message: "Unauthorized cron job request attempted",
      level: AlertLevel.WARNING,
      source: "webhooks.cron",
      metadata: {
        jobRunId,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        apiKey: request.headers.get("x-api-key") ? "present" : "missing",
        headers: Object.fromEntries([...request.headers].map(([key, value]) => [key, value]))
      }
    });
    
    return json({ 
      success: false, 
      message: "Unauthorized request",
      requestId: jobRunId
    }, { status: 401 });
  }
  
  // Log successful validation
  await logEvent({
    message: "Cron job request authorized",
    level: LogLevel.INFO,
    category: LogCategory.CRON,
    source: "cron-webhook",
    correlationId: jobRunId,
    metadata: {
      startTime,
      validationTime: Date.now() - startTime
    }
  });
  
  // Process the job request
  try {
    // Authenticate to get admin API access
    const { admin, session } = await authenticate.admin(request);
    const shop = session?.shop;
    
    // Log successful authentication
    await logCronJob({
      shop,
      jobType: "cron-webhook",
      jobId: jobRunId,
      status: "authenticated",
      message: "Cron job authenticated with Shopify",
      metadata: {
        startTime,
        authTime: Date.now() - startTime
      }
    });
    
    // Parse the request to determine which job to run
    const formData = await request.formData();
    const jobType = formData.get("job") || "unknown";
    const jobId = formData.get("jobId") || jobRunId;
    
    // Log job details determined
    await logCronJob({
      shop,
      jobType,
      jobId,
      status: "parsed",
      message: `Cron job type determined: ${jobType}`,
      metadata: {
        startTime,
        parseTime: Date.now() - startTime,
        parameters: Object.fromEntries(formData.entries())
      }
    });
    
    // Create/update job record for tracking
    await updateJobStatus(jobId, shop, jobType, "running");
    
    // Log job status updated
    await logCronJob({
      shop,
      jobType,
      jobId,
      status: "running",
      message: `Cron job ${jobType} started`,
      metadata: {
        startTime,
        runningTime: Date.now() - startTime
      }
    });
    
    // Get app settings from database
    const settings = await getAppSettings(shop);
    
    // Execute the requested job
    const jobStartTime = Date.now();
    let result;
    
    try {
      // Execute the job and monitor performance
      const [jobResult, jobDuration] = await monitorPerformance(
        () => executeJob(jobType, admin, formData, settings, shop, jobId),
        {
          name: `cron-job-${jobType}`,
          source: "webhooks.cron",
          shop,
          threshold: PerformanceThresholds.TAGGING_JOB,
          metadata: {
            jobId,
            jobType
          }
        }
      )();
      
      result = jobResult;
      
      // Additional check for job success but with high runtime
      if (result.success && jobDuration > PerformanceThresholds.TAGGING_JOB * 0.8) {
        // Send a warning about job running close to threshold
        await sendAlert({
          message: `Cron job ${jobType} completed successfully but took ${jobDuration}ms (80% of threshold)`,
          level: AlertLevel.INFO,
          source: "webhooks.cron",
          shop,
          metadata: {
            jobId,
            jobType,
            duration: jobDuration,
            threshold: PerformanceThresholds.TAGGING_JOB
          }
        });
      }
    } catch (jobError) {
      result = {
        success: false,
        message: jobError.message,
        error: jobError
      };
      
      // Send an alert for job execution error
      await sendAlert({
        message: `Error executing cron job ${jobType}: ${jobError.message}`,
        level: AlertLevel.ERROR,
        source: "webhooks.cron",
        shop,
        error: jobError,
        metadata: {
          jobId,
          jobType,
          parameters: Object.fromEntries(formData.entries())
        }
      });
    }
    
    const jobEndTime = Date.now();
    const jobDuration = jobEndTime - jobStartTime;
    
    // Update job status with result
    const finalStatus = result.success ? "completed" : "failed";
    await updateJobStatus(jobId, shop, jobType, finalStatus, result.message);
    
    // Log job completed
    await logCronJob({
      shop,
      jobType,
      jobId,
      status: finalStatus,
      message: `Cron job ${jobType} ${finalStatus}: ${result.message}`,
      metadata: {
        startTime,
        endTime: jobEndTime,
        duration: jobDuration,
        totalTime: jobEndTime - startTime,
        result
      }
    });
    
    // Add a correlation ID to the result
    result.requestId = jobRunId;
    result.executionTime = jobDuration;
    
    return json(result);
  } catch (error) {
    // Record the error with proper error tracking
    const errorId = await recordJobError(error, "cron-job", request, jobRunId);
    
    // Send critical alert
    await sendAlert({
      message: `Critical error in cron job processing: ${error.message}`,
      level: AlertLevel.CRITICAL,
      source: "webhooks.cron",
      error,
      metadata: {
        jobRunId,
        errorId,
        processingTime: Date.now() - startTime
      }
    });
    
    // Log the error with our logging service
    await logCronJob({
      jobType: "cron-webhook",
      jobId: jobRunId,
      status: "failed",
      message: `Error processing cron job: ${error.message}`,
      error,
      metadata: {
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        errorId
      }
    });
    
    return json({
      success: false,
      message: `Error processing job: ${error.message}`,
      errorId,
      requestId: jobRunId,
      error: process.env.NODE_ENV === "development" ? error.toString() : undefined
    });
  }
}

/**
 * Validates that the cron request is legitimate
 */
async function validateCronRequest(request) {
  // 1. Check if request is from an authorized source
  const apiKey = request.headers.get("x-api-key");
  
  // For development, accept any request
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // In production, validate the API key
  if (apiKey) {
    try {
      // Check against stored API keys in database or environment variables
      const validApiKey = process.env.CRON_API_KEY;
      return apiKey === validApiKey;
    } catch (error) {
      await logEvent({
        message: `Error validating API key: ${error.message}`,
        level: LogLevel.ERROR,
        category: LogCategory.CRON,
        error
      });
      
      await sendAlert({
        message: `Error validating cron job API key: ${error.message}`,
        level: AlertLevel.ERROR,
        source: "webhooks.cron.validateCronRequest",
        error
      });
      
      return false;
    }
  }
  
  // If no API key provided, check if from trusted IP
  const clientIp = request.headers.get("x-forwarded-for") || "unknown";
  const trustedIps = (process.env.TRUSTED_IPS || "").split(",");
  
  return trustedIps.includes(clientIp);
}

/**
 * Execute the requested job based on job type
 */
async function executeJob(jobType, admin, formData, settings, shop, jobId) {
  switch (jobType) {
    case "auto-tag-products":
      return await executeAutoTaggingJob(admin, formData, settings, shop, jobId);
      
    case "inventory-analysis":
      return await executeInventoryAnalysisJob(admin, formData, settings, shop, jobId);
      
    default:
      await logCronJob({
        shop,
        jobType,
        jobId,
        status: "failed",
        message: `Unknown job type: ${jobType}`,
        metadata: {
          formData: Object.fromEntries(formData.entries())
        }
      });
      
      await sendAlert({
        message: `Unknown job type requested: ${jobType}`,
        level: AlertLevel.WARNING,
        source: "webhooks.cron.executeJob",
        shop,
        metadata: {
          jobId,
          formDataEntries: Object.fromEntries(formData.entries())
        }
      });
      
      return {
        success: false,
        message: `Unknown job type: ${jobType}`
      };
  }
}

/**
 * Execute auto-tagging job
 */
async function executeAutoTaggingJob(admin, formData, settings, shop, jobId) {
  try {
    // Extract job parameters
    const limit = parseInt(formData.get("limit") || settings.aiTaggingBatchSize || "50", 10);
    const sinceDays = parseInt(formData.get("sinceDays") || "30", 10);
    const productId = formData.get("productId");
    const fullSync = formData.get("fullSync") === "true";
    const maxProducts = parseInt(formData.get("maxProducts") || "1000", 10);
    const productCursor = formData.get("productCursor") || null;
    const orderCursor = formData.get("orderCursor") || null;
    
    const options = {
      limit,
      sinceDays,
      fullSync,
      maxProducts,
      productCursor,
      orderCursor,
      priorityProductIds: productId ? [productId] : []
    };
    
    // Log that we're starting the auto-tagging
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "processing",
      message: fullSync 
        ? `Starting full auto-tagging with batch size ${limit}, max products ${maxProducts}` 
        : `Starting incremental auto-tagging with batch size ${limit}`,
      metadata: { options }
    });
    
    // Execute the actual tagging process
    try {
      const tagResult = await processProductsAutomatic(admin, options);
      
      // Log success
      await logCronJob({
        shop,
        jobType: "auto-tag-products",
        jobId,
        status: "completed",
        message: `Successfully tagged ${tagResult.processed} products across ${tagResult.batchesProcessed} batches`,
        metadata: {
          tagResult,
          hasMoreData: tagResult.hasMoreData,
          lastProductCursor: tagResult.lastProductCursor,
          lastOrderCursor: tagResult.lastOrderCursor
        }
      });
      
      // If there are more products to process and this was a full sync,
      // we could schedule a follow-up job to continue processing
      if (tagResult.hasMoreData && fullSync) {
        await scheduleFollowUpJob(shop, jobId, {
          ...options,
          productCursor: tagResult.lastProductCursor,
          orderCursor: tagResult.lastOrderCursor
        });
      }
      
      return {
        success: true,
        message: `Successfully processed ${tagResult.processed} products across ${tagResult.batchesProcessed} batches`,
        processedCount: tagResult.processed,
        updatedCount: tagResult.updated,
        batchesProcessed: tagResult.batchesProcessed,
        hasMoreData: tagResult.hasMoreData
      };
    } catch (tagError) {
      // Send alert for tagging error
      await sendAlert({
        message: `Error in auto-tagging products: ${tagError.message}`,
        level: AlertLevel.ERROR,
        source: "webhooks.cron.executeAutoTaggingJob",
        shop,
        error: tagError,
        metadata: {
          jobId,
          options
        }
      });
      
      // Log the error
      await logCronJob({
        shop,
        jobType: "auto-tag-products",
        jobId,
        status: "failed",
        message: `Auto-tagging failed: ${tagError.message}`,
        error: tagError,
        metadata: { options }
      });
      
      return {
        success: false,
        message: `Error in auto-tagging: ${tagError.message}`
      };
    }
  } catch (error) {
    // Log the error
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "failed",
      message: `Auto-tagging job execution failed: ${error.message}`,
      error,
      metadata: {
        formData: Object.fromEntries(formData.entries())
      }
    });
    
    return {
      success: false,
      message: `Failed to execute auto-tagging job: ${error.message}`
    };
  }
}

/**
 * Execute inventory analysis job
 */
async function executeInventoryAnalysisJob(admin, formData, settings, shop, jobId) {
  // Similar implementation as auto-tagging job
  try {
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "processing",
      message: "Starting inventory analysis"
    });
    
    // In a real implementation, this would do actual inventory analysis
    // For now, just simulate a successful run
    
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "completed",
      message: "Inventory analysis completed"
    });
    
    return {
      success: true,
      message: "Inventory analysis completed successfully"
    };
  } catch (error) {
    // Send alert
    await sendAlert({
      message: `Error executing inventory analysis: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "webhooks.cron.executeInventoryAnalysisJob",
      shop,
      error,
      metadata: {
        jobId
      }
    });
    
    // Log error
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "failed",
      message: `Error in inventory analysis: ${error.message}`,
      error
    });
    
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update job status in database, with retry for transient failures
 */
async function updateJobStatus(jobId, shop, jobType, status, message = "") {
  try {
    return await withRetry(async () => {
      const updatedJob = await db.processingJob.upsert({
        where: {
          id: jobId
        },
        update: {
          status,
          updatedAt: new Date(),
          result: message ? message : undefined
        },
        create: {
          id: jobId,
          shopDomain: shop,
          jobType,
          status,
          payload: JSON.stringify({
            jobType,
            createdAt: new Date()
          }),
          result: message,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return updatedJob;
    }, {
      maxRetries: 3,
      initialDelay: 300,
      // We don't retry unique constraint violations which indicate a fundamental data issue
      retryCondition: (error) => {
        return !error.message.includes('Unique constraint');
      }
    });
  } catch (error) {
    // Log the error but don't throw
    console.error(`Error updating job status after retries: ${error.message}`);
    
    // Send an alert
    await sendAlert({
      message: `Failed to update job status in database after retries: ${error.message}`,
      level: AlertLevel.WARNING,
      source: "webhooks.cron.updateJobStatus",
      shop,
      error,
      metadata: {
        jobId,
        jobType,
        status
      }
    });
    
    // Return a mock result to prevent breaking the flow
    return {
      id: jobId,
      shopDomain: shop,
      jobType,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

/**
 * Get application settings
 */
async function getAppSettings(shop) {
  try {
    // Try to fetch from database
    const storedSettings = await db.shopSettings.findUnique({
      where: { shopDomain: shop }
    });
    
    // Return stored settings or defaults
    return storedSettings || {
      aiTaggingEnabled: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50
    };
  } catch (error) {
    // Log the error
    console.error(`Error fetching app settings: ${error.message}`);
    
    // Send an alert
    await sendAlert({
      message: `Failed to retrieve app settings: ${error.message}`,
      level: AlertLevel.WARNING,
      source: "webhooks.cron.getAppSettings",
      shop,
      error
    });
    
    // Return defaults if we can't get settings
    return {
      aiTaggingEnabled: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50
    };
  }
}

/**
 * Record job error for tracking
 */
async function recordJobError(error, jobType, request, correlationId) {
  try {
    // Generate a unique error ID
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Log detailed error information
    await logEvent({
      message: `Job error: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: jobType,
      correlationId,
      error,
      metadata: {
        errorId,
        stack: error.stack,
        request: {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries([...request.headers].map(([key, value]) => [key, value]))
        }
      }
    });
    
    // In a production app, you might want to store this in a database table
    // or send it to an error tracking service like Sentry
    
    return errorId;
  } catch (loggingError) {
    // Last resort: console log
    console.error("Failed to record job error:", loggingError);
    console.error("Original error:", error);
    
    return `manual-err-${Date.now()}`;
  }
}

/**
 * Schedule a follow-up job to continue paginating products
 */
async function scheduleFollowUpJob(shop, parentJobId, options) {
  try {
    // Create a new job record in the database
    const followUpJobId = `followup-${parentJobId}-${Date.now()}`;
    
    await db.processingJob.create({
      data: {
        id: followUpJobId,
        shopDomain: shop,
        jobType: "auto-tag-products",
        status: "queued",
        payload: JSON.stringify({
          parentJobId,
          options
        }),
        createdAt: new Date()
      }
    });
    
    // Log the scheduling of the follow-up job
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId: followUpJobId,
      status: "scheduled",
      message: `Scheduled follow-up auto-tagging job to continue from cursor ${options.productCursor}`,
      metadata: {
        parentJobId,
        options
      }
    });
    
    return {
      success: true,
      followUpJobId
    };
  } catch (error) {
    await logEvent({
      message: `Failed to schedule follow-up job: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      shop,
      source: "webhooks.cron.scheduleFollowUpJob",
      metadata: {
        parentJobId,
        options,
        error: error.message,
        stack: error.stack
      }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

export async function loader({ request }) {
  // Return basic status for GET requests
  return json({
    service: "SkuSight Cron Service",
    status: "available",
    timestamp: new Date().toISOString()
  });
} 