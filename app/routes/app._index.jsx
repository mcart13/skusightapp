import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
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
import { getSettings, applySettingsToCalculations, subscribeToSettingsChanges } from "../utils/settings";

export const loader = async ({ request }) => {
  // Import server-only modules inside loader function
  const { authenticateRoute } = await import("../utils/auth");
  
  try {
    // Use our custom auth utility that handles testingstore
    const { admin, session, isTestStore } = await authenticateRoute(request);
    
    // If it's a test store, return mock data
    if (isTestStore) {
      return json({
        products: {
          data: {
            products: {
              edges: [
                {
                  node: {
                    id: "gid://shopify/Product/1",
                    title: "Example Snowboard",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/1",
                            inventoryQuantity: 15,
                            price: "159.99",
                            sku: "SNOW-001"
                          }
                        }
                      ]
                    }
                  }
                },
                {
                  node: {
                    id: "gid://shopify/Product/2",
                    title: "Winter Jacket",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/2",
                            inventoryQuantity: 8,
                            price: "249.99",
                            sku: "WJ-001"
                          }
                        }
                      ]
                    }
                  }
                },
                {
                  node: {
                    id: "gid://shopify/Product/3",
                    title: "Gift Card",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/3",
                            inventoryQuantity: 0,
                            price: "50.00",
                            sku: "GC-001"
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      });
    }
    
    // Normal flow for authenticated stores
    try {
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
      return json({ products: responseJson });
    } catch (graphqlError) {
      console.error("GraphQL query error:", graphqlError);
      // Return fallback or empty data rather than failing completely
      return json({ 
        products: { data: { products: { edges: [] } } },
        error: "Failed to fetch products data" 
      });
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return json({ 
      products: { data: { products: { edges: [] } } },
      error: "Authentication failed" 
    });
  }
};

export default function Index() {
  const { products, error } = useLoaderData();
  // Initialize with the latest settings and keep a reference to the settings object
  const [appSettings, setAppSettings] = useState(() => getSettings());
  
  // Subscribe to settings changes with error handling
  useEffect(() => {
    let isSubscribed = true;
    
    try {
      const unsubscribe = subscribeToSettingsChanges((newSettings) => {
        try {
          // Only update state if component is still mounted
          if (isSubscribed) {
            setAppSettings(prevSettings => ({
              ...prevSettings,
              ...newSettings
            }));
          }
        } catch (callbackError) {
          console.error("Error in settings update callback:", callbackError);
        }
      });
      
      // Cleanup function that will run when component unmounts
      return () => {
        isSubscribed = false;
        try {
          unsubscribe();
        } catch (unsubscribeError) {
          console.error("Error during unsubscribe:", unsubscribeError);
        }
      };
    } catch (subscriptionError) {
      console.error("Error setting up settings subscription:", subscriptionError);
      // Return empty cleanup function if subscription failed
      return () => {};
    }
  }, []);
  
  const calculateRecommendation = (currentStock, dailySales) => {
    try {
      // Use settings-based calculation
      const calculations = applySettingsToCalculations({inventoryQuantity: currentStock}, dailySales);
      
      if (currentStock <= 0) {
        return "Out of stock";
      } else if (currentStock <= calculations.criticalStockLevel) {
        return "Order now";
      } else if (currentStock <= calculations.lowStockLevel) {
        return "Order soon";
      } else if (currentStock <= calculations.reorderPoint) {
        return "Monitor closely";
      } else {
        return "Stock sufficient";
      }
    } catch (error) {
      console.error("Error calculating recommendation:", error);
      return "Calculation error";
    }
  };
  
  // Transform the products data for the table with error handling
  const rows = (() => {
    try {
      return products?.data?.products?.edges?.map(({ node }) => {
        const variant = node.variants.edges[0]?.node;
        const currentStock = variant?.inventoryQuantity || 0;
        // Generate a deterministic SKU if one doesn't exist
        const idNumber = parseInt(node.id.replace(/\D/g, '')) || 1;
        const sku = variant?.sku || `SKU-${node.title.substring(0, 3).toUpperCase()}-${idNumber.toString().padStart(3, '0')}`;
        // Simulate sales history (in a real app, we'd fetch this from the API)
        const mockSalesHistory = [5, 3, 7, 4, 6]; // Last 5 days of sales
        const dailySales = mockSalesHistory.reduce((sum, val) => sum + val, 0) / mockSalesHistory.length;
        
        return [
          node.title,
          currentStock,
          `$${variant?.price || 0}`,
          calculateRecommendation(currentStock, dailySales),
          sku, // Add SKU to the data
        ];
      }) || [];
    } catch (dataError) {
      console.error("Error processing product data:", dataError);
      return []; // Return empty array on error
    }
  })();
  
  // Add the generateAlerts function
  const generateAlerts = (rows) => {
    try {
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
        // Always select the first product instead of a random one
        const trendProduct = rows[0];
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
    } catch (alertError) {
      console.error("Error generating alerts:", alertError);
      return []; // Return empty array on error
    }
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
          <Link to="/app/profit-recommendations">
            <Button>Profit Maxing</Button>
          </Link>
          <Link to="/app/system-status">
            <Button>System Status</Button>
          </Link>
          <Link to="/app/logs">
            <Button>Logs & Monitoring</Button>
          </Link>
          <Link to="/app/settings">
            <Button>Settings</Button>
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
                <Text>Products Needing Attention: {rows.filter(row => row[3] === "Order soon" || row[3] === "Order now").length}</Text>
                <Text>Last Updated: {new Date().toLocaleString()}</Text>
                <Text>
                  Lead Time Setting: {appSettings.leadTime} days | Safety Stock: {appSettings.safetyStockDays} days
                </Text>
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
                columnContentTypes={["text", "numeric", "numeric", "text", "text"]}
                headings={["Product", "Current Stock", "Price", "Restock Recommendation", "SKU"]}
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
                  } else if (row[3] === "Order now") {
                    status = "critical";
                    label = "Reorder Now";
                  } else if (row[3] === "Order soon") {
                    status = "warning";
                    label = "Reorder Soon";
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