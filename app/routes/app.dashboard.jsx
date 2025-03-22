import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  ProgressBar,
  Badge,
  Icon,
  Box,
  LegacyStack
} from "@shopify/polaris";
import { getSettings, applySettingsToCalculations, subscribeToSettingsChanges } from "../utils/settings";

export const loader = async ({ request }) => {
  // Import server-only modules inside the loader function
  const { authenticateRoute } = await import("../utils/auth");
  
  try {
    // Use our custom auth utility that handles testingstore
    const { admin, isTestStore } = await authenticateRoute(request);
    
    // If it's a test store, return simulated data
    if (isTestStore) {
      // Return simulated product data for testingstore
      return json({
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
                        price: "159.99"
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
                        price: "249.99"
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
                        price: "50.00"
                      }
                    }
                  ]
                }
              }
            }
          ]
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
    } catch (graphqlError) {
      console.error("GraphQL query error:", graphqlError);
      return json({ 
        products: { edges: [] },
        error: "Failed to fetch products data" 
      });
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return json({ 
      products: { edges: [] },
      error: "Authentication failed" 
    });
  }
};

export default function Dashboard() {
  const { products, error } = useLoaderData();
  const [appSettings, setAppSettings] = useState(getSettings());
  
  // Subscribe to settings changes with error handling
  useEffect(() => {
    let isSubscribed = true;
    
    try {
      const unsubscribe = subscribeToSettingsChanges((newSettings) => {
        if (isSubscribed) {
          setAppSettings(prevSettings => ({
            ...prevSettings,
            ...newSettings
          }));
        }
      });
      
      return () => {
        isSubscribed = false;
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing from settings changes:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up settings subscription:", error);
      return () => {};
    }
  }, []);
  
  // Process product data to include inventory health metrics
  const productData = (products?.edges || []).map(({ node }) => {
    try {
      const variant = node.variants.edges[0]?.node;
      const currentStock = variant?.inventoryQuantity || 0;
      
      // Use deterministic daily sales based on product ID instead of random values
      const idNumber = parseInt(node.id.replace(/\D/g, '')) || 1;
      const avgDailySales = 0.5 + (idNumber % 3); // 0.5 to 3.5 units per day, determined by product ID
      
      // Use settings to determine inventory status
      const calculations = applySettingsToCalculations(
        { inventoryQuantity: currentStock },
        avgDailySales
      );
      
      const daysOfSupply = calculations.daysUntilStockout;
      
      // Determine inventory status
      let status = "success";
      let statusLabel = "Healthy";
      
      if (currentStock === 0) {
        status = "critical";
        statusLabel = "Out of Stock";
      } else if (currentStock <= calculations.criticalStockLevel) {
        status = "critical";
        statusLabel = "Critical Stock";
      } else if (currentStock <= calculations.lowStockLevel) {
        status = "warning";
        statusLabel = "Low Stock";
      } else if (currentStock <= calculations.reorderPoint) {
        status = "attention";
        statusLabel = "Monitor";
      }
      
      return {
        id: node.id,
        title: node.title,
        currentStock,
        avgDailySales,
        daysOfSupply,
        status,
        statusLabel,
        price: variant?.price || 0,
        calculations
      };
    } catch (error) {
      console.error("Error processing product:", error, node);
      return null;
    }
  }).filter(Boolean); // Remove any null entries that had errors
  
  // Display error message if we encountered one
  if (error && productData.length === 0) {
    return (
      <Page title="Visual Inventory Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd" color="critical">
                  Error Loading Dashboard
                </Text>
                <Text>{error}</Text>
                <Text>Please try refreshing the page or contact support if the problem persists.</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  // Sort by inventory health (most critical first)
  productData.sort((a, b) => {
    const statusWeight = { critical: 3, warning: 2, attention: 1, success: 0 };
    const aWeight = statusWeight[a.status] || 0;
    const bWeight = statusWeight[b.status] || 0;
    return bWeight - aWeight;
  });
  
  // Calculate overall inventory health metrics
  const inventoryHealthCounts = {
    critical: productData.filter(p => p.status === "critical").length,
    warning: productData.filter(p => p.status === "warning").length,
    attention: productData.filter(p => p.status === "attention").length,
    success: productData.filter(p => p.status === "success").length
  };
  
  const totalProducts = productData.length || 1; // Prevent divide by zero
  const healthPercentages = {
    critical: (inventoryHealthCounts.critical / totalProducts) * 100,
    warning: (inventoryHealthCounts.warning / totalProducts) * 100,
    attention: (inventoryHealthCounts.attention / totalProducts) * 100,
    success: (inventoryHealthCounts.success / totalProducts) * 100
  };
  
  // Get products needing immediate action
  const priorityProducts = productData.filter(p => p.status === "critical" || p.status === "warning");
  
  return (
    <Page
      title="Visual Inventory Dashboard"
      backAction={{
        content: 'Main Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Inventory Health Overview
              </Text>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '24px', display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${healthPercentages.critical}%`, backgroundColor: '#DE3618' }}></div>
                    <div style={{ width: `${healthPercentages.warning}%`, backgroundColor: '#EEC200' }}></div>
                    <div style={{ width: `${healthPercentages.attention}%`, backgroundColor: '#9C6ADE' }}></div>
                    <div style={{ width: `${healthPercentages.success}%`, backgroundColor: '#108043' }}></div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge status="critical">{inventoryHealthCounts.critical}</Badge>
                  <Badge status="warning">{inventoryHealthCounts.warning}</Badge>
                  <Badge status="attention">{inventoryHealthCounts.attention}</Badge>
                  <Badge status="success">{inventoryHealthCounts.success}</Badge>
                </div>
              </div>
              
              <div>
                <Text>{inventoryHealthCounts.critical + inventoryHealthCounts.warning} products need attention</Text>
                <Text variant="bodySm" color="subdued">
                  Using lead time of {appSettings.leadTime} days and safety stock of {appSettings.safetyStockDays} days
                </Text>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Priority Actions
              </Text>
              
              {priorityProducts.length > 0 ? (
                <BlockStack gap="400">
                  {priorityProducts.map(product => (
                    <div 
                      key={product.id} 
                      style={{ 
                        padding: '12px', 
                        backgroundColor: product.status === 'critical' ? '#FFF4F4' : '#FFFBEA',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <Text variant="headingSm">{product.title}</Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <Badge status={product.status}>{product.statusLabel}</Badge>
                            <Text variant="bodySm">
                              {product.daysOfSupply === 0 
                                ? 'Currently out of stock' 
                                : `${product.daysOfSupply} days of inventory left`}
                            </Text>
                          </div>
                        </div>
                        
                        <Link to="/app/order-automation">
                          <Button primary={product.status === 'critical'}>
                            {product.status === 'critical' ? 'Restock Now' : 'Reorder'}
                          </Button>
                        </Link>
                      </div>
                      
                      {product.daysOfSupply > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Text variant="bodySm">Inventory Timeline</Text>
                            <Text variant="bodySm">{product.daysOfSupply} days</Text>
                          </div>
                          <ProgressBar 
                            progress={Math.min(100, (product.daysOfSupply / (Math.max(1, appSettings.safetyStockDays + appSettings.leadTime))) * 100)} 
                            size="small"
                            color={product.status === 'critical' ? 'critical' : 'warning'}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </BlockStack>
              ) : (
                <Text>All products have healthy inventory levels</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Inventory Timeline Visualization
              </Text>
              
              <BlockStack gap="400">
                {productData.map(product => (
                  <div key={product.id} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text variant="bodyMd">{product.title}</Text>
                      <Badge status={product.status}>{product.statusLabel}</Badge>
                    </div>
                    
                    <div style={{ position: 'relative', height: '32px', background: '#F4F6F8', borderRadius: '3px' }}>
                      {/* Timeline with key markers */}
                      <div style={{ position: 'absolute', left: '25%', top: 0, height: '100%', borderLeft: '1px dashed #637381', paddingLeft: '4px' }}>
                        <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.25)}d</Text>
                      </div>
                      
                      <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', borderLeft: '1px dashed #637381', paddingLeft: '4px' }}>
                        <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.5)}d</Text>
                      </div>
                      
                      <div style={{ position: 'absolute', left: '75%', top: 0, height: '100%', borderLeft: '1px dashed #637381', paddingLeft: '4px' }}>
                        <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.75)}d</Text>
                      </div>
                      
                      {/* Inventory remaining indicator */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: '6px',
                          height: '20px', 
                          width: `${Math.min(100, (product.daysOfSupply / Math.max(1, appSettings.safetyStockDays)) * 100)}%`,
                          background: getTimelineColor(product.status),
                          borderRadius: '2px'
                        }}
                      ></div>
                      
                      {/* Stock out indicator */}
                      {product.daysOfSupply < appSettings.safetyStockDays && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            left: `${Math.min(100, (product.daysOfSupply / Math.max(1, appSettings.safetyStockDays)) * 100)}%`, 
                            top: 0,
                            height: '32px', 
                            width: '2px',
                            background: '#DE3618'
                          }}
                        ></div>
                      )}
                      
                      {/* Reorder point indicator - added safety check for divide by zero */}
                      {product.currentStock > 0 && product.calculations.reorderPoint < product.currentStock && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            left: `${Math.min(100, (product.calculations.reorderPoint / product.currentStock) * 100)}%`, 
                            top: 0,
                            height: '32px', 
                            width: '2px',
                            background: '#8c6e00'
                          }}
                        ></div>
                      )}
                    </div>
                  </div>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// Helper function to get the appropriate color for timeline visualization
function getTimelineColor(status) {
  if (!status) {
    return '#AEE9AF'; // Default fallback color for undefined status
  }
  
  switch (status) {
    case 'critical':
      return '#FADBD7';
    case 'warning':
      return '#FFEB99';
    case 'attention':
      return '#E4D6FF';
    case 'success':
      return '#AEE9AF';
    default:
      return '#AEE9AF'; // Default color
  }
}