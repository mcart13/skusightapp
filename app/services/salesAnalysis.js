/**
 * Sales Analysis service
 * Provides functions for analyzing sales data and detecting trends
 */

/**
 * Detect sales trends in product data
 * @param {Array} productData - Array of product objects with sales data
 * @returns {Array} - The same products with added trend analysis
 */
export function detectSalesTrends(productData) {
  if (!Array.isArray(productData)) return [];
  
  return productData.map(product => {
    if (!product) return null;
    
    // Clone the product object
    const enhancedProduct = { ...product };

    // Add trend detection
    if (product.trend > 15) {
      enhancedProduct.trendAlert = {
        type: "acceleration",
        message: `Sales of ${product.title || 'Unknown'} are accelerating rapidly (${product.trend}% increase). Consider restocking sooner than usual.`
      };
    }

    // Detect seasonal patterns (in a real app, we'd compare with previous years)
    // Deterministic check based on title instead of random
    if ((product.title || '').includes("Snowboard")) {
      enhancedProduct.seasonalAlert = {
        type: "seasonal-spike",
        message: `${product.title || 'Unknown'} typically sees a 30% increase in demand during winter season. Your current stock may run out 2 weeks earlier than predicted.`
      };
    }

    return enhancedProduct;
  }).filter(Boolean); // Remove any null entries
}

/**
 * Generate explanations for sales forecasts
 * @param {Object} product - Product object with sales data
 * @returns {Array} - Array of explanation objects
 */
export function generateExplanation(product) {
  // Check if product is valid
  if (!product) return [];
  
  // Generate different explanations based on product data and trends
  const explanations = [];
  
  // Trend-based explanation
  if (product.trend > 10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `+${Math.round(product.trend)}%`,
      description: `Sales are accelerating (+${Math.round(product.trend)}% in last 30 days)`
    });
  } else if (product.trend < -10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `${Math.round(product.trend)}%`,
      description: `Sales are slowing down (${Math.round(product.trend)}% in last 30 days)`
    });
  }
  
  // Seasonal explanation (for snowboards, assume winter seasonality)
  if ((product.title || '').includes("Snowboard")) {
    const currentMonth = new Date().getMonth();
    // Winter months in Northern Hemisphere
    if (currentMonth >= 9 || currentMonth <= 1) { // Oct-Feb
      explanations.push({
        factor: "Seasonal Pattern",
        impact: "+30%",
        description: "Winter season typically increases demand by 30% based on historical data"
      });
    }
  }
  
  // Variability-based explanation
  if (product.stdDev > 2) {
    explanations.push({
      factor: "Sales Variability",
      impact: "+15%",
      description: "High sales variability requires higher safety stock"
    });
  }
  
  // Supply chain explanation
  explanations.push({
    factor: "Lead Time",
    impact: `${product.leadTime || 'Unknown'} days`,
    description: `Supplier typically takes ${product.leadTime || 'Unknown'} days to fulfill orders`
  });
  
  return explanations;
}

/**
 * Safe parse an ID from a Shopify GraphQL ID
 * @param {string} id - Shopify GraphQL ID
 * @returns {number} - Parsed ID or 0
 */
export function safeParseId(id) {
  try {
    // Extract numeric ID from Shopify GraphQL IDs (e.g., "gid://shopify/Product/123456")
    const matches = id.match(/\/(\d+)$/);
    return matches ? parseInt(matches[1], 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate the average of an array of numbers
 * @param {Array} array - Array of numbers
 * @returns {number} - Average value
 */
export function calculateAverage(array) {
  if (!array || array.length === 0) return 0;
  return array.reduce((sum, value) => sum + value, 0) / array.length;
}

/**
 * Calculate progress percentage safely with bounds checking
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @returns {number} - Percentage between 0-100
 */
export function calculateProgressPercentage(value, max) {
  if (typeof value !== 'number' || typeof max !== 'number' || max <= 0) {
    return 0;
  }
  
  // Ensure the percentage is between 0 and 100
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

/**
 * Transform raw sales data into a format suitable for analysis
 * @param {Object} salesData - Raw sales data from GraphQL
 * @returns {Array} - Transformed product data with trends
 */
export function transformSalesData(salesData) {
  if (!salesData?.products?.edges) {
    return [];
  }
  
  return salesData.products.edges.map(({ node: product }) => {
    const productId = safeParseId(product.id);
    
    // Use deterministic values based on productId
    const stdDev = (productId % 5) + 0.5; // 0.5 to 5.5
    const dailySales = ((productId % 10) + 1) * 0.3; // 0.3 to 3.0
    const monthlyVolume = Math.round(dailySales * 30);
    const avgUnitPrice = ((productId % 50) + 10) * 5; // $50 to $295
    
    // Generate trend based on product ID
    // Some products have positive trends, others negative
    const trend = productId % 2 === 0
      ? (productId % 25) + 2 // 2% to 27% positive trend
      : -((productId % 15) + 1); // -1% to -16% negative trend
    
    // Determine popularity tier based on monthly volume
    let popularityTier = "low";
    if (monthlyVolume > 50) popularityTier = "very-high";
    else if (monthlyVolume > 30) popularityTier = "high";
    else if (monthlyVolume > 15) popularityTier = "medium";
    
    // Get first variant data
    const variant = product.variants.edges[0]?.node;
    const inventory = variant?.inventoryQuantity || 0;
    
    // Calculate days of inventory based on daily sales
    const daysOfInventory = dailySales > 0 
      ? Math.round(inventory / dailySales)
      : 999; // If no sales, set to a high number
    
    return {
      id: product.id,
      title: product.title,
      dailySales,
      monthlyVolume,
      stockLevel: inventory,
      avgUnitPrice,
      trend,
      popularityTier,
      stdDev,
      daysOfInventory,
      leadTime: 7 + (productId % 14), // 7 to 21 days lead time
      profitMargin: 30 + (productId % 20), // 30% to 50% margin
      sku: variant?.sku || `SKU-${productId}`,
      variantId: variant?.id
    };
  });
} 