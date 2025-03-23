/**
 * Auto-tagging job service
 * Handles the execution of auto-tagging jobs from cron webhooks
 */
import { processProductsAutomatic } from "../auto-tagging.server.js";
import { logCronJob, LogLevel, LogCategory } from "../logging.server.js";
import { sendAlert, AlertLevel } from "../alerting.server.js";
import { withRetry } from "../../utils/retry.server.js";

/**
 * Execute an auto-tagging job
 * @param {Object} options - Job options
 * @param {Object} options.admin - Shopify admin API client
 * @param {FormData} options.formData - Form data from the request
 * @param {Object} options.settings - Shop settings
 * @param {string} options.shop - Shop domain
 * @param {string} options.jobId - Job ID
 * @returns {Promise<Object>} - Job result
 */
export async function executeAutoTaggingJob({ admin, formData, settings, shop, jobId }) {
  // Extract job options from form data
  const batchSize = parseInt(formData.get("batchSize") || settings.aiTaggingBatchSize || "50", 10);
  const forceRun = formData.get("force") === "true";
  const productIds = formData.getAll("productIds");
  
  // Log start of job
  await logCronJob({
    shop,
    jobType: "auto-tagging",
    jobId,
    status: "started",
    message: "Starting auto-tagging job",
    metadata: {
      batchSize,
      forceRun,
      productIds: productIds.length > 0 ? productIds : "all",
      aiTaggingEnabled: settings.aiTaggingEnabled
    }
  });
  
  // Check if auto-tagging is enabled in settings
  if (!settings.aiTaggingEnabled && !forceRun) {
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "skipped",
      message: "Auto-tagging is disabled for this shop",
      metadata: {
        settings: {
          aiTaggingEnabled: settings.aiTaggingEnabled
        }
      }
    });
    
    return {
      success: true,
      status: "skipped",
      message: "Auto-tagging is disabled for this shop",
      details: {
        aiTaggingEnabled: settings.aiTaggingEnabled,
        forceRun
      }
    };
  }
  
  try {
    // Execute the auto-tagging process
    const result = await withRetry(
      () => processProductsAutomatic({
        shop,
        admin,
        batchSize,
        productIds: productIds.length > 0 ? productIds : null,
        jobId
      }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (err, attempt) => {
          logCronJob({
            shop,
            jobType: "auto-tagging",
            jobId,
            status: "retry",
            message: `Retry attempt ${attempt} after error: ${err.message}`,
            metadata: {
              error: err.message,
              attempt
            }
          });
        }
      }
    );
    
    // Log successful completion
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "completed",
      message: "Auto-tagging job completed successfully",
      metadata: {
        result
      }
    });
    
    return {
      success: true,
      status: "completed",
      message: "Auto-tagging job completed successfully",
      result
    };
  } catch (error) {
    // Log error
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "error",
      message: `Auto-tagging job failed: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
    
    // Send alert for critical errors
    await sendAlert({
      shop,
      message: `Auto-tagging job failed: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "autoTagging.js",
      metadata: {
        jobId,
        error: error.message,
        stack: error.stack
      }
    });
    
    throw error; // Re-throw to allow the caller to handle it
  }
} 