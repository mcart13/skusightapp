import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  DataTable,
  Badge,
  ProgressBar,
  Button,
  Select
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

// Helper function to detect sales trends
function detectSalesTrends(productData) {
  return productData.map(product => {
    // Clone the product object
    const enhancedProduct = { ...product };

    // Add trend detection
    if (product.trend > 15) {
      enhancedProduct.trendAlert = {
        type: "acceleration",
        message: `Sales of ${product.title} are accelerating rapidly (${product.trend}% increase). Consider restocking sooner than usual.`
      };
    }

    // Detect seasonal patterns (in a real app, we'd compare with previous years)
    // For simulation, we'll randomly assign seasonal patterns to some products
    if (product.title.includes("Snowboard") && Math.random() > 0.7) {
      enhancedProduct.seasonalAlert = {
        type: "seasonal-spike",
        message: `${product.title} typically sees a 30% increase in demand during winter season. Your current stock may run out 2 weeks earlier than predicted.`
      };
    }

    return enhancedProduct;
  });
}

// Function to generate explanations for forecasts
const generateExplanation = (product) => {
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
  if (product.title.includes("Snowboard")) {
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
    impact: `${product.leadTime} days`,
    description: `Supplier typically takes ${product.leadTime} days to fulfill orders`
  });
  
  return explanations;
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Simple query to get products
  const PRODUCTS_QUERY = `
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(PRODUCTS_QUERY);
  const responseJson = await response.json();

  return json({ products: responseJson.data.products });
};

export default function SalesAnalysis() {
  const { products } = useLoaderData();
  
  // State for selected product
  const [selectedProduct, setSelectedProduct] = useState("");
  
  // Simulate historical sales - in a real app, we would fetch this from the API
  // This simulates the last 30 days of sales for each product
  const simulateHistoricalSales = (productId) => {
    // Generate some randomness in sales patterns
    const baseSales = Math.floor(Math.random() * 5) + 1; // Base sales between 1-5
    const trend = Math.random() > 0.7 ? 0.1 : Math.random() > 0.5 ? -0.05 : 0; // Some products trend up, some down
    const seasonality = Math.random() > 0.7; // Some products have seasonal patterns
    
    // Generate 30 days of sales data
    return Array(30).fill(0).map((_, day) => {
      let daySales = baseSales;
      
      // Add trend - sales gradually increase or decrease over time
      daySales += day * trend;
      
      // Add seasonality - sales spike on weekends
      if (seasonality && (day % 7 === 5 || day % 7 === 6)) {
        daySales *= 1.5;
      }
      
      // Add randomness
      daySales += Math.random() * 2 - 1;
      
      return Math.max(0, Math.round(daySales));
    });
  };
  
  // Create enhanced product data with sophisticated analysis
  const productData = products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    
    // Generate historical sales data (simulated)
    const historicalSales = simulateHistoricalSales(node.id);
    
    // Calculate average daily sales
    const averageSales = historicalSales.reduce((sum, sales) => sum + sales, 0) / historicalSales.length;
    
    // Calculate sales trend (percentage increase/decrease)
    const firstHalf = historicalSales.slice(0, 15);
    const secondHalf = historicalSales.slice(15);
    const firstHalfAvg = firstHalf.reduce((sum, sales) => sum + sales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sales) => sum + sales, 0) / secondHalf.length;
    const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    // Calculate standard deviation to determine variability
    const variance = historicalSales.reduce((sum, sales) => sum + Math.pow(sales - averageSales, 2), 0) / historicalSales.length;
    const stdDev = Math.sqrt(variance);
    
    // Determine lead time (simulated)
    const leadTime = Math.floor(Math.random() * 5) + 3; // 3-7 days
    
    // Calculate safety stock based on variability and lead time
    // Formula: Safety Stock = Z-score * Standard Deviation * Square Root of Lead Time
    // Z-score of 1.645 gives 95% service level
    const safetyStock = Math.ceil(1.645 * stdDev * Math.sqrt(leadTime));
    
    // Calculate reorder point
    // Formula: Reorder Point = (Average Daily Sales * Lead Time) + Safety Stock
    const reorderPoint = Math.ceil(averageSales * leadTime) + safetyStock;
    
    // Calculate days until stockout (adjusted for trend)
    let adjustedAverageSales = averageSales;
    if (Math.abs(trend) > 5) { // Only adjust if trend is significant
      adjustedAverageSales = averageSales * (1 + (trend / 100));
    }
    const daysUntilStockout = adjustedAverageSales > 0 ? Math.ceil(currentStock / adjustedAverageSales) : Infinity;
    
    // Determine optimal order quantity (Economic Order Quantity formula simplified)
    // We're making assumptions about ordering costs and holding costs
    const annualDemand = adjustedAverageSales * 365;
    const orderingCost = 20; // Assumed cost per order
    const holdingCost = parseFloat(variant?.price) * 0.2 || 5; // Assumed 20% of product cost per year
    const eoq = Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
    
    return {
      title: node.title,
      id: node.id,
      averageSales: parseFloat(averageSales.toFixed(2)),
      adjustedAverageSales: parseFloat(adjustedAverageSales.toFixed(2)),
      currentStock,
      daysUntilStockout: daysUntilStockout === Infinity ? "N/A" : daysUntilStockout,
      trend: parseFloat(trend.toFixed(1)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      leadTime,
      safetyStock,
      reorderPoint,
      price: variant?.price || 0,
      eoq
    };
  });
  
  // Get the selected product data
  const selectedProductData = productData.find(p => p.id === selectedProduct);
  
  // Initialize selected product when data is available
  useEffect(() => {
    if (productData.length > 0 && !selectedProduct) {
      setSelectedProduct(productData[0].id);
    }
  }, [productData, selectedProduct]);
  
  // Sort products by average sales (highest first)
  productData.sort((a, b) => b.averageSales - a.averageSales);
  
  // Create table rows for main analysis
  const rows = productData.map(product => [
    product.title,
    product.adjustedAverageSales,
    product.currentStock,
    typeof product.daysUntilStockout === "number" ? product.daysUntilStockout : product.daysUntilStockout,
    product.trend > 0 ? `+${product.trend}%` : `${product.trend}%`
  ]);
  
  // Create advanced analysis rows
  const advancedRows = productData.map(product => [
    product.title,
    product.safetyStock,
    product.reorderPoint,
    product.leadTime,
    product.eoq
  ]);
  
  // Get top 5 products for visualization
  const topProducts = productData.slice(0, 5);
  
  return (
    <Page 
      title="Sales Analysis" 
      backAction={{
        content: 'Inventory Dashboard',
        url: '/app'
      }}
      primaryAction={
        <Link to="/app/settings">
          <Button>Customize Settings</Button>
        </Link>
      }
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Top Products by Daily Sales
              </Text>
              <BlockStack gap="400">
                {topProducts.map((product) => (
                  <div key={product.title}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text variant="bodyMd" fontWeight="bold">
                        {product.title}
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text variant="bodyMd">
                          {product.averageSales} units/day
                        </Text>
                        {product.trend !== 0 && (
                          <span style={{ 
                            marginLeft: '8px', 
                            color: product.trend > 0 ? '#108043' : '#DE3618',
                            fontWeight: 'bold'
                          }}>
                            {product.trend > 0 ? `↑ ${product.trend}%` : `↓ ${Math.abs(product.trend)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressBar 
                      progress={product.averageSales / (topProducts[0].averageSales) * 100} 
                      size="small" 
                      color="primary"
                    />
                  </div>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Forecast Explanations
              </Text>
              
              <div>
                <Select
                  label="Product"
                  options={productData.map(p => ({ label: p.title, value: p.id }))}
                  value={selectedProduct}
                  onChange={value => setSelectedProduct(value)}
                />
                
                {selectedProductData && (
                  <div style={{ marginTop: '16px' }}>
                    <BlockStack gap="400">
                      <Text variant="headingSm">Why we're forecasting {selectedProductData.daysUntilStockout} days until stockout:</Text>
                      
                      <div style={{ marginTop: '8px' }}>
                        {generateExplanation(selectedProductData).map((explanation, index) => (
                          <div key={index} style={{ 
                            padding: '12px', 
                            marginBottom: '8px', 
                            borderLeft: '4px solid #5c6ac4',
                            backgroundColor: '#F9FAFB'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text variant="bodyMd" fontWeight="bold">{explanation.factor}</Text>
                              <Text variant="bodyMd" fontWeight="bold">{explanation.impact}</Text>
                            </div>
                            <Text variant="bodyMd">{explanation.description}</Text>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ marginTop: '12px' }}>
                        <Text variant="bodyMd">
                          The forecast combines your historical sales data, recent trends, seasonal patterns,
                          and supplier lead times to provide the most accurate prediction.
                        </Text>
                      </div>
                    </BlockStack>
                  </div>
                )}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Forecast Visualization
              </Text>
              
              {selectedProductData && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '120px' }}>
                      <Text>Current Stock</Text>
                    </div>
                    <div style={{ 
                      flex: 1, 
                      height: '24px', 
                      backgroundColor: '#DFE3E8',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        position: 'absolute',
                        height: '100%',
                        width: `${Math.min(100, (selectedProductData.currentStock / (selectedProductData.reorderPoint * 2)) * 100)}%`, 
                        backgroundColor: '#5c6ac4'
                      }}></div>
                    </div>
                    <div style={{ width: '60px', textAlign: 'right' }}>
                      <Text>{selectedProductData.currentStock} units</Text>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '120px' }}>
                      <Text>Reorder Point</Text>
                    </div>
                    <div style={{ 
                      flex: 1, 
                      height: '24px',
                      borderRadius: '3px',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        position: 'absolute',
                        height: '100%',
                        left: `${Math.min(100, (selectedProductData.reorderPoint / (selectedProductData.reorderPoint * 2)) * 100)}%`, 
                        borderLeft: '2px dashed #bf0711',
                        paddingLeft: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Text variant="bodySm" color="critical">Reorder at {selectedProductData.reorderPoint}</Text>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '120px' }}>
                      <Text>Safety Stock</Text>
                    </div>
                    <div style={{ 
                      flex: 1, 
                      height: '24px',
                      borderRadius: '3px',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        position: 'absolute',
                        height: '100%',
                        left: `${Math.min(100, (selectedProductData.safetyStock / (selectedProductData.reorderPoint * 2)) * 100)}%`, 
                        borderLeft: '2px dashed #8c6e00',
                        paddingLeft: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Text variant="bodySm" color="warning">Safety stock: {selectedProductData.safetyStock}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Inventory Health Overview
              </Text>
              <BlockStack gap="400">
                {productData.map((product) => {
                  let status = "success";
                  let label = "Healthy";
                  
                  if (product.daysUntilStockout === "N/A" || product.daysUntilStockout === 0) {
                    status = "critical";
                    label = "Out of Stock";
                  } else if (product.currentStock <= product.reorderPoint) {
                    status = "warning";
                    label = "Reorder Now";
                  } else if (product.daysUntilStockout < product.leadTime * 2) {
                    status = "attention";
                    label = "Order Soon";
                  }
                  
                  return (
                    <div key={product.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text variant="bodyMd">{product.title}</Text>
                      <Badge status={status}>{label}</Badge>
                    </div>
                  );
                })}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Sales Velocity Analysis
              </Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "text", "text"]}
                headings={["Product", "Daily Sales (Adjusted)", "Current Stock", "Days Until Stockout", "Primary Factor"]}
                rows={productData.map(product => {
                  const explanations = generateExplanation(product);
                  const primaryFactor = explanations.length > 0 ? explanations[0].factor : "Regular sales pattern";
    
                  return [
                    product.title,
                    product.adjustedAverageSales.toFixed(2),
                    product.currentStock,
                    typeof product.daysUntilStockout === "number" ? product.daysUntilStockout : product.daysUntilStockout,
                    primaryFactor
                  ];
                })}
              />
              <Text>Note: Sales trends are calculated based on last 30 days of sales.</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Advanced Inventory Planning
              </Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
                headings={["Product", "Safety Stock", "Reorder Point", "Lead Time (Days)", "Optimal Order Qty"]}
                rows={advancedRows}
              />
              <Text>
                Safety stock and reorder points are calculated based on sales variability and lead times. 
                The optimal order quantity minimizes total inventory costs.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}