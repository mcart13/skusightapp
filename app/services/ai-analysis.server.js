/**
 * Advanced product data analysis using AI
 * In a production environment, this would connect to a real AI service
 */

/**
 * Main method to analyze product data and derive insights
 */
export async function analyzeProductData(product, metrics) {
  try {
    // In a real implementation, this would be an API call to an AI service
    // such as OpenAI, Vertex AI, or your own ML model
    
    // For our demonstration, we'll use rule-based logic that mimics what an AI might do
    return {
      tags: await generateTags(product, metrics),
      insights: await generateInsights(product, metrics),
      forecast: await generateForecast(product, metrics)
    };
  } catch (error) {
    console.error("Error in AI product analysis:", error);
    return {
      tags: [],
      insights: [],
      forecast: null
    };
  }
}

/**
 * Generate AI-powered tags for a product based on its data and metrics
 */
async function generateTags(product, metrics) {
  const tags = [];
  
  // In a real implementation, an AI would analyze the product data
  // and determine appropriate tags based on patterns it has learned
  
  // Product category tags
  if (product.productType) {
    tags.push(`ai:category:${normalizeTagValue(product.productType)}`);
  }
  
  // Vendor tags
  if (product.vendor) {
    tags.push(`ai:vendor:${normalizeTagValue(product.vendor)}`);
  }
  
  // Sales velocity tags
  if (metrics.sales) {
    const velocityTag = determineVelocityTag(metrics.sales);
    if (velocityTag) tags.push(velocityTag);
  }
  
  // Seasonality tags
  if (metrics.seasonality) {
    const seasonalityTags = determineSeasonalityTags(metrics.seasonality);
    tags.push(...seasonalityTags);
  }
  
  // Pricing and margin tags
  if (metrics.margin) {
    const marginTag = determineMarginTag(metrics.margin);
    if (marginTag) tags.push(marginTag);
  }
  
  // Lead time tags
  if (metrics.leadTime) {
    const leadTimeTag = determineLeadTimeTag(metrics.leadTime);
    if (leadTimeTag) tags.push(leadTimeTag);
  }
  
  // Special characteristic tags (derived from product data)
  const specialTags = analyzeProductCharacteristics(product);
  tags.push(...specialTags);
  
  return tags;
}

/**
 * Generate deeper insights about the product
 */
async function generateInsights(product, metrics) {
  const insights = [];
  
  // Sales pattern insights
  if (metrics.sales) {
    if (metrics.sales.velocity === "high") {
      insights.push({
        type: "sales_velocity",
        importance: "high",
        message: "Product has high sales velocity - ensure adequate stock levels",
        data: { dailyAverage: metrics.sales.dailyAverage }
      });
    } else if (metrics.sales.velocity === "low" && metrics.margin?.marginCategory === "high") {
      insights.push({
        type: "opportunity",
        importance: "medium",
        message: "High margin but low velocity - marketing opportunity",
        data: { margin: metrics.margin.marginPercent, velocity: metrics.sales.velocity }
      });
    }
  }
  
  // Seasonality insights
  if (metrics.seasonality?.hasSeasonal) {
    insights.push({
      type: "seasonality",
      importance: "high",
      message: "Product shows strong seasonal pattern - prepare inventory accordingly",
      data: { 
        peakMonths: metrics.seasonality.peakMonths,
        score: metrics.seasonality.seasonalityScore
      }
    });
  }
  
  // Inventory insights
  if (metrics.sales && metrics.leadTime) {
    const stockCoverage = product.variants[0]?.inventoryQuantity / metrics.sales.dailyAverage;
    const leadTime = metrics.leadTime.leadTime;
    
    if (stockCoverage < leadTime) {
      insights.push({
        type: "restock_urgent",
        importance: "critical",
        message: "Current stock will not last until next shipment arrives based on lead time",
        data: { stockCoverage, leadTime }
      });
    }
  }
  
  return insights;
}

/**
 * Generate sales and inventory forecasts
 */
async function generateForecast(product, metrics) {
  if (!metrics.sales || metrics.sales.dailyAverage === 0) {
    return null;
  }
  
  // Basic forecast using sales velocity
  const dailyForecast = metrics.sales.dailyAverage;
  
  // Apply seasonality adjustments if applicable
  let seasonalityFactors = Array(12).fill(1.0); // Default: no seasonal adjustment
  
  if (metrics.seasonality?.hasSeasonal) {
    // Increase forecast for peak months
    metrics.seasonality.peakMonths.forEach(month => {
      seasonalityFactors[month] = 1.5; // 50% increase during peak months
    });
    
    // If we have specific monthly sales data, calculate more precise factors
    if (metrics.sales.monthlySales && metrics.sales.monthlySales.length === 12) {
      const avgSales = metrics.sales.monthlySales.reduce((sum, val) => sum + val, 0) / 12;
      if (avgSales > 0) {
        seasonalityFactors = metrics.sales.monthlySales.map(sales => sales / avgSales);
      }
    }
  }
  
  // Generate 90-day forecast
  const forecast = {
    daily: [],
    weekly: [],
    monthly: []
  };
  
  const today = new Date();
  
  // Daily forecast
  for (let i = 0; i < 90; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    
    const month = forecastDate.getMonth();
    const seasonalAdjustment = seasonalityFactors[month];
    
    forecast.daily.push({
      date: forecastDate.toISOString().split('T')[0],
      expectedSales: dailyForecast * seasonalAdjustment,
      seasonalAdjustment
    });
  }
  
  // Weekly aggregation
  for (let i = 0; i < 13; i++) {
    const weekSales = forecast.daily.slice(i * 7, (i + 1) * 7)
      .reduce((sum, day) => sum + day.expectedSales, 0);
    
    forecast.weekly.push({
      week: i + 1,
      expectedSales: weekSales,
      startDate: forecast.daily[i * 7].date
    });
  }
  
  // Monthly aggregation
  let currentMonth = today.getMonth();
  let monthlyTotal = 0;
  let daysInMonth = 0;
  let monthStartIndex = 0;
  
  forecast.daily.forEach((day, index) => {
    const dayDate = new Date(day.date);
    const dayMonth = dayDate.getMonth();
    
    if (dayMonth !== currentMonth) {
      // Save the completed month
      forecast.monthly.push({
        month: currentMonth,
        expectedSales: monthlyTotal,
        startDate: forecast.daily[monthStartIndex].date,
        endDate: forecast.daily[index - 1].date
      });
      
      // Reset for new month
      currentMonth = dayMonth;
      monthlyTotal = 0;
      daysInMonth = 0;
      monthStartIndex = index;
    }
    
    monthlyTotal += day.expectedSales;
    daysInMonth++;
  });
  
  // Add the last month if there's data
  if (daysInMonth > 0) {
    forecast.monthly.push({
      month: currentMonth,
      expectedSales: monthlyTotal,
      startDate: forecast.daily[monthStartIndex].date,
      endDate: forecast.daily[forecast.daily.length - 1].date
    });
  }
  
  return forecast;
}

/**
 * Helper functions
 */
function normalizeTagValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function determineVelocityTag(salesMetrics) {
  if (!salesMetrics.velocity || salesMetrics.velocity === "unknown") {
    return null;
  }
  
  return `ai:velocity:${salesMetrics.velocity}`;
}

function determineMarginTag(marginMetrics) {
  if (!marginMetrics.marginCategory || marginMetrics.marginCategory === "unknown") {
    return null;
  }
  
  return `ai:margin:${marginMetrics.marginCategory}`;
}

function determineLeadTimeTag(leadTimeMetrics) {
  if (!leadTimeMetrics.leadTimeCategory) {
    return null;
  }
  
  return `ai:leadtime:${leadTimeMetrics.leadTimeCategory}`;
}

function determineSeasonalityTags(seasonalityMetrics) {
  const tags = [];
  
  if (seasonalityMetrics.hasSeasonal) {
    tags.push('ai:seasonal:true');
    
    // Add specific peak months
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    
    seasonalityMetrics.peakMonths.forEach(month => {
      if (month >= 0 && month < 12) {
        tags.push(`ai:peak-month:${monthNames[month]}`);
      }
    });
  } else {
    tags.push('ai:seasonal:false');
  }
  
  return tags;
}

function analyzeProductCharacteristics(product) {
  const tags = [];
  const title = product.title.toLowerCase();
  const description = (product.description || "").toLowerCase();
  
  // Gift items
  if (title.includes('gift') || description.includes('gift') || 
      description.includes('present') || title.includes('set')) {
    tags.push('ai:type:gift');
  }
  
  // Bulky items
  if (title.includes('large') || description.includes('large') || 
      description.includes('bulky') || description.includes('heavy')) {
    tags.push('ai:storage:bulky');
  }
  
  // Fragile items
  if (title.includes('fragile') || description.includes('fragile') || 
      description.includes('handle with care') || description.includes('glass')) {
    tags.push('ai:handling:fragile');
  }
  
  // Luxury items
  if (title.includes('premium') || description.includes('premium') || 
      title.includes('luxury') || description.includes('luxury')) {
    tags.push('ai:quality:premium');
  }
  
  return tags;
} 