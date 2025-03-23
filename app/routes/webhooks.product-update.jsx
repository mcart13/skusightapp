import { json } from "@remix-run/node";

// Client component for route
export default function ProductUpdateWebhook() {
  return null;
}

// Server-side action
export async function action({ request }) {
  // All server logic is in here, with dynamic imports
  
  // These imports will be removed from client bundles by Remix
  const { authenticate } = await import("../shopify.server");
  const { logWebhook, LogLevel } = await import("../services/logging.server");
  const { sendAlert, AlertLevel } = await import("../services/alerting.server");
  const { processProductsAutomatic } = await import("../services/auto-tagging.server");
  
  // Generate a unique ID for this webhook request
  const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  
  try {
    // Log webhook received
    await logWebhook({
      webhookType: "product-update",
      message: "Product update webhook received",
      status: "received",
      metadata: { webhookId, startTime },
      request
    });
    
    // Authenticate and validate the webhook
    const { shop, admin, payload } = await authenticate.webhook(request);
    
    // Extract product ID from payload
    const productId = payload.id.toString();
    
    // Process in background (not waiting for completion)
    processProduct(shop, admin, productId, webhookId, payload).catch(console.error);
    
    // Return a success response to Shopify
    return json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    // Always return success to Shopify (even on error)
    return json({ success: true });
  }
}

// This function is never imported by the client bundle
async function processProduct(shop, admin, productId, webhookId, payload) {
  // This code would be run in the server, as it's called by the action above
  try {
    // Load server-only modules
    const { processProductsAutomatic } = await import("../services/auto-tagging.server");
    const { logWebhook } = await import("../services/logging.server");
    
    // Process the product
    await processProductsAutomatic(shop, admin, [productId], {
      runId: webhookId,
      isWebhook: true
    });
    
    // Log success
    await logWebhook({
      shop,
      webhookType: "product-update",
      message: "Product update processed successfully",
      status: "completed",
      metadata: {
        webhookId,
        productId
      }
    });
  } catch (error) {
    console.error("Background task error:", error);
  }
}

// Add headers if needed
export function headers() {
  return {
    "Cache-Control": "no-store",
  };
}
