import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { processProductsAutomatic } from "../../services/auto-tagging.server";
import db from "../../db.server";
import { logWebhook, LogLevel } from "../../services/logging.server.js";
import { sendAlert, AlertLevel, monitorPerformance, PerformanceThresholds } from "../../services/alerting.server.js";
import { deleteCachePattern } from "../../utils/redis.server.js";

export async function handleProductUpdate(request) {
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
      message: "Product update webhook authenticated",
      status: "processing",
      metadata: {
        webhookId,
        payload,
        processingTime: Date.now() - startTime
      }
    });
    
    // Extract product ID from payload
    const productId = payload.id.toString();
    
    // Start async processing task and don't wait for it
    queueTaggingJob(shop, admin, productId, webhookId, payload)
      .catch(error => {
        // Log any errors from the background task
        logWebhook({
          shop,
          webhookType: "product-update",
          message: `Error in background task: ${error.message}`,
          status: "error",
          level: LogLevel.ERROR,
          metadata: {
            webhookId,
            error: error.toString(),
            stack: error.stack,
            productId
          }
        }).catch(console.error);
        
        // Send alert for critical background task failures
        sendAlert({
          shop,
          level: AlertLevel.ERROR,
          title: "Product update background task failed",
          message: `Failed to process product update for product ${productId}: ${error.message}`,
          metadata: {
            webhookId,
            productId,
            error: error.toString()
          }
        }).catch(console.error);
      });
    
    // Return a success response to Shopify
    return json({ success: true });
  } catch (error) {
    // Calculate total processing time
    const processingTime = Date.now() - startTime;
    
    // Log error
    await logWebhook({
      webhookType: "product-update",
      message: `Error processing webhook: ${error.message}`,
      status: "error",
      level: LogLevel.ERROR,
      metadata: {
        webhookId,
        error: error.toString(),
        stack: error.stack,
        processingTime
      }
    });
    
    // Send alert for critical webhook failures
    await sendAlert({
      level: AlertLevel.ERROR,
      title: "Product update webhook failed",
      message: `Failed to process product update webhook: ${error.message}`,
      metadata: {
        webhookId,
        error: error.toString()
      }
    });
    
    // Always return success to Shopify (even on error)
    return json({ success: true });
  }
}

/**
 * Processes a product update in the background
 * 
 * This function handles all the complex business logic while keeping
 * the main webhook handler responsive and fast.
 */
async function queueTaggingJob(shop, admin, productId, webhookId, payload) {
  const startTime = Date.now();
  const taggingStartTime = Date.now();
  
  try {
    // Log background task start
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: "Starting background processing for product update",
      status: "background-processing",
      metadata: {
        webhookId,
        productId,
        payload
      }
    });
    
    // Check if we should process this product
    // Sample logic - adjust according to your actual requirements
    const product = payload;
    const shouldProcess = !product.tags?.includes("ai-processed");
    
    if (!shouldProcess) {
      await logWebhook({
        shop,
        webhookType: "product-update",
        message: "Skipping product - already processed",
        status: "skipped",
        metadata: {
          webhookId,
          productId,
          reason: "already-tagged",
          processingTime: Date.now() - startTime
        }
      });
      
      return;
    }
    
    // Get product data from Shopify if needed (if payload doesn't contain all info)
    // For this example, we just use the payload
    
    // Call AI tagging processing
    await processProductsAutomatic(shop, admin, [productId], {
      runId: webhookId,
      isWebhook: true
    });
    
    // Calculate tagging time
    const taggingTime = Date.now() - taggingStartTime;
    
    // Monitor performance 
    await monitorPerformance({
      shop,
      operation: "product-tagging",
      durationMs: taggingTime,
      metadata: {
        webhookId,
        productId
      }
    });
    
    // Check if tagging took too long
    if (taggingTime > PerformanceThresholds.PRODUCT_TAGGING_WARNING) {
      await sendAlert({
        shop,
        level: AlertLevel.WARNING,
        title: "Slow product tagging operation",
        message: `Product tagging took ${taggingTime}ms, which exceeds the warning threshold of ${PerformanceThresholds.PRODUCT_TAGGING_WARNING}ms`,
        metadata: {
          webhookId,
          productId,
          taggingTime
        }
      });
    }
    
    // Invalidate any caches that might contain this product
    await deleteCachePattern(`product:${productId}:*`);
    
    // Log success
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: "Product update background processing completed successfully",
      status: "completed",
      metadata: {
        webhookId,
        productId,
        processingTime: Date.now() - startTime,
        taggingTime
      }
    });
  } catch (error) {
    // Log error in background task
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: `Error in background processing: ${error.message}`,
      status: "error",
      level: LogLevel.ERROR,
      metadata: {
        webhookId,
        productId,
        error: error.toString(),
        stack: error.stack,
        processingTime: Date.now() - startTime
      }
    });
    
    // Rethrow to allow the caller to handle this
    throw error;
  }
} 