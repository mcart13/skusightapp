import { authenticate } from "../shopify.server";
import { processProductsAutomatic } from "../services/auto-tagging.server";
import db from "../db.server";
import { logWebhook, LogLevel } from "../services/logging.server.js";

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
      
      return new Response();
    }
    
    // Queue the tagging job for background processing
    await queueTaggingJob(shop, admin, productId, webhookId, payload);
    
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
        processingTime: Date.now() - startTime
      }
    });
    
    // Always return a 200 response quickly for webhooks
    return new Response();
  } catch (error) {
    // Log the error with the webhook logging function
    await logWebhook({
      webhookType: "product-update",
      message: `Webhook processing error: ${error.message}`,
      status: "error",
      error,
      metadata: {
        webhookId,
        startTime,
        processingTime: Date.now() - startTime
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
    
    throw error; // Re-throw to let the caller handle it
  }
}

/**
 * Get application settings for the shop
 */
async function getSettings(shop) {
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
    
    // Return defaults if we can't get settings
    return {
      aiTaggingEnabled: true,
      aiTaggingOnChange: true,
      aiTaggingBatchSize: 50
    };
  }
} 