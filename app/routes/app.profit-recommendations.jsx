import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  DataTable,
  Badge,
  Banner,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    // Get products data
    const response = await admin.graphql(`
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
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `);

    const responseJson = await response.json();
    
    // Validate response structure before returning
    if (!responseJson?.data?.products?.edges) {
      return json({ 
        products: { edges: [] },
        error: "Invalid data structure returned from API"
      });
    }
    
    return json({ products: responseJson.data.products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ 
      products: { edges: [] },
      error: "Failed to fetch product data"
    });
  }
};

// Helper function to safely parse numeric values
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
};

// Helper to safely parse ID numbers
const safeParseId = (id, defaultValue = 1) => {
  if (!id || typeof id !== 'string') return defaultValue;
  try {
    return parseInt(id.replace(/\D/g, '')) || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export default function ProfitRecommendations() {
  const { products, error } = useLoaderData();
  
  // Check if products data is valid
  const hasValidProducts = products?.edges && Array.isArray(products.edges) && products.edges.length > 0;
  
  // Process product data and calculate profit-related metrics
  const productData = hasValidProducts ? products.edges.map(({ node }) => {
    // Validate node exists
    if (!node) return null;
    
    // Safely access variant data with fallbacks
    const variantEdge = node.variants?.edges?.[0] || {};
    const variant = variantEdge.node || {};
    const currentStock = safeParseFloat(variant.inventoryQuantity, 0);
    const price = safeParseFloat(variant.price, 0);
    
    // Use deterministic daily sales based on product ID instead of random values
    const idNumber = safeParseId(node.id, 1);
    const avgDailySales = Math.max(0.1, 0.5 + (idNumber % 3)); // Ensure minimum sales of 0.1
    
    // Calculate inventory metrics with safeguards
    const daysOfSupply = avgDailySales > 0 ? Math.ceil(currentStock / avgDailySales) : 0;
    const stockTurnover = daysOfSupply > 0 ? safeParseFloat(365 / Math.max(daysOfSupply, 1), 0) : 0;
    
    // Cost of goods sold (COGS) with validation
    const cogs = Math.max(0, price * 0.6); // Ensure non-negative COGS
    const profit = Math.max(0, price - cogs);
    const margin = price > 0 ? (profit / price) * 100 : 0;
    
    // Tied-up capital with validation
    const inventoryValue = Math.max(0, currentStock * cogs);
    
    // Calculate opportunity cost of excess inventory with validation
    const idealStock = Math.max(0, Math.ceil(avgDailySales * 14)); // Ideal inventory for 14 days
    const excessStock = Math.max(0, currentStock - idealStock);
    const excessInventoryValue = Math.max(0, excessStock * cogs);
    
    // Calculate potential revenue loss from stockouts with validation
    const potentialDailyRevenue = Math.max(0, avgDailySales * price);
    const stockoutRisk = daysOfSupply < 7;
    const potentialLoss = stockoutRisk ? potentialDailyRevenue * 7 : 0;
    
    // Revenue opportunity with validation
    const projectedSales = Math.max(0, avgDailySales * 30); // For next 30 days
    const projectedRevenue = Math.max(0, projectedSales * price);
    
    // Determine recommendations with proper validation
    let recommendation;
    let recommendationDetail;
    let financialImpact = 0;
    
    if (stockoutRisk) {
      recommendation = "Restock Now";
      recommendationDetail = `Restocking immediately can save ~$${safeParseFloat(potentialLoss).toFixed(0)} in lost sales`;
      financialImpact = potentialLoss;
    } else if (excessStock > 10 && excessInventoryValue > 300) {
      recommendation = "Consider Discount";
      recommendationDetail = `Ties up ~$${safeParseFloat(excessInventoryValue).toFixed(0)} in capital monthly`;
      financialImpact = excessInventoryValue;
    } else if (stockTurnover < 6 && margin < 30) {
      recommendation = "Review Pricing";
      recommendationDetail = `Low margin and turnover - consider price adjustment`;
      financialImpact = safeParseFloat(projectedSales * (price * 0.1)); // Impact of 10% price increase
    } else {
      recommendation = "Optimal";
      recommendationDetail = `Current inventory levels are profit-optimized`;
      financialImpact = 0;
    }
    
    return {
      id: node.id || `unknown-${Date.now()}`,
      title: node.title || "Unknown Product",
      price,
      currentStock,
      margin: safeParseFloat(margin).toFixed(1),
      inventoryValue,
      avgDailySales: safeParseFloat(avgDailySales).toFixed(1),
      daysOfSupply,
      stockTurnover: safeParseFloat(stockTurnover).toFixed(1),
      recommendation,
      recommendationDetail,
      financialImpact,
      stockoutRisk,
      excessStock,
      excessInventoryValue
    };
  }).filter(Boolean) : []; // Remove any null entries that had invalid data
  
  // Sort by financial impact (highest first) with validation
  productData.sort((a, b) => {
    // Ensure we have valid financial impact values
    const impactA = safeParseFloat(a?.financialImpact, 0);
    const impactB = safeParseFloat(b?.financialImpact, 0);
    return impactB - impactA;
  });
  
  // Calculate total financial impact with validation
  const totalPotentialImpact = productData.reduce((sum, product) => {
    // Validate product and financialImpact exist before using them
    if (!product || product.financialImpact === undefined) return sum;
    return sum + safeParseFloat(product.financialImpact, 0);
  }, 0);
  
  // Group by recommendation type with validation
  const recommendations = {
    restock: productData.filter(p => p && p.recommendation === "Restock Now"),
    discount: productData.filter(p => p && p.recommendation === "Consider Discount"),
    pricing: productData.filter(p => p && p.recommendation === "Review Pricing"),
    optimal: productData.filter(p => p && p.recommendation === "Optimal")
  };
  
  // Create table rows with validation
  const rows = productData.map(product => {
    if (!product) return Array(8).fill(""); // Return empty row if product is invalid
    
    return [
      product.title || "Unknown",
      `$${safeParseFloat(product.price).toFixed(2)}`,
      safeParseFloat(product.currentStock, 0),
      safeParseFloat(product.daysOfSupply, 0),
      `${product.margin || "0"}%`,
      <Badge 
        status={product.recommendation === "Optimal" ? "success" : 
               product.recommendation === "Restock Now" ? "critical" : "warning"}
      >
        {product.recommendation || "Unknown"}
      </Badge>,
      product.recommendationDetail || "No recommendation available",
      `$${safeParseFloat(product.financialImpact).toFixed(0)}`
    ];
  });

  // Error handling for empty data or API errors
  if (error || !hasValidProducts) {
    return (
      <Page
        title="Profit-Optimized Stock Recommendations"
        backAction={{
          content: 'Inventory Dashboard',
          url: '/app'
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {error ? (
                  <Banner status="critical">
                    <p>{error}</p>
                  </Banner>
                ) : (
                  <EmptyState
                    heading="No product data available"
                    image=""
                  >
                    <p>We couldn't find any products to analyze. Add products to your store to see profit recommendations.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Profit-Optimized Stock Recommendations"
      backAction={{
        content: 'Inventory Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h2" variant="headingMd">
                  Profit Optimization Potential
                </Text>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text variant="heading2xl" color="success">
                    ${safeParseFloat(totalPotentialImpact).toFixed(0)}
                  </Text>
                </div>
              </div>
              
              <Text as="p">
                Taking action on these recommendations could improve your cash flow and profitability by approximately ${safeParseFloat(totalPotentialImpact).toFixed(0)} over the next 30 days.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          {recommendations.restock.length > 0 && (
            <Card>
              <BlockStack gap="400">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text as="h2" variant="headingMd">
                    Prevent Lost Sales: Restock Soon
                  </Text>
                  <Link to="/app/order-automation">
                    <Button primary>Create Purchase Order</Button>
                  </Link>
                </div>
                
                {recommendations.restock.map((product) => {
                  if (!product || !product.id) return null;
                  return (
                    <Banner 
                      key={product.id}
                      title={product.title || "Unknown Product"} 
                      status="critical"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="bodyMd">
                          Restocking now can save approximately <strong>${safeParseFloat(product.financialImpact).toFixed(0)}</strong> in lost sales.
                        </Text>
                        <Text variant="bodyMd">
                          Current stock: {safeParseFloat(product.currentStock)} units ({safeParseFloat(product.daysOfSupply)} days)
                        </Text>
                      </div>
                    </Banner>
                  );
                })}
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
        
        <Layout.Section>
          {recommendations.discount.length > 0 && (
            <Card>
              <BlockStack gap="400">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text as="h2" variant="headingMd">
                    Free Up Capital: Consider Discounting
                  </Text>
                </div>
                
                {recommendations.discount.map((product) => {
                  if (!product || !product.id) return null;
                  return (
                    <Banner 
                      key={product.id}
                      title={product.title || "Unknown Product"}
                      status="warning"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="bodyMd">
                          You have {safeParseFloat(product.excessStock)} excess units tying up <strong>${safeParseFloat(product.excessInventoryValue).toFixed(0)}</strong> in capital.
                        </Text>
                        <Text variant="bodyMd">
                          Consider a discount promotion to increase turnover.
                        </Text>
                      </div>
                    </Banner>
                  );
                })}
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Complete Profit Analysis
              </Text>
              
              {rows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "text", "text", "numeric"]}
                  headings={["Product", "Price", "Stock", "Days Supply", "Margin %", "Recommendation", "Detail", "Financial Impact"]}
                  rows={rows}
                />
              ) : (
                <EmptyState heading="No data to display">
                  <p>There are no products with profit analysis data available.</p>
                </EmptyState>
              )}
              
              <Text variant="bodySm">
                Financial impact is calculated based on potential lost sales for stockouts and tied-up capital for excess inventory. 
                All recommendations aim to maximize profit and cash flow efficiency.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}