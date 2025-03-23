import { useState } from "react";
import {
  Card,
  DataTable,
  TextField,
  Button,
  Text,
  BlockStack,
  Badge,
  EmptyState
} from "@shopify/polaris";

/**
 * ProductSelection component for the OrderAutomation page
 * This component allows users to select products and quantities for ordering
 */
export function ProductSelection({ 
  products, 
  selectedProducts, 
  onProductSelect, 
  onQuickOrder 
}) {
  const [quantityInputs, setQuantityInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // Validate quantity input
  const validateQuantity = (value) => {
    const parsedValue = parseInt(value, 10);
    return !isNaN(parsedValue) && parsedValue > 0;
  };
  
  // Handle quantity change
  const handleQuantityChange = (productId, value) => {
    setQuantityInputs({
      ...quantityInputs,
      [productId]: value,
    });
  };
  
  // Handle adding a product to the order
  const handleAddProduct = (product) => {
    const quantity = parseInt(quantityInputs[product.id] || "0", 10);
    
    if (validateQuantity(quantity)) {
      onProductSelect({
        id: product.id,
        title: product.title,
        sku: product.variants?.edges[0]?.node?.sku || "N/A",
        quantity: quantity
      });
      
      // Clear the input after adding
      setQuantityInputs({
        ...quantityInputs,
        [product.id]: "",
      });
    }
  };
  
  // Filter products based on search term
  const filteredProducts = products.edges.filter(({ node }) => 
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.variants?.edges[0]?.node?.sku || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Create rows for DataTable
  const rows = filteredProducts.map(({ node }) => {
    const variant = node.variants.edges[0]?.node || {};
    const isSelected = selectedProducts.some(p => p.id === node.id);
    
    return [
      <Text key={`title-${node.id}`}>{node.title}</Text>,
      <Text key={`sku-${node.id}`}>{variant.sku || "N/A"}</Text>,
      <Text key={`inventory-${node.id}`}>{variant.inventoryQuantity || 0}</Text>,
      <TextField
        key={`quantity-${node.id}`}
        type="number"
        value={quantityInputs[node.id] || ""}
        onChange={(value) => handleQuantityChange(node.id, value)}
        autoComplete="off"
        min="1"
      />,
      <BlockStack key={`actions-${node.id}`}>
        <Button 
          onClick={() => handleAddProduct(node)} 
          disabled={!validateQuantity(quantityInputs[node.id])}
        >
          Add to Order
        </Button>
        <Button plain onClick={() => onQuickOrder(node)}>Quick Order</Button>
      </BlockStack>,
      isSelected ? <Badge tone="success">Selected</Badge> : null
    ];
  });
  
  // If no products are available, show empty state
  if (products.edges.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No products found"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>No products are currently available in your store.</p>
        </EmptyState>
      </Card>
    );
  }
  
  return (
    <Card>
      <BlockStack gap="4">
        <TextField
          label="Search products"
          value={searchTerm}
          onChange={setSearchTerm}
          autoComplete="off"
          placeholder="Search by product name or SKU"
          clearButton
          onClearButtonClick={() => setSearchTerm("")}
        />
        
        <DataTable
          columnContentTypes={["text", "text", "numeric", "numeric", "text", "text"]}
          headings={["Product", "SKU", "Current Stock", "Order Quantity", "Actions", "Status"]}
          rows={rows}
          emptyState={
            <EmptyState
              heading="No matching products"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Try changing your search terms</p>
            </EmptyState>
          }
        />
      </BlockStack>
    </Card>
  );
} 