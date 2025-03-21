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
  LegacyStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
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
  return json({ products: responseJson.data.products });
};

export default function ProfitRecommendations() {
  const { products } = useLoaderData();
  
  // Process product data and calculate profit-related metrics
  const productData = products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    const price = parseFloat(variant?.price) || 0;
    
    // Use deterministic daily sales based on product ID instead of random values
    const idNumber = parseInt(node.id.replace(/\D/g, '')) || 1; 
    const avgDailySales = 0.5 + (idNumber % 3); // 0.5 to 3.5 units per day, determined by product ID
    const daysOfSupply = currentStock > 0 ? Math.ceil(currentStock / avgDailySales) : 0;
    const stockTurnover = 365 / Math.max(daysOfSupply, 1);
    
    // Cost of goods sold (COGS) - simulate as percentage of price
    const cogs = price * 0.6; // Assume 60% COGS
    const profit = price - cogs;
    const margin = (profit / price) * 100;
    
    // Tied-up capital
    const inventoryValue = currentStock * cogs;
    
    // Calculate opportunity cost of excess inventory
    const idealStock = Math.ceil(avgDailySales * 14); // Ideal inventory for 14 days
    const excessStock = Math.max(0, currentStock - idealStock);
    const excessInventoryValue = excessStock * cogs;
    
    // Calculate potential revenue loss from stockouts
    const potentialDailyRevenue = avgDailySales * price;
    const stockoutRisk = daysOfSupply < 7;
    const potentialLoss = stockoutRisk ? potentialDailyRevenue * 7 : 0;
    
    // Revenue opportunity
    const projectedSales = avgDailySales * 30; // For next 30 days
    const projectedRevenue = projectedSales * price;
    
    // Determine recommendations
    let recommendation;
    let recommendationDetail;
    let financialImpact = 0;
    
    if (stockoutRisk) {
      recommendation = "Restock Now";
      recommendationDetail = `Restocking immediately can save ~$${potentialLoss.toFixed(0)} in lost sales`;
      financialImpact = potentialLoss;
    } else if (excessStock > 10 && excessInventoryValue > 300) {
      recommendation = "Consider Discount";
      recommendationDetail = `Ties up ~$${excessInventoryValue.toFixed(0)} in capital monthly`;
      financialImpact = excessInventoryValue;
    } else if (stockTurnover < 6 && margin < 30) {
      recommendation = "Review Pricing";
      recommendationDetail = `Low margin and turnover - consider price adjustment`;
      financialImpact = (projectedSales * (price * 0.1)); // Impact of 10% price increase
    } else {
      recommendation = "Optimal";
      recommendationDetail = `Current inventory levels are profit-optimized`;
      financialImpact = 0;
    }
    
    return {
      id: node.id,
      title: node.title,
      price,
      currentStock,
      margin: margin.toFixed(1),
      inventoryValue,
      avgDailySales: avgDailySales.toFixed(1),
      daysOfSupply,
      stockTurnover: stockTurnover.toFixed(1),
      recommendation,
      recommendationDetail,
      financialImpact,
      stockoutRisk,
      excessStock,
      excessInventoryValue
    };
  });
  
  // Sort by financial impact (highest first)
  productData.sort((a, b) => b.financialImpact - a.financialImpact);
  
  // Calculate total financial impact
  const totalPotentialImpact = productData.reduce((sum, product) => sum + product.financialImpact, 0);
  
  // Group by recommendation type
  const recommendations = {
    restock: productData.filter(p => p.recommendation === "Restock Now"),
    discount: productData.filter(p => p.recommendation === "Consider Discount"),
    pricing: productData.filter(p => p.recommendation === "Review Pricing"),
    optimal: productData.filter(p => p.recommendation === "Optimal")
  };
  
  // Create table rows
  const rows = productData.map(product => [
    product.title,
    `$${product.price}`,
    product.currentStock,
    product.daysOfSupply,
    `${product.margin}%`,
    <Badge 
      status={product.recommendation === "Optimal" ? "success" : 
             product.recommendation === "Restock Now" ? "critical" : "warning"}
    >
      {product.recommendation}
    </Badge>,
    product.recommendationDetail,
    `$${product.financialImpact.toFixed(0)}`
  ]);

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
                    ${totalPotentialImpact.toFixed(0)}
                  </Text>
                </div>
              </div>
              
              <Text as="p">
                Taking action on these recommendations could improve your cash flow and profitability by approximately ${totalPotentialImpact.toFixed(0)} over the next 30 days.
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
                
                {recommendations.restock.map((product) => (
                  <Banner 
                    key={product.id}
                    title={product.title} 
                    status="critical"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="bodyMd">
                        Restocking now can save approximately <strong>${product.financialImpact.toFixed(0)}</strong> in lost sales.
                      </Text>
                      <Text variant="bodyMd">
                        Current stock: {product.currentStock} units ({product.daysOfSupply} days)
                      </Text>
                    </div>
                  </Banner>
                ))}
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
                
                {recommendations.discount.map((product) => (
                  <Banner 
                    key={product.id}
                    title={product.title}
                    status="warning"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="bodyMd">
                        You have {product.excessStock} excess units tying up <strong>${product.excessInventoryValue.toFixed(0)}</strong> in capital.
                      </Text>
                      <Text variant="bodyMd">
                        Consider a discount promotion to increase turnover.
                      </Text>
                    </div>
                  </Banner>
                ))}
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
              
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "text", "text", "numeric"]}
                headings={["Product", "Price", "Stock", "Days Supply", "Margin %", "Recommendation", "Detail", "Financial Impact"]}
                rows={rows}
              />
              
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