import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, useSubmit, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  DataTable,
  Button,
  Banner,
  Badge
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, context }) => {
  // Use the authenticate helper to get access to the admin API
  const { admin, session } = await authenticate.admin(request);
  
  // Query to get products with inventory information
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
                }
              }
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  return json({ products: responseJson });
};

export default function Index() {
  const { products } = useLoaderData();
  
  const calculateRecommendation = (currentStock, salesHistory) => {
    // This is a simplified algorithm - we'll make it more sophisticated later
    // For now, it just recommends ordering if stock is below 10
    if (currentStock < 10) {
      return "Order soon";
    } else if (currentStock < 20) {
      return "Monitor closely";
    } else {
      return "Stock sufficient";
    }
  };
  
  // Transform the products data for the table
  const rows = products?.data?.products?.edges?.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    // Simulate sales history (in a real app, we'd fetch this from the API)
    const mockSalesHistory = [5, 3, 7, 4, 6]; // Last 5 days of sales
    
    return [
      node.title,
      currentStock,
      `$${variant?.price || 0}`,
      calculateRecommendation(currentStock, mockSalesHistory),
    ];
  }) || [];
  
  // Add the generateAlerts function
  const generateAlerts = (rows) => {
    const alerts = [];
    
    // Find products that are out of stock
    const outOfStock = rows.filter(row => row[1] === 0);
    if (outOfStock.length > 0) {
      alerts.push({
        title: `${outOfStock.length} products out of stock`,
        status: "critical",
        message: `The following products need immediate attention: ${outOfStock.map(row => row[0]).join(", ")}`,
        actionText: "Restock Now",
        actionUrl: "/app/order-automation"
      });
    }
    
    // Find products that need reordering soon
    const lowStock = rows.filter(row => row[3] === "Order soon" && row[1] > 0);
    if (lowStock.length > 0) {
      alerts.push({
        title: `${lowStock.length} products need reordering soon`,
        status: "warning",
        message: `Based on current sales velocity, consider reordering: ${lowStock.map(row => row[0]).join(", ")}`,
        actionText: "View Analysis",
        actionUrl: "/app/sales-analysis"
      });
    }
    
    // Simulate advanced trend detection alerts
    if (rows.length > 0) {
      // Randomly select a product for demonstration
      const trendProduct = rows[Math.floor(Math.random() * rows.length)];
      alerts.push({
        title: `Sales trend detected for ${trendProduct[0]}`,
        status: "info",
        message: `Sales of ${trendProduct[0]} are accelerating—consider restocking sooner than initially planned. Recent data shows a 25% increase in sales velocity.`,
        actionText: "Review Trend",
        actionUrl: "/app/sales-analysis"
      });
    }
    
    // Simulate seasonal alert
    const winterProducts = rows.filter(row => row[0].includes("Snowboard"));
    if (winterProducts.length > 0) {
      alerts.push({
        title: "Seasonal spike predicted for winter products",
        status: "attention",
        message: `Your holiday bestsellers (${winterProducts.map(row => row[0]).join(", ")}) are predicted to run out 2 weeks earlier than usual based on historical seasonal patterns.`,
        actionText: "Prepare for Season",
        actionUrl: "/app/seasonal-planning"
      });
    }
    
    return alerts;
  };

  return (
    <Page 
      title="SkuSight Inventory Predictions"
      primaryAction={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/app/notifications">
            <Button>Notification Center</Button>
          </Link>
          <Link to="/app/dashboard">
            <Button>Visual Dashboard</Button>
          </Link>
          <Link to="/app/sales-analysis">
            <Button>View Sales Analysis</Button>
          </Link>
          <Link to="/app/order-automation">
            <Button primary>Automated Ordering</Button>
          </Link>
        </div>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        {generateAlerts(rows).map((alert, index) => (
          <div key={index} style={{ marginBottom: '12px' }}>
            <Banner
              title={alert.title}
              status={alert.status}
              onDismiss={() => {}}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ marginRight: '12px' }}>{alert.message}</p>
                <div>
                  <Link to={alert.actionUrl}>
                    <Button>{alert.actionText}</Button>
                  </Link>
                </div>
              </div>
            </Banner>
          </div>
        ))}
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Inventory Summary
              </Text>
              <BlockStack gap="200">
                <Text>Total Products: {rows.length}</Text>
                <Text>Products Needing Attention: {rows.filter(row => row[3] === "Order soon").length}</Text>
                <Text>Last Updated: {new Date().toLocaleString()}</Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Current Inventory Status
              </Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "text"]}
                headings={["Product", "Current Stock", "Price", "Restock Recommendation"]}
                rows={rows}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        
        {/* Added new Inventory Health Overview section with reorder buttons */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Inventory Health Overview
              </Text>
              <BlockStack gap="400">
                {rows.map((row, index) => {
                  let status = "success";
                  let label = "Healthy";
                  
                  if (row[1] === 0) {
                    status = "critical";
                    label = "Out of Stock";
                  } else if (row[3] === "Order soon") {
                    status = "warning";
                    label = "Reorder Now";
                  } else if (row[3] === "Monitor closely") {
                    status = "attention";
                    label = "Monitor";
                  }
                  
                  return (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text variant="bodyMd">{row[0]}</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge status={status}>{label}</Badge>
                        {(status === "warning" || status === "critical") && (
                          <Link to={`/app/order-automation`}>
                            <Button size="slim">Reorder</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}