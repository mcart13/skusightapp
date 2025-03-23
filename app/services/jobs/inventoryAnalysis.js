/**
 * Inventory analysis job service
 * Handles the execution of inventory analysis jobs from cron webhooks
 */
import { logCronJob, LogLevel, LogCategory } from "../logging.server.js";
import { sendAlert, AlertLevel } from "../alerting.server.js";
import { withRetry } from "../../utils/retry.server.js";
import db from "../../db.server.js";

/**
 * Execute an inventory analysis job
 * @param {Object} options - Job options
 * @param {Object} options.admin - Shopify admin API client
 * @param {FormData} options.formData - Form data from the request
 * @param {Object} options.settings - Shop settings
 * @param {string} options.shop - Shop domain
 * @param {string} options.jobId - Job ID
 * @returns {Promise<Object>} - Job result
 */
export async function executeInventoryAnalysisJob({ admin, formData, settings, shop, jobId }) {
  // Extract job options from form data
  const daysToAnalyze = parseInt(formData.get("daysToAnalyze") || "30", 10);
  const includeLowStock = formData.get("includeLowStock") !== "false";
  const includeOverstock = formData.get("includeOverstock") !== "false";
  
  // Log start of job
  await logCronJob({
    shop,
    jobType: "inventory-analysis",
    jobId,
    status: "started",
    message: "Starting inventory analysis job",
    metadata: {
      daysToAnalyze,
      includeLowStock,
      includeOverstock
    }
  });
  
  try {
    // Fetch inventory data from Shopify
    const inventoryData = await withRetry(
      async () => {
        const response = await admin.graphql(`
          query {
            products(first: 50) {
              edges {
                node {
                  id
                  title
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        inventoryQuantity
                        sku
                        price
                      }
                    }
                  }
                }
              }
            }
          }
        `);
        
        return response.json();
      },
      {
        maxRetries: 3,
        initialDelay: 1000
      }
    );
    
    // Process inventory data
    const { products } = inventoryData.data;
    const analysisResults = {
      lowStockItems: [],
      overstockItems: [],
      idealStockItems: [],
      totalItems: 0,
      averageStockLevel: 0
    };
    
    // Simplified analysis logic - in a real app, this would be more complex
    let totalStock = 0;
    
    products.edges.forEach(({ node: product }) => {
      product.variants.edges.forEach(({ node: variant }) => {
        analysisResults.totalItems++;
        totalStock += variant.inventoryQuantity || 0;
        
        // Use the product ID to deterministically set reorder point instead of random value
        const productId = parseInt(product.id.split('/').pop()) || 0;
        const reorderPoint = Math.max(5, productId % 20); // 5-24 range based on ID
        
        if ((variant.inventoryQuantity || 0) <= reorderPoint && includeLowStock) {
          analysisResults.lowStockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0,
            reorderPoint,
            daysRemaining: Math.round((variant.inventoryQuantity || 0) / ((productId % 5) || 1))
          });
        } else if ((variant.inventoryQuantity || 0) >= (reorderPoint * 3) && includeOverstock) {
          analysisResults.overstockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0,
            idealStock: reorderPoint * 2,
            excessUnits: (variant.inventoryQuantity || 0) - (reorderPoint * 2),
            tiedUpCapital: ((variant.inventoryQuantity || 0) - (reorderPoint * 2)) * (parseFloat(variant.price) || 0)
          });
        } else {
          analysisResults.idealStockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0
          });
        }
      });
    });
    
    // Calculate average stock level
    analysisResults.averageStockLevel = analysisResults.totalItems > 0 
      ? Math.round(totalStock / analysisResults.totalItems) 
      : 0;
    
    // Store analysis results in database
    await db.inventoryAnalysis.create({
      data: {
        shop,
        jobId,
        timestamp: new Date(),
        lowStockCount: analysisResults.lowStockItems.length,
        overstockCount: analysisResults.overstockItems.length,
        idealStockCount: analysisResults.idealStockItems.length,
        totalItems: analysisResults.totalItems,
        averageStockLevel: analysisResults.averageStockLevel,
        results: JSON.stringify(analysisResults)
      }
    });
    
    // Send alerts for critical low stock items
    if (analysisResults.lowStockItems.length > 0) {
      const criticalItems = analysisResults.lowStockItems.filter(item => item.daysRemaining <= 7);
      
      if (criticalItems.length > 0) {
        await sendAlert({
          shop,
          message: `${criticalItems.length} items critically low on stock (< 7 days remaining)`,
          level: AlertLevel.WARNING,
          source: "inventory-analysis-job",
          metadata: {
            jobId,
            criticalItems
          }
        });
      }
    }
    
    // Log successful completion
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "completed",
      message: "Inventory analysis job completed successfully",
      metadata: {
        lowStockItems: analysisResults.lowStockItems.length,
        overstockItems: analysisResults.overstockItems.length,
        idealStockItems: analysisResults.idealStockItems.length,
        totalItems: analysisResults.totalItems
      }
    });
    
    return {
      success: true,
      status: "completed",
      message: "Inventory analysis job completed successfully",
      analysisResults
    };
  } catch (error) {
    // Log error
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "error",
      message: `Inventory analysis job failed: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
    
    // Send alert for critical errors
    await sendAlert({
      shop,
      message: `Inventory analysis job failed: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "inventoryAnalysis.js",
      metadata: {
        jobId,
        error: error.message,
        stack: error.stack
      }
    });
    
    throw error; // Re-throw to allow the caller to handle it
  }
} 