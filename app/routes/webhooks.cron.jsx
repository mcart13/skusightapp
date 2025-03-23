import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logEvent, LogLevel, LogCategory } from "../services/logging.server.js";
import { sendAlert, AlertLevel, monitorPerformance } from "../services/alerting.server.js";
import {
  validateCronRequest,
  executeJob,
  getAppSettings,
  recordJobError
} from "../services/jobs";

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
    
    // Get shop settings
    const settings = await getAppSettings(shop);
    
    // Parse job type and other parameters from form data
    const formData = await request.clone().formData();
    const jobType = formData.get("jobType");
    
    if (!jobType) {
      return json({
        success: false,
        message: "Missing job type",
        requestId: jobRunId
      }, { status: 400 });
    }
    
    // Start performance monitoring
    const perfMonitor = monitorPerformance(
      `cron-job-${jobType}`,
      settings.performanceAlertThreshold
    );
    
    try {
      // Execute the job
      const result = await executeJob(jobType, admin, formData, settings, shop, jobRunId);
      
      // End performance monitoring
      perfMonitor.end();
      
      return json({
        success: true,
        jobId: jobRunId,
        jobType,
        result,
        executionTime: Date.now() - startTime
      });
    } catch (jobError) {
      // End performance monitoring
      perfMonitor.end();
      
      // Record job error
      await recordJobError(jobError, jobType, request, jobRunId);
      
      return json({
        success: false,
        jobId: jobRunId,
        jobType,
        error: jobError.message,
        executionTime: Date.now() - startTime
      }, { status: 500 });
    }
  } catch (error) {
    // Handle authentication errors or other exceptions
    console.error("Cron job handler error:", error);
    
    await logEvent({
      message: `Cron job critical error: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: "cron-webhook",
      correlationId: jobRunId,
      metadata: {
        error: error.message,
        stack: error.stack,
        executionTime: Date.now() - startTime
      },
      request
    });
    
    return json({
      success: false,
      error: error.message,
      requestId: jobRunId,
      executionTime: Date.now() - startTime
    }, { status: 500 });
  }
}

// Loader handles GET requests to check status and health
export async function loader({ request }) {
  // Simple health check endpoint
  return json({
    status: "ok",
    version: "1.0",
    message: "Cron webhook endpoint is running",
    timestamp: new Date().toISOString()
  });
} 