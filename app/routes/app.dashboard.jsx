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
  ProgressBar,
  Badge,
  Icon,
  Box,
  LegacyStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Query to get products
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
};

export default function Dashboard() {
  const { products } = useLoaderData();
  
  // Process product data to include inventory health metrics
  const productData = products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    
    // Simulate sales data and calculate metrics
    const avgDailySales = Math.random() * 3 + 0.5; // 0.5 to 3.5 units per day
    const daysOfSupply = currentStock > 0 ? Math.ceil(currentStock / avgDailySales) : 0;
    
    // Determine inventory status
    let status = "success";
    let statusLabel = "Healthy";
    
    if (currentStock === 0) {
      status = "critical";
      statusLabel = "Out of Stock";
    } else if (daysOfSupply < 7) {
      status = "warning";
      statusLabel = "Low Stock";
    } else if (daysOfSupply < 14) {
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
      price: variant?.price || 0
    };
  });
  
  // Sort by inventory health (most critical first)
  productData.sort((a, b) => {
    const statusWeight = { critical: 3, warning: 2, attention: 1, success: 0 };
    return statusWeight[b.status] - statusWeight[a.status];
  });
  
  // Calculate overall inventory health metrics
  const inventoryHealthCounts = {
    critical: productData.filter(p => p.status === "critical").length,
    warning: productData.filter(p => p.status === "warning").length,
    attention: productData.filter(p => p.status === "attention").length,
    success: productData.filter(p => p.status === "success").length
  };
  
  const totalProducts = productData.length;
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
              
              <Text>
                {inventoryHealthCounts.critical + inventoryHealthCounts.warning} products need attention
              </Text>
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
                            progress={Math.min(100, (product.daysOfSupply / 30) * 100)} 
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
                        <Text variant="bodySm" color="subdued">7d</Text>
                      </div>
                      
                      <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', borderLeft: '1px dashed #637381', paddingLeft: '4px' }}>
                        <Text variant="bodySm" color="subdued">14d</Text>
                      </div>
                      
                      <div style={{ position: 'absolute', left: '75%', top: 0, height: '100%', borderLeft: '1px dashed #637381', paddingLeft: '4px' }}>
                        <Text variant="bodySm" color="subdued">21d</Text>
                      </div>
                      
                      {/* Inventory remaining indicator */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: '6px',
                          height: '20px', 
                          width: `${Math.min(100, (product.daysOfSupply / 30) * 100)}%`,
                          background: getTimelineColor(product.status),
                          borderRadius: '2px'
                        }}
                      ></div>
                      
                      {/* Stock out indicator */}
                      {product.daysOfSupply < 30 && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            left: `${Math.min(100, (product.daysOfSupply / 30) * 100)}%`, 
                            top: 0,
                            height: '32px', 
                            width: '2px',
                            background: '#DE3618'
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
      return '#AEE9AF';
  }
}