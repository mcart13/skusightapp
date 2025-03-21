import { json } from "@remix-run/node";
import { processProductsAutomatic } from "../services/auto-tagging.server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * This route handles scheduled/cron jobs for the application
 * In a production app, you would secure this with a token/secret
 */
export async function action({ request }) {
  // For security in production, you should validate the request
  // has a valid API token or comes from a trusted source
  
  // Authenticate to get admin API access
  const { admin } = await authenticate.admin(request);
  
  // Parse the request to determine which job to run
  const formData = await request.formData();
  const jobType = formData.get("job") || "unknown";
  
  // Get app settings from database
  // For demo purposes, we'll use hardcoded default settings
  const settings = {
    aiTaggingEnabled: true,
    aiTaggingFrequency: "daily",
    aiTaggingBatchSize: 50,
    aiTaggingDataSources: ["metadata", "sales", "margins", "seasonal", "leadtime"]
  };
  
  let result = {
    success: false,
    message: "No job executed"
  };
  
  try {
    switch (jobType) {
      case "auto-tag-products":
        // Only run if enabled in settings
        if (settings.aiTaggingEnabled) {
          console.log("Running automatic product tagging job");
          
          const options = {
            limit: parseInt(settings.aiTaggingBatchSize, 10) || 50,
            fullSync: formData.get("fullSync") === "true",
            sinceDays: 30
          };
          
          const tagResult = await processProductsAutomatic(admin, options);
          
          result = {
            success: true,
            message: `Auto-tagging completed successfully. Processed ${tagResult.processed} products, updated ${tagResult.updated} products.`,
            details: tagResult
          };
        } else {
          result = {
            success: false,
            message: "Automatic product tagging is disabled in settings"
          };
        }
        break;
        
      default:
        result = {
          success: false,
          message: `Unknown job type: ${jobType}`
        };
    }
  } catch (error) {
    console.error(`Error processing job ${jobType}:`, error);
    result = {
      success: false,
      message: `Error processing job: ${error.message}`,
      error: error.toString()
    };
  }
  
  return json(result);
}

/**
 * Default action when accessed via GET
 */
export async function loader({ request }) {
  return json({
    success: false,
    message: "This endpoint only accepts POST requests"
  });
} 