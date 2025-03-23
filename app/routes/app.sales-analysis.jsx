import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Banner,
  Button
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState, useMemo } from "react";
import { 
  transformSalesData,
  detectSalesTrends
} from "../services/salesAnalysis";
import {
  TrendTable,
  ProductDetail,
  AnalysisFilters
} from "../components/SalesAnalysis";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Query to get products and their inventory
  const response = await admin.graphql(`
    query {
      products(first: 25) {
        edges {
          node {
            id
            title
            variants(first: 5) {
              edges {
                node {
                  id
                  inventoryQuantity
                  sku
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
  
  return json({
    salesData: responseJson.data
  });
};

export default function SalesAnalysis() {
  const { salesData } = useLoaderData();
  const navigate = useNavigate();
  
  // State for selected product detail view
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    searchTerm: "",
    trendFilter: "all",
    popularityFilter: "all",
    stockLevelFilter: "all"
  });
  
  // Transform raw sales data into a format suitable for display
  const transformedData = useMemo(() => {
    const transformedProducts = transformSalesData(salesData);
    return detectSalesTrends(transformedProducts);
  }, [salesData]);
  
  // Selected product data
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return transformedData.find(product => product.id === selectedProductId);
  }, [selectedProductId, transformedData]);
  
  // Apply filters to products
  const filteredProducts = useMemo(() => {
    return transformedData.filter(product => {
      // Search term filter
      const searchMatch = !filters.searchTerm || 
        product.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(filters.searchTerm.toLowerCase()));
      
      // Trend filter
      const trendMatch = filters.trendFilter === "all" ||
        (filters.trendFilter === "growing" && product.trend > 5) ||
        (filters.trendFilter === "declining" && product.trend < -5) ||
        (filters.trendFilter === "stable" && product.trend >= -5 && product.trend <= 5);
      
      // Popularity filter
      const popularityMatch = filters.popularityFilter === "all" ||
        product.popularityTier === filters.popularityFilter;
      
      // Stock level filter
      const stockMatch = filters.stockLevelFilter === "all" ||
        (filters.stockLevelFilter === "low" && product.daysOfInventory < 7) ||
        (filters.stockLevelFilter === "medium" && product.daysOfInventory >= 7 && product.daysOfInventory <= 30) ||
        (filters.stockLevelFilter === "high" && product.daysOfInventory > 30);
      
      return searchMatch && trendMatch && popularityMatch && stockMatch;
    });
  }, [transformedData, filters]);
  
  // Handle product selection
  const handleProductSelect = (product) => {
    setSelectedProductId(product.id);
  };
  
  // Handle back from product detail
  const handleBackToList = () => {
    setSelectedProductId(null);
  };
  
  return (
    <Page 
      title="Sales Analysis"
      subtitle="Monitor sales trends and stock levels"
      backAction={{
        content: 'Back to Dashboard',
        onAction: () => navigate("/app")
      }}
      primaryAction={{
        content: 'Customize Settings',
        onAction: () => navigate("/app/settings")
      }}
    >
      <BlockStack gap="5">
        {transformedData.length === 0 ? (
          <Banner tone="warning">
            <p>No sales data available. Add products to your store to see sales analysis.</p>
          </Banner>
        ) : selectedProduct ? (
          <ProductDetail 
            product={selectedProduct} 
            onBack={handleBackToList} 
          />
        ) : (
          <>
            <AnalysisFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
            
            <Card>
              <BlockStack gap="4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="headingMd" fontWeight="semibold">
                    Products ({filteredProducts.length})
                  </Text>
                  
                  {filters.searchTerm || filters.trendFilter !== "all" || 
                   filters.popularityFilter !== "all" || filters.stockLevelFilter !== "all" ? (
                    <Text variant="bodySm" color="subdued">
                      Filtered from {transformedData.length} total products
                    </Text>
                  ) : null}
                </div>
                
                <TrendTable 
                  products={filteredProducts}
                  onProductSelect={handleProductSelect}
                />
              </BlockStack>
            </Card>
            
            <Layout>
              <Layout.Section>
                <Card>
                  <BlockStack gap="4">
                    <Text variant="headingMd" fontWeight="semibold">
                      Trend Summary
                    </Text>
                    
                    <BlockStack gap="2">
                      <Text variant="bodyMd">
                        {transformedData.filter(p => p.trend > 5).length} products with increasing sales trends
                      </Text>
                      <Text variant="bodyMd">
                        {transformedData.filter(p => p.trend < -5).length} products with decreasing sales trends
                      </Text>
                      <Text variant="bodyMd">
                        {transformedData.filter(p => p.daysOfInventory < 7).length} products with low inventory (less than 1 week)
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Layout.Section>
              
              <Layout.Section secondary>
                <Card>
                  <BlockStack gap="4">
                    <Text variant="headingMd" fontWeight="semibold">
                      Tips
                    </Text>
                    
                    <BlockStack gap="2">
                      <Text variant="bodyMd">
                        • Click on a product name to see detailed analysis
                      </Text>
                      <Text variant="bodyMd">
                        • Products with less than 7 days of inventory may need immediate attention
                      </Text>
                      <Text variant="bodyMd">
                        • Use the filters to focus on specific product groups
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </>
        )}
      </BlockStack>
    </Page>
  );
}