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
  InlineStack,
  Box,
  Divider,
  EmptyState,
  SkeletonBodyText,
  SkeletonDisplayText,
  Tooltip,
  Icon
} from "@shopify/polaris";
import { AlertDiamondIcon } from "@shopify/polaris-icons";
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
  const [isLoading, setIsLoading] = useState(true);
  
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
      
      // Simulate loading state for better UX
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing from settings changes:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up settings subscription:", error);
      setIsLoading(false);
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
              <Card.Section>
                <EmptyState
                  heading="Error Loading Dashboard"
                  image={null}
                  action={{content: 'Retry', onAction: () => window.location.reload()}}
                >
                  <p>{error}</p>
                  <p>Please try refreshing the page or contact support if the problem persists.</p>
                </EmptyState>
              </Card.Section>
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
  
  if (isLoading) {
    return (
      <Page title="Visual Inventory Dashboard" backAction={{content: 'Main Dashboard', url: '/app'}}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={3} />
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={5} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
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
              
              <BlockStack gap="400">
                {/* Health Meter - using Polaris tokens and improved accessibility */}
                <InlineStack gap="400" align="space-between">
                  <Box 
                    background="bg-surface-secondary" 
                    borderRadius="300" 
                    padding="100" 
                    width="100%"
                    minHeight="32px"
                    role="progressbar"
                    aria-label="Inventory health distribution"
                  >
                    <Box 
                      background="bg-critical"
                      borderRadiusStartStart="300"
                      borderRadiusEndStart={healthPercentages.critical === 100 ? "300" : "0"}
                      height="100%"
                      minHeight="16px"
                      width={`${healthPercentages.critical}%`}
                      display="inline-block"
                    />
                    <Box 
                      background="bg-warning"
                      borderRadius={healthPercentages.critical === 0 && healthPercentages.warning === 100 ? "300" : "0"}
                      height="100%"
                      minHeight="16px"
                      width={`${healthPercentages.warning}%`}
                      display="inline-block"
                    />
                    <Box 
                      background="bg-highlight"
                      borderRadius={healthPercentages.critical === 0 && healthPercentages.warning === 0 && healthPercentages.attention === 100 ? "300" : "0"}
                      height="100%"
                      minHeight="16px"
                      width={`${healthPercentages.attention}%`}
                      display="inline-block"
                    />
                    <Box 
                      background="bg-success"
                      borderRadiusEndEnd="300"
                      borderRadiusStartEnd={healthPercentages.success === 100 ? "300" : "0"}
                      height="100%"
                      minHeight="16px"
                      width={`${healthPercentages.success}%`}
                      display="inline-block"
                    />
                  </Box>
                  
                  <InlineStack gap="200">
                    <Tooltip content="Critical inventory levels">
                      <Badge status="critical">{inventoryHealthCounts.critical}</Badge>
                    </Tooltip>
                    <Tooltip content="Warning inventory levels">
                      <Badge status="warning">{inventoryHealthCounts.warning}</Badge>
                    </Tooltip>
                    <Tooltip content="Items to monitor">
                      <Badge status="attention">{inventoryHealthCounts.attention}</Badge>
                    </Tooltip>
                    <Tooltip content="Healthy inventory levels">
                      <Badge status="success">{inventoryHealthCounts.success}</Badge>
                    </Tooltip>
                  </InlineStack>
                </InlineStack>
                
                <BlockStack gap="100">
                  <Text>
                    {inventoryHealthCounts.critical + inventoryHealthCounts.warning === 0 
                      ? "All products have healthy inventory levels" 
                      : `${inventoryHealthCounts.critical + inventoryHealthCounts.warning} products need attention`}
                  </Text>
                  <Text variant="bodySm" color="subdued">
                    Using lead time of {appSettings.leadTime} days and safety stock of {appSettings.safetyStockDays} days
                  </Text>
                </BlockStack>
              </BlockStack>
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
                    <Card key={product.id} background={product.status === 'critical' ? 'bg-critical-subdued' : 'bg-warning-subdued'}>
                      <BlockStack gap="400">
                        <InlineStack gap="400" align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              {product.status === 'critical' && (
                                <Icon source={AlertDiamondIcon} tone="critical" />
                              )}
                              <Text variant="headingSm">{product.title}</Text>
                            </InlineStack>
                            <InlineStack gap="200" blockAlign="center">
                              <Badge status={product.status}>{product.statusLabel}</Badge>
                              <Text variant="bodySm">
                                {product.daysOfSupply === 0 
                                  ? 'Currently out of stock' 
                                  : `${product.daysOfSupply} days of inventory left`}
                              </Text>
                            </InlineStack>
                          </BlockStack>
                          
                          <Link to="/app/order-automation">
                            <Button primary={product.status === 'critical'}>
                              {product.status === 'critical' ? 'Restock Now' : 'Reorder'}
                            </Button>
                          </Link>
                        </InlineStack>
                        
                        {product.daysOfSupply > 0 && (
                          <BlockStack gap="100">
                            <InlineStack gap="400" align="space-between">
                              <Text variant="bodySm">Inventory Timeline</Text>
                              <Text variant="bodySm">{product.daysOfSupply} days</Text>
                            </InlineStack>
                            <ProgressBar 
                              progress={Math.min(100, (product.daysOfSupply / (Math.max(1, appSettings.safetyStockDays + appSettings.leadTime))) * 100)} 
                              size="small"
                              tone={product.status === 'critical' ? 'critical' : 'warning'}
                              aria-label={`${product.title} inventory: ${product.daysOfSupply} days remaining`}
                            />
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              ) : (
                <EmptyState
                  heading="All products have healthy inventory levels"
                  image=""
                >
                  <p>Your inventory is currently in a good state. Continue monitoring for changes.</p>
                </EmptyState>
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
                  <BlockStack key={product.id} gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd">{product.title}</Text>
                      <Badge status={product.status}>{product.statusLabel}</Badge>
                    </InlineStack>
                    
                    <BlockStack gap="100">
                      <Box padding="200" background="bg-surface-secondary" borderRadius="300">
                        {/* Timeline markers with improved accessibility */}
                        <InlineStack gap="400" align="space-between">
                          <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.25)}d</Text>
                          <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.5)}d</Text>
                          <Text variant="bodySm" color="subdued">{Math.ceil(appSettings.safetyStockDays * 0.75)}d</Text>
                        </InlineStack>
                        
                        {/* Inventory progress */}
                        <Box paddingBlock="200">
                          <ProgressBar 
                            progress={Math.min(100, (product.daysOfSupply / Math.max(1, appSettings.safetyStockDays)) * 100)} 
                            size="small"
                            tone={
                              product.status === 'critical' ? 'critical' : 
                              product.status === 'warning' ? 'warning' :
                              product.status === 'attention' ? 'highlight' : 'success'
                            }
                            aria-label={`${product.title} inventory: ${product.daysOfSupply} days supply out of ${appSettings.safetyStockDays} days target`}
                          />
                        </Box>
                      </Box>
                    </BlockStack>
                    
                    {product.id !== productData[productData.length-1].id && <Divider />}
                  </BlockStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}