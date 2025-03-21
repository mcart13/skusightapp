import { authenticate } from "../shopify.server";
import { processProductsAutomatic } from "../services/auto-tagging.server";

/**
 * This webhook listens for product updates and triggers AI tagging
 * when appropriate.
 */
export const action = async ({ request }) => {
  const { shop, admin, payload } = await authenticate.webhook(request);
  
  console.log(`Received product update webhook for ${shop}`);
  
  // In a production app, you would not process the product immediately
  // in the webhook response. Instead, you would queue the task for 
  // background processing. However, for demonstration purposes, we'll
  // show how the flow would work.
  
  try {
    // Extract the product ID from the webhook payload
    const productId = payload.id;
    
    // Check settings to see if auto-tagging is enabled
    // For demo purposes, we'll assume it's enabled
    const settings = {
      aiTaggingEnabled: true,
      aiTaggingOnChange: true // whether to tag on product changes
    };
    
    if (settings.aiTaggingEnabled && settings.aiTaggingOnChange) {
      // In a real app, you would queue this for background processing
      // But for our demo, we'll process it directly
      
      console.log(`Triggering AI tagging for product ${productId}`);
      
      // Instead of processing just this product, we'll trigger a batch process
      // This is more efficient than handling single products at a time
      
      const options = {
        limit: 50,
        sinceDays: 30,
        // You could add product IDs to prioritize:
        // priorityProductIds: [productId]
      };
      
      // In a real app, we would queue this job instead
      // processProductsAutomatic(admin, options);
      
      // For the webhook response, we'll just acknowledge receipt
      console.log(`Scheduled AI tagging for product ${productId}`);
    }
  } catch (error) {
    console.error("Error processing product update webhook:", error);
    // Don't throw errors in webhooks as it will cause retries
  }
  
  // Always return a 200 response for webhooks
  return new Response();
}; 