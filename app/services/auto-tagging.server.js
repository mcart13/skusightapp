import { analyzeProductData } from './ai-analysis.server.js';
import { getCache, setCache, deleteCache } from '../utils/redis.server.js';
import { withRetry } from "../utils/retry.server.js";

/**
 * Main function to process and tag products automatically
 * This is designed to be called by a scheduled job or webhook trigger
 */
export async function processProductsAutomatic(admin, options = {}) {
  const { 
    fullSync = false, 
    limit = 50, 
    sinceDays = 30, 
    maxProducts = 1000, 
    priorityProductIds = [],
    skipCache = false
  } = options;
  
  try {
    console.log(`Starting automatic product tagging job (fullSync: ${fullSync})`);
    
    let allProducts = [];
    let allOrders = [];
    let productCursor = null;
    let orderCursor = null;
    let hasMoreProducts = true;
    let hasMoreOrders = true;
    let productsFetched = 0;
    let batchCount = 0;
    
    // If we have priority products, process them first and then continue with pagination
    if (priorityProductIds && priorityProductIds.length > 0) {
      console.log(`Processing ${priorityProductIds.length} priority products first...`);
      // Implementation for priority products would be here
      // For now, just continue with regular pagination
    }
    
    // Paginated fetching for products and orders
    while ((hasMoreProducts || hasMoreOrders) && productsFetched < maxProducts) {
      batchCount++;
      console.log(`Fetching batch ${batchCount} of data...`);
      
      // Step 1: Fetch batch of data
      const batchData = await fetchRequiredData(admin, { 
        limit, 
        sinceDays,
        productCursor: hasMoreProducts ? productCursor : null,
        orderCursor: hasMoreOrders ? orderCursor : null,
        skipCache
      });
      
      // Update cursors for next batch
      productCursor = batchData.pagination.products.endCursor;
      orderCursor = batchData.pagination.orders.endCursor;
      
      // Update pagination flags
      hasMoreProducts = batchData.pagination.products.hasNextPage;
      hasMoreOrders = batchData.pagination.orders.hasNextPage;
      
      // Merge data
      allProducts = [...allProducts, ...batchData.products];
      allOrders = [...allOrders, ...batchData.orders];
      productsFetched += batchData.products.length;
      
      // Process this batch
      if (batchData.products.length > 0) {
        // Calculate metrics for this batch
        const batchResults = await processProductBatch(admin, {
          products: batchData.products,
          salesMetrics: batchData.salesMetrics,
          marginMetrics: batchData.marginMetrics,
          seasonalityMetrics: batchData.seasonalityMetrics,
          leadTimeMetrics: batchData.leadTimeMetrics
        });
        
        console.log(`Batch ${batchCount} processed: ${batchResults.processed} products, ${batchResults.updated} updates`);
      }
      
      // If fullSync is false, we'll just process the first batch
      if (!fullSync) {
        console.log(`Full sync disabled. Stopping after first batch.`);
        break;
      }
      
      // Add a small delay to avoid rate limits
      if (hasMoreProducts || hasMoreOrders) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const results = {
      processed: allProducts.length,
      updated: allProducts.length, // This is simplified - in reality we'd count actual updates
      batchesProcessed: batchCount,
      hasMoreData: hasMoreProducts || hasMoreOrders,
      lastProductCursor: productCursor,
      lastOrderCursor: orderCursor
    };
    
    console.log(`Auto-tagging job completed. Processed ${results.processed} products across ${batchCount} batches.`);
    return results;
  } catch (error) {
    console.error("Error in automatic product tagging:", error);
    throw error;
  }
}

/**
 * Fetch all required data for tagging from various sources
 */
async function fetchRequiredData(admin, { limit, sinceDays, productCursor = null, orderCursor = null, skipCache = false }) {
  // Prepare date filter for orders
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const formattedDate = sinceDate.toISOString();
  
  // Generate cache keys
  const productCacheKey = `products:${limit}:${productCursor || 'null'}`;
  const orderCacheKey = `orders:${formattedDate}:${orderCursor || 'null'}`;
  
  // Try to get products from cache first
  let productsJson = null;
  if (!skipCache) {
    productsJson = await getCache(productCacheKey);
  }
  
  // If not in cache or skipCache is true, fetch from API
  if (!productsJson) {
    // 1. Fetch products with their metadata using cursor-based pagination
    const productsResponse = await admin.graphql(`
      query GetProductsForTagging($limit: Int!, $cursor: String) {
        products(first: $limit, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
              description
              productType
              vendor
              tags
              createdAt
              publishedAt
              metafields(first: 10) {
                edges {
                  node {
                    key
                    namespace
                    value
                    type
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                    inventoryQuantity
                    sku
                    cost
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: {
        limit,
        cursor: productCursor
      }
    });
    
    productsJson = await productsResponse.json();
    
    // Cache the results
    await setCache(productCacheKey, productsJson, 300); // Cache for 5 minutes
  } else {
    console.log(`Using cached product data for cursor: ${productCursor || 'initial'}`);
  }
  
  // Try to get orders from cache
  let ordersJson = null;
  if (!skipCache) {
    ordersJson = await getCache(orderCacheKey);
  }
  
  // If not in cache or skipCache is true, fetch from API
  if (!ordersJson) {
    // 2. Fetch recent orders to calculate sales velocity and lead times with cursor-based pagination
    const ordersResponse = await admin.graphql(`
      query GetOrdersForAnalysis($sinceDate: DateTime!, $limit: Int!, $cursor: String) {
        orders(first: $limit, after: $cursor, query: "created_at:>\\\\\\"{sinceDate}\\\\\\"") {
          edges {
            cursor
            node {
              id
              name
              createdAt
              lineItems(first: 10) {
                edges {
                  node {
                    quantity
                    name
                    sku
                    product {
                      id
                    }
                    variant {
                      id
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: {
        sinceDate: formattedDate,
        limit: 100,
        cursor: orderCursor
      }
    });
    
    ordersJson = await ordersResponse.json();
    
    // Cache the results
    await setCache(orderCacheKey, ordersJson, 600); // Cache for 10 minutes
  } else {
    console.log(`Using cached order data for cursor: ${orderCursor || 'initial'}`);
  }
  
  // Process products data
  const products = productsJson.data.products.edges.map(({ node, cursor }) => ({
    id: node.id,
    cursor,
    title: node.title,
    description: node.description,
    productType: node.productType || "",
    vendor: node.vendor || "",
    tags: node.tags || [],
    createdAt: node.createdAt,
    publishedAt: node.publishedAt,
    metafields: node.metafields?.edges.map(({ node: metafield }) => ({
      key: metafield.key,
      namespace: metafield.namespace,
      value: metafield.value,
      type: metafield.type
    })) || [],
    variants: node.variants?.edges.map(({ node: variant }) => ({
      id: variant.id,
      price: parseFloat(variant.price || 0),
      compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
      inventoryQuantity: variant.inventoryQuantity || 0,
      sku: variant.sku || "",
      cost: variant.cost ? parseFloat(variant.cost) : null,
      inventoryItemId: variant.inventoryItem?.id
    })) || []
  }));
  
  // Process orders data for sales velocity
  const orders = ordersJson.data.orders.edges.map(({ node, cursor }) => ({
    id: node.id,
    cursor,
    name: node.name,
    createdAt: node.createdAt,
    lineItems: node.lineItems?.edges.map(({ node: lineItem }) => ({
      quantity: lineItem.quantity,
      name: lineItem.name,
      sku: lineItem.sku,
      productId: lineItem.product?.id,
      variantId: lineItem.variant?.id
    })) || []
  }));
  
  // Extract pagination info
  const productsPagination = {
    hasNextPage: productsJson.data.products.pageInfo.hasNextPage,
    endCursor: productsJson.data.products.pageInfo.endCursor
  };
  
  const ordersPagination = {
    hasNextPage: ordersJson.data.orders.pageInfo.hasNextPage,
    endCursor: ordersJson.data.orders.pageInfo.endCursor
  };
  
  // Generate and cache the metrics (can be expensive to calculate)
  const metricsCacheKey = `metrics:${products.map(p => p.id).join(':')}:${orders.length}`;
  let metrics = null;
  
  if (!skipCache) {
    metrics = await getCache(metricsCacheKey);
  }
  
  if (!metrics) {
    // Calculate sales metrics for each product
    const salesMetrics = calculateSalesMetrics(products, orders);
    
    // Calculate margin metrics
    const marginMetrics = calculateMarginMetrics(products);
    
    // Analyze seasonality
    const seasonalityMetrics = estimateSeasonality(products, orders);
    
    // Estimate lead times
    const leadTimeMetrics = estimateLeadTimes(products, orders);
    
    metrics = {
      salesMetrics,
      marginMetrics,
      seasonalityMetrics,
      leadTimeMetrics
    };
    
    // Cache the metrics
    await setCache(metricsCacheKey, metrics, 1800); // Cache for 30 minutes
  } else {
    console.log(`Using cached metrics data for ${products.length} products`);
  }
  
  return {
    products,
    ...metrics,
    pagination: {
      products: productsPagination,
      orders: ordersPagination
    }
  };
}

/**
 * Calculate sales metrics for all products
 */
function calculateSalesMetrics(products, orders) {
  const metrics = {};
  
  // Initialize metrics for each product
  products.forEach(product => {
    metrics[product.id] = {
      totalSold: 0,
      totalRevenue: 0,
      dailyAverage: 0,
      weeklySales: [],
      monthlySales: [],
      velocity: "unknown"
    };
    
    // Initialize weekly and monthly buckets
    const now = new Date();
    for (let i = 0; i < 12; i++) { // 12 months
      metrics[product.id].monthlySales.push(0);
    }
    for (let i = 0; i < 52; i++) { // 52 weeks
      metrics[product.id].weeklySales.push(0);
    }
  });
  
  // Process orders to calculate sales
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    
    order.lineItems.forEach(lineItem => {
      if (!lineItem.productId) return;
      
      // If we track this product, update its metrics
      if (metrics[lineItem.productId]) {
        metrics[lineItem.productId].totalSold += lineItem.quantity;
        metrics[lineItem.productId].totalRevenue += 0; // Would be price * quantity
        
        // Update weekly and monthly buckets
        const weekIndex = getWeekIndex(orderDate);
        const monthIndex = orderDate.getMonth();
        
        metrics[lineItem.productId].weeklySales[weekIndex] += lineItem.quantity;
        metrics[lineItem.productId].monthlySales[monthIndex] += lineItem.quantity;
      }
    });
  });
  
  // Calculate final metrics
  products.forEach(product => {
    const metric = metrics[product.id];
    const daysSinceCreation = getDaysBetween(new Date(product.createdAt), new Date());
    
    // Calculate daily average
    metric.dailyAverage = daysSinceCreation > 0 ? metric.totalSold / daysSinceCreation : 0;
    
    // Determine velocity category
    if (metric.dailyAverage > 5) {
      metric.velocity = "high";
    } else if (metric.dailyAverage > 1) {
      metric.velocity = "medium";
    } else if (metric.dailyAverage > 0) {
      metric.velocity = "low";
    } else {
      metric.velocity = "none";
    }
  });
  
  return metrics;
}

/**
 * Calculate margin metrics for all products
 */
function calculateMarginMetrics(products) {
  const metrics = {};
  
  products.forEach(product => {
    const variant = product.variants[0]; // Primary variant
    
    // Calculate margin if we have cost data
    let margin = 0;
    let marginPercent = 0;
    let marginCategory = "unknown";
    
    if (variant && variant.cost && variant.price) {
      margin = variant.price - variant.cost;
      marginPercent = variant.price > 0 ? (margin / variant.price) * 100 : 0;
      
      // Categorize margin
      if (marginPercent >= 60) {
        marginCategory = "high";
      } else if (marginPercent >= 30) {
        marginCategory = "medium";
      } else {
        marginCategory = "low";
      }
    }
    
    metrics[product.id] = {
      margin,
      marginPercent,
      marginCategory
    };
  });
  
  return metrics;
}

/**
 * Analyze seasonal patterns
 */
function estimateSeasonality(products, orders) {
  const metrics = {};
  
  products.forEach(product => {
    metrics[product.id] = {
      hasSeasonal: false,
      peakMonths: [],
      seasonalityScore: 0
    };
    
    // Get monthly sales from the sales metrics
    const monthlySales = []; // Would be populated with real data
    
    // Check for significant variations
    if (monthlySales.length > 0) {
      const avg = monthlySales.reduce((sum, val) => sum + val, 0) / monthlySales.length;
      const peaks = [];
      
      monthlySales.forEach((sales, month) => {
        if (sales > avg * 1.5) {
          peaks.push(month);
        }
      });
      
      metrics[product.id].peakMonths = peaks;
      metrics[product.id].hasSeasonal = peaks.length > 0;
      metrics[product.id].seasonalityScore = peaks.length > 0 ? 0.8 : 0.2;
    }
    
    // For demo purposes, assign seasonality based on product type
    const productTypeLower = product.productType.toLowerCase();
    if (
      productTypeLower.includes("winter") || 
      productTypeLower.includes("christmas") ||
      productTypeLower.includes("halloween") ||
      productTypeLower.includes("summer") ||
      productTypeLower.includes("seasonal")
    ) {
      metrics[product.id].hasSeasonal = true;
      
      if (productTypeLower.includes("winter") || productTypeLower.includes("christmas")) {
        metrics[product.id].peakMonths = [10, 11, 0]; // Nov, Dec, Jan
      } else if (productTypeLower.includes("summer")) {
        metrics[product.id].peakMonths = [5, 6, 7]; // Jun, Jul, Aug
      } else if (productTypeLower.includes("halloween")) {
        metrics[product.id].peakMonths = [8, 9]; // Sep, Oct
      }
      
      metrics[product.id].seasonalityScore = 0.9;
    }
  });
  
  return metrics;
}

/**
 * Estimate lead times based on available data
 */
function estimateLeadTimes(products, orders) {
  const metrics = {};
  
  products.forEach(product => {
    // Check if lead time is stored in metafields
    const leadTimeMetafield = product.metafields.find(
      meta => meta.namespace === "inventory" && meta.key === "lead_time"
    );
    
    let leadTime = leadTimeMetafield ? parseInt(leadTimeMetafield.value, 10) : null;
    
    // If no metafield, estimate based on product type or vendor
    if (!leadTime) {
      if (product.vendor === "Global Supply Co.") {
        leadTime = 7; // 7 days lead time
      } else if (product.vendor === "Premium Materials Inc.") {
        leadTime = 14; // 14 days lead time
      } else {
        // Default lead time based on product type
        leadTime = 10; // 10 days default
      }
    }
    
    // Categorize the lead time
    let leadTimeCategory;
    if (leadTime <= 5) {
      leadTimeCategory = "short";
    } else if (leadTime <= 14) {
      leadTimeCategory = "medium";
    } else {
      leadTimeCategory = "long";
    }
    
    metrics[product.id] = {
      leadTime,
      leadTimeCategory
    };
  });
  
  return metrics;
}

/**
 * Process a batch of products and assign AI tags
 */
async function processProductBatch(admin, data) {
  const { products, salesMetrics, marginMetrics, seasonalityMetrics, leadTimeMetrics } = data;
  
  let processed = 0;
  let updated = 0;
  
  for (const product of products) {
    processed++;
    
    // 1. Gather all metrics for this product
    const metrics = {
      sales: salesMetrics[product.id],
      margin: marginMetrics[product.id],
      seasonality: seasonalityMetrics[product.id],
      leadTime: leadTimeMetrics[product.id]
    };
    
    // 2. Generate AI tags based on metrics (this would call the AI analysis service)
    const aiTags = await analyzeProductMetrics(product, metrics);
    
    // 3. Check if tags have changed
    const existingAiTags = product.tags.filter(tag => tag.startsWith('ai:'));
    const tagsToAdd = aiTags.filter(tag => !product.tags.includes(tag));
    const tagsToRemove = existingAiTags.filter(tag => !aiTags.includes(tag));
    
    // 4. Update tags if needed
    if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
      updated++;
      
      // Prepare new tag list
      const newTags = [
        ...product.tags.filter(tag => !tag.startsWith('ai:')),
        ...aiTags
      ];
      
      // Update product in Shopify
      await updateProductTags(admin, product.id, newTags);
    }
  }
  
  return { processed, updated };
}

/**
 * Update product tags in Shopify
 */
async function updateProductTags(admin, productId, tags) {
  return withRetry(async () => {
    const response = await admin.graphql(`
      mutation updateProductTags($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          id: productId,
          tags: tags
        }
      }
    });
    
    const result = await response.json();
    if (result.data.productUpdate.userErrors.length > 0) {
      const error = new Error(`Error updating product tags: ${result.data.productUpdate.userErrors[0].message}`);
      error.userErrors = result.data.productUpdate.userErrors;
      throw error;
    }
    
    return result.data.productUpdate.product;
  }, {
    maxRetries: 3,
    initialDelay: 500,
    retryableErrors: ['NetworkError', 'TimeoutError', 'rate limit', 'too many requests'],
    onRetry: (error, attempt) => {
      console.warn(`Retry ${attempt} for product ${productId} tags update: ${error.message}`);
    }
  });
}

/**
 * Analyze product metrics to generate AI tags
 */
async function analyzeProductMetrics(product, metrics) {
  const tags = [];
  
  // 1. Add tag for product type/category
  if (product.productType) {
    tags.push(`ai:category:${product.productType.toLowerCase().replace(/\s+/g, '-')}`);
  }
  
  // 2. Add tag for vendor
  if (product.vendor) {
    tags.push(`ai:vendor:${product.vendor.toLowerCase().replace(/\s+/g, '-')}`);
  }
  
  // 3. Add sales velocity tag
  if (metrics.sales && metrics.sales.velocity) {
    tags.push(`ai:velocity:${metrics.sales.velocity}`);
  }
  
  // 4. Add margin category tag
  if (metrics.margin && metrics.margin.marginCategory !== "unknown") {
    tags.push(`ai:margin:${metrics.margin.marginCategory}`);
  }
  
  // 5. Add lead time tag
  if (metrics.leadTime && metrics.leadTime.leadTimeCategory) {
    tags.push(`ai:leadtime:${metrics.leadTime.leadTimeCategory}`);
  }
  
  // 6. Add seasonality tags
  if (metrics.seasonality && metrics.seasonality.hasSeasonal) {
    tags.push(`ai:seasonal:true`);
    
    // Add specific peak months if available
    metrics.seasonality.peakMonths.forEach(month => {
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      tags.push(`ai:peak-month:${monthNames[month]}`);
    });
  } else {
    tags.push(`ai:seasonal:false`);
  }
  
  return tags;
}

/**
 * Helper functions
 */
function getWeekIndex(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  const weekIndex = Math.floor(days / 7);
  return Math.min(weekIndex, 51); // Ensure it stays within 0-51
}

function getDaysBetween(start, end) {
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
} 