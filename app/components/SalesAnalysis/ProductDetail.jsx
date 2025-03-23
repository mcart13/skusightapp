import { Card, Text, BlockStack, Button, Badge, List, Select } from "@shopify/polaris";
import { generateExplanation } from "../../services/salesAnalysis";
import { useState } from "react";
import styles from "./ProductDetail.module.css";

/**
 * ProductDetail component for displaying detailed sales analysis for a product
 */
export function ProductDetail({ product, onBack }) {
  const [forecastPeriod, setForecastPeriod] = useState("30");
  
  if (!product) {
    return null;
  }
  
  // Generate explanations for the forecast
  const explanations = generateExplanation(product);
  
  // Calculate forecast based on current data and selected period
  const forecastDays = parseInt(forecastPeriod, 10);
  const forecastedUnits = Math.round(product.dailySales * forecastDays);
  
  // Calculate days of inventory
  const daysOfInventory = product.stockLevel > 0 && product.dailySales > 0
    ? Math.round(product.stockLevel / product.dailySales)
    : 0;
  
  // Determine if inventory is at risk
  const inventoryAtRisk = daysOfInventory < 14;
  
  // Determine reorder recommendation
  const shouldReorder = daysOfInventory < product.leadTime * 1.5;
  
  return (
    <Card>
      <BlockStack gap="4">
        <BlockStack gap="1">
          <Button 
            plain
            onClick={onBack}
            icon={
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12 16a.997.997 0 0 1-.707-.293l-5-5a.999.999 0 0 1 0-1.414l5-5a.999.999 0 1 1 1.414 1.414L8.414 10l4.293 4.293A.999.999 0 0 1 12 16Z" />
              </svg>
            }
          >
            Back to all products
          </Button>
          
          <Text variant="headingLg" fontWeight="bold">
            {product.title}
          </Text>
          
          <Text variant="bodySm" color="subdued">
            SKU: {product.sku || 'N/A'}
          </Text>
        </BlockStack>
        
        <div className={styles.statsGrid}>
          <Card>
            <BlockStack gap="1">
              <Text variant="headingSm">Current Stock</Text>
              <Text variant="headingLg" fontWeight="bold">{product.stockLevel}</Text>
              <Text variant="bodySm" color={daysOfInventory < 7 ? 'critical' : (daysOfInventory < 14 ? 'warning' : 'success')}>
                {daysOfInventory} days remaining
              </Text>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="1">
              <Text variant="headingSm">Daily Sales</Text>
              <Text variant="headingLg" fontWeight="bold">{product.dailySales.toFixed(1)}</Text>
              <Text variant="bodySm" color={product.trend > 0 ? 'success' : (product.trend < 0 ? 'critical' : 'subdued')}>
                {product.trend > 0 ? '+' : ''}{product.trend}% trend
              </Text>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="1">
              <Text variant="headingSm">Monthly Volume</Text>
              <Text variant="headingLg" fontWeight="bold">{product.monthlyVolume}</Text>
              <Text variant="bodySm" color="subdued">units per month</Text>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="1">
              <Text variant="headingSm">Profit Margin</Text>
              <Text variant="headingLg" fontWeight="bold">{product.profitMargin}%</Text>
              <Text variant="bodySm" color="subdued">${(product.avgUnitPrice * (product.profitMargin / 100)).toFixed(2)} per unit</Text>
            </BlockStack>
          </Card>
        </div>
        
        <Card>
          <BlockStack gap="4">
            <Text variant="headingMd">Sales Forecast</Text>
            
            <div className={styles.forecastContainer}>
              <div>
                <BlockStack gap="1">
                  <Text variant="headingSm">Forecast Period</Text>
                  <Select
                    value={forecastPeriod}
                    onChange={setForecastPeriod}
                    options={[
                      { label: '7 days', value: '7' },
                      { label: '14 days', value: '14' },
                      { label: '30 days', value: '30' },
                      { label: '60 days', value: '60' },
                      { label: '90 days', value: '90' }
                    ]}
                  />
                </BlockStack>
              </div>
              
              <div>
                <BlockStack gap="1">
                  <Text variant="headingSm">Forecasted Sales</Text>
                  <Text variant="headingLg" fontWeight="bold">{forecastedUnits}</Text>
                  <Text variant="bodySm" color="subdued">units in {forecastDays} days</Text>
                </BlockStack>
              </div>
              
              <div>
                <BlockStack gap="1">
                  <Text variant="headingSm">Recommended Action</Text>
                  {shouldReorder ? (
                    <Badge tone="warning">Reorder Soon</Badge>
                  ) : (
                    <Badge tone="success">Inventory Healthy</Badge>
                  )}
                  <Text variant="bodySm" color="subdued">
                    {shouldReorder 
                      ? `Order within ${Math.max(0, daysOfInventory - product.leadTime)} days` 
                      : 'No action needed yet'}
                  </Text>
                </BlockStack>
              </div>
            </div>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="4">
            <Text variant="headingMd">Forecast Explanation</Text>
            
            <List type="bullet">
              {explanations.map((item, index) => (
                <List.Item key={index}>
                  <Text fontWeight="semibold">{item.factor} ({item.impact})</Text>: {item.description}
                </List.Item>
              ))}
            </List>
            
            {product.trendAlert && (
              <Card tone="warning">
                <Text variant="bodyMd">{product.trendAlert.message}</Text>
              </Card>
            )}
            
            {product.seasonalAlert && (
              <Card tone="info">
                <Text variant="bodyMd">{product.seasonalAlert.message}</Text>
              </Card>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
} 