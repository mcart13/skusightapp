import { authenticate } from "../shopify.server";
import { processProductsAutomatic } from "../services/auto-tagging.server";
import db from "../db.server";
import { logWebhook, LogLevel } from "../services/logging.server.js";
import { sendAlert, AlertLevel, monitorPerformance, PerformanceThresholds } from "../services/alerting.server.js";
import { deleteCachePattern } from "../utils/redis.server.js";

/**
 * This webhook listens for product updates and triggers AI tagging 
 * when appropriate.
 * 
 * It follows Shopify webhook best practices:
 * - Always returns 200 response quickly (even on error) to acknowledge receipt
 * - Delegates actual processing to background tasks
 * - Logs errors but doesn't throw them (to prevent Shopify from retrying)
 */
export const action = async ({ request }) => {
  // Generate a unique ID for this webhook request (for correlation)
  const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  
  try {
    // Log webhook received
    await logWebhook({
      webhookType: "product-update",
      message: "Product update webhook received",
      status: "received",
      metadata: {
        webhookId,
        startTime
      },
      request
    });
    
    // Authenticate and validate the webhook
    const { shop, admin, payload } = await authenticate.webhook(request);
    
    // Log webhook authentication success
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: `Product update webhook authenticated for shop ${shop}`,
      status: "authenticated",
      payload,
      metadata: {
        webhookId,
        startTime,
        authTime: Date.now() - startTime
      }
    });
    
    // Extract product information from payload
    const productId = payload?.id;
    if (!productId) {
      const error = new Error("Missing product ID in webhook payload");
      
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: "Product update webhook missing product ID",
        status: "error",
        payload,
        error,
        metadata: {
          webhookId,
          startTime,
          processingTime: Date.now() - startTime
        }
      });
      
      // Send an alert for the missing product ID
      await sendAlert({
        message: "Product update webhook missing product ID",
        level: AlertLevel.WARNING,
        source: "webhooks.product-update",
        shop,
        error,
        metadata: {
          webhookId,
          payload: JSON.stringify(payload)
        }
      });
      
      return new Response();
    }
    
    // Clear cache for affected product
    try {
      await deleteCachePattern(`products:*`);
      await deleteCachePattern(`metrics:*${productId}*`);
      
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Cache cleared for product ${productId}`,
        status: "info",
        metadata: {
          webhookId,
          productId,
          processingTime: Date.now() - startTime
        }
      });
    } catch (cacheError) {
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Error clearing cache: ${cacheError.message}`,
        status: "warning",
        error: cacheError,
        metadata: {
          webhookId,
          productId,
          processingTime: Date.now() - startTime
        }
      });
    }
    
    // Queue the tagging job for background processing
    try {
      await queueTaggingJob(shop, admin, productId, webhookId, payload);
      
      // Check processing time for performance monitoring
      const processingTime = Date.now() - startTime;
      if (processingTime > PerformanceThresholds.WEBHOOK_PROCESSING) {
        await sendAlert({
          message: `Slow webhook processing detected: ${processingTime}ms`,
          level: AlertLevel.WARNING,
          source: "webhooks.product-update",
          shop,
          metadata: {
            webhookId,
            productId,
            processingTime,
            threshold: PerformanceThresholds.WEBHOOK_PROCESSING
          }
        });
      }
      
      // Log successful webhook completion
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Product update webhook processed successfully for product ${productId}`,
        status: "processed",
        payload,
        metadata: {
          webhookId,
          productId,
          startTime,
          processingTime
        }
      });
    } catch (queueError) {
      // Handle specific queue errors
      await sendAlert({
        message: `Error queueing tagging job: ${queueError.message}`,
        level: AlertLevel.ERROR,
        source: "webhooks.product-update",
        shop,
        error: queueError,
        metadata: {
          webhookId,
          productId,
          processingTime: Date.now() - startTime
        }
      });
      
      // Log the error
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Error queueing tagging job: ${queueError.message}`,
        status: "error",
        payload,
        error: queueError,
        metadata: {
          webhookId,
          productId,
          processingTime: Date.now() - startTime
        }
      });
    }
    
    // Always return a 200 response quickly for webhooks
    return new Response();
  } catch (error) {
    // Calculate total processing time
    const processingTime = Date.now() - startTime;
    
    // Send alert for the error
    await sendAlert({
      message: `Critical webhook processing error: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "webhooks.product-update",
      error,
      metadata: {
        webhookId,
        processingTime
      }
    });
    
    // Log the error with the webhook logging function
    await logWebhook({
      webhookType: "product-update",
      message: `Webhook processing error: ${error.message}`,
      status: "error",
      error,
      metadata: {
        webhookId,
        startTime,
        processingTime
      },
      request
    });
    
    // Still return a 200 to acknowledge receipt
    return new Response();
  }
};

/**
 * Queue tagging job for background processing
 * This separates receiving the webhook from processing it
 */
async function queueTaggingJob(shop, admin, productId, webhookId, payload) {
  const queueStartTime = Date.now();
  
  try {
    // Get settings from database or use defaults
    const settings = await getSettings(shop);
    
    // Only proceed if auto-tagging is enabled
    if (!settings.aiTaggingEnabled || !settings.aiTaggingOnChange) {
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Auto-tagging is disabled for ${shop}. Skipping job for product ${productId}`,
        status: "skipped",
        payload,
        metadata: {
          webhookId,
          productId,
          reason: "auto-tagging-disabled",
          settings: {
            aiTaggingEnabled: settings.aiTaggingEnabled,
            aiTaggingOnChange: settings.aiTaggingOnChange
          },
          queueTime: Date.now() - queueStartTime
        }
      });
      
      return;
    }
    
    // Log that we're queuing the job
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: `Queueing AI tagging job for product ${productId}`,
      status: "queueing",
      payload,
      metadata: {
        webhookId,
        productId,
        settings: {
          aiTaggingBatchSize: settings.aiTaggingBatchSize
        }
      }
    });
    
    // Create a job record in the database
    const jobData = {
      shopDomain: shop,
      jobType: "product-tagging",
      status: "queued",
      payload: JSON.stringify({
        productId,
        options: {
          limit: settings.aiTaggingBatchSize || 50,
          sinceDays: 30,
          priorityProductIds: [productId]
        },
        webhookId, // Include the webhook ID for correlation
        webhookTimestamp: Date.now()
      }),
      createdAt: new Date()
    };
    
    const job = await db.processingJob.create({
      data: jobData
    });
    
    // Log job queued successfully
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: `Job queued successfully for product ${productId}`,
      status: "queued",
      payload,
      metadata: {
        webhookId,
        productId,
        jobId: job.id,
        queueTime: Date.now() - queueStartTime
      }
    });
    
    return job;
  } catch (error) {
    // Log the error with the webhook logging function
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: `Error queueing tagging job: ${error.message}`,
      status: "error",
      payload,
      error,
      metadata: {
        webhookId,
        productId,
        queueTime: Date.now() - queueStartTime
      }
    });
    
    // Send an alert
    await sendAlert({
      message: `Failed to queue tagging job for product ${productId}`,
      level: AlertLevel.ERROR,
      source: "webhooks.product-update.queueTaggingJob",
      shop,
      error,
      metadata: {
        webhookId,
        productId,
        queueTime: Date.now() - queueStartTime
      }
    });
    
    throw error; // Re-throw to let the caller handle it
  }
}

/**
 * Get application settings for the shop
 */
const getSettings = monitorPerformance(
  async function(shop) {
    try {
      // Try to fetch from database
      const storedSettings = await db.shopSettings.findUnique({
        where: { shopDomain: shop }
      });
      
      // Return stored settings or defaults
      return storedSettings || {
        aiTaggingEnabled: true,
        aiTaggingOnChange: true,
        aiTaggingBatchSize: 50
      };
    } catch (error) {
      // Log the error
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: `Error fetching settings: ${error.message}`,
        status: "error",
        error,
        level: LogLevel.WARNING
      });
      
      // Send an alert
      await sendAlert({
        message: `Failed to retrieve shop settings: ${error.message}`,
        level: AlertLevel.WARNING,
        source: "webhooks.product-update.getSettings",
        shop,
        error
      });
      
      // Return defaults if we can't get settings
      return {
        aiTaggingEnabled: true,
        aiTaggingOnChange: true,
        aiTaggingBatchSize: 50
      };
    }
  },
  {
    name: "getSettings",
    source: "webhooks.product-update",
    threshold: PerformanceThresholds.API_REQUEST,
  }
); 