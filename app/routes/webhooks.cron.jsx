import { json } from "@remix-run/node";
import { processProductsAutomatic } from "../services/auto-tagging.server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logCronJob, logEvent, LogLevel, LogCategory } from "../services/logging.server.js";

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
    const result = await executeJob(jobType, admin, formData, settings, shop, jobId);
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
  // Log job execution start
  await logCronJob({
    shop,
    jobType: "auto-tag-products",
    jobId,
    status: "started",
    message: "Starting automatic product tagging job",
    metadata: {
      startTime: Date.now(),
      settings: {
        aiTaggingEnabled: settings.aiTaggingEnabled,
        aiTaggingBatchSize: settings.aiTaggingBatchSize,
        sinceDays: settings.sinceDays
      },
      formData: Object.fromEntries(formData.entries())
    }
  });
  
  // Only run if enabled in settings
  if (!settings.aiTaggingEnabled) {
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "skipped",
      message: "Automatic product tagging is disabled in settings",
      metadata: {
        reason: "feature-disabled",
        settings: {
          aiTaggingEnabled: settings.aiTaggingEnabled
        }
      }
    });
    
    return {
      success: false,
      message: "Automatic product tagging is disabled in settings"
    };
  }
  
  const options = {
    limit: parseInt(settings.aiTaggingBatchSize, 10) || 50,
    fullSync: formData.get("fullSync") === "true",
    sinceDays: parseInt(settings.sinceDays, 10) || 30
  };
  
  const jobStartTime = Date.now();
  
  try {
    // Log detailed options before processing
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "processing",
      message: "Processing products for auto-tagging",
      metadata: {
        jobStartTime,
        options
      }
    });
    
    const tagResult = await processProductsAutomatic(admin, options);
    const jobEndTime = Date.now();
    
    // Log successful completion with detailed results
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "completed",
      message: `Auto-tagging completed successfully. Processed ${tagResult.processed} products, updated ${tagResult.updated} products.`,
      metadata: {
        jobStartTime,
        jobEndTime,
        duration: jobEndTime - jobStartTime,
        processed: tagResult.processed,
        updated: tagResult.updated,
        skipped: tagResult.processed - tagResult.updated,
        details: tagResult
      }
    });
    
    return {
      success: true,
      message: `Auto-tagging completed successfully. Processed ${tagResult.processed} products, updated ${tagResult.updated} products.`,
      details: tagResult,
      timestamp: new Date().toISOString(),
      executionTime: jobEndTime - jobStartTime
    };
  } catch (error) {
    const jobEndTime = Date.now();
    
    // Log detailed error information
    await logCronJob({
      shop,
      jobType: "auto-tag-products",
      jobId,
      status: "failed",
      message: `Auto-tagging job error: ${error.message}`,
      error,
      metadata: {
        jobStartTime,
        jobEndTime,
        duration: jobEndTime - jobStartTime,
        options
      }
    });
    
    throw new Error(`Auto-tagging failed: ${error.message}`);
  }
}

/**
 * Execute inventory analysis job (example of another job type)
 */
async function executeInventoryAnalysisJob(admin, formData, settings, shop, jobId) {
  const jobStartTime = Date.now();
  
  // Log job execution start
  await logCronJob({
    shop,
    jobType: "inventory-analysis",
    jobId,
    status: "started",
    message: "Starting inventory analysis job",
    metadata: {
      jobStartTime,
      formData: Object.fromEntries(formData.entries())
    }
  });
  
  // Implementation would be here
  
  const jobEndTime = Date.now();
  
  // Log successful completion
  await logCronJob({
    shop,
    jobType: "inventory-analysis",
    jobId,
    status: "completed",
    message: "Inventory analysis completed successfully",
    metadata: {
      jobStartTime,
      jobEndTime,
      duration: jobEndTime - jobStartTime
    }
  });
  
  return {
    success: true,
    message: "Inventory analysis completed successfully",
    timestamp: new Date().toISOString(),
    executionTime: jobEndTime - jobStartTime
  };
}

/**
 * Update job status in database for tracking
 */
async function updateJobStatus(jobId, shop, jobType, status, message = "") {
  try {
    await db.jobExecution.upsert({
      where: { id: jobId },
      update: {
        status,
        completedAt: ["completed", "failed"].includes(status) ? new Date() : null,
        message
      },
      create: {
        id: jobId,
        shopDomain: shop,
        jobType,
        status,
        message,
        createdAt: new Date(),
        completedAt: ["completed", "failed"].includes(status) ? new Date() : null
      }
    });
    
    // Log status update
    await logEvent({
      message: `Job status updated to ${status}`,
      level: LogLevel.DEBUG,
      category: LogCategory.CRON,
      source: jobType,
      correlationId: jobId,
      shop,
      metadata: {
        status,
        message,
        timestamp: new Date()
      }
    });
  } catch (error) {
    // Log the error but don't throw
    await logEvent({
      message: `Error updating job status: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: jobType,
      correlationId: jobId,
      shop,
      error
    });
    
    console.error("Error updating job status:", error);
    // Don't throw - job status tracking shouldn't break main functionality
  }
}

/**
 * Get application settings for the shop
 */
async function getAppSettings(shop) {
  try {
    // Try to fetch from database
    const storedSettings = await db.shopSettings.findUnique({
      where: { shopDomain: shop }
    });
    
    // Log settings retrieved
    await logEvent({
      message: "Shop settings retrieved",
      level: LogLevel.DEBUG,
      category: LogCategory.CRON,
      shop,
      metadata: {
        settingsFound: !!storedSettings
      }
    });
    
    // Return stored settings or defaults
    return storedSettings || {
      aiTaggingEnabled: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50,
      aiTaggingDataSources: ["metadata", "sales", "margins", "seasonal", "leadtime"],
      sinceDays: 30
    };
  } catch (error) {
    await logEvent({
      message: `Error fetching settings: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      shop,
      error
    });
    
    console.error("Error fetching settings:", error);
    // Return defaults if we can't get settings
    return {
      aiTaggingEnabled: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50,
      aiTaggingDataSources: ["metadata", "sales", "margins", "seasonal", "leadtime"],
      sinceDays: 30
    };
  }
}

/**
 * Record job error with proper error tracking
 */
async function recordJobError(error, jobType, request, correlationId) {
  const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Log error to database
    await db.errorLog.create({
      data: {
        id: errorId,
        jobType,
        message: error.message,
        stack: error.stack || "",
        timestamp: new Date(),
        correlationId: correlationId || null
      }
    });
    
    // Log using our comprehensive logging service
    await logEvent({
      message: `Job error recorded: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: jobType,
      correlationId: errorId,
      error,
      request,
      metadata: {
        originalCorrelationId: correlationId
      }
    });
    
    console.error(`[${errorId}] Job error:`, error);
  } catch (logError) {
    // Don't throw errors from error handling
    console.error("Failed to record error:", logError);
    
    // Attempt to log the failure to log
    try {
      await logEvent({
        message: `Failed to record error to database: ${logError.message}`,
        level: LogLevel.ERROR,
        category: LogCategory.CRON,
        error: logError
      });
    } catch (e) {
      // Last resort - just console log
      console.error("Critical failure in error logging:", e);
    }
  }
  
  return errorId;
}

/**
 * Default action when accessed via GET
 */
export async function loader({ request }) {
  const loaderRequestId = `cron-loader-${Date.now()}`;
  
  // Log GET request
  await logEvent({
    message: "GET request to cron webhook endpoint rejected",
    level: LogLevel.WARNING,
    category: LogCategory.CRON,
    correlationId: loaderRequestId,
    request
  });
  
  return json({
    success: false,
    message: "This endpoint only accepts POST requests",
    requestId: loaderRequestId
  }, { status: 405 });
} 