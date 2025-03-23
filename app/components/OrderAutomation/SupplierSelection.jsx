import { useState } from "react";
import {
  Card,
  BlockStack,
  TextField,
  Button,
  Text,
  InlineStack,
  List
} from "@shopify/polaris";

/**
 * SupplierSelection component for the OrderAutomation page
 * This component allows users to select suppliers for ordering products
 */
export function SupplierSelection({ 
  suppliers, 
  selectedProducts, 
  onCreateOrder 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Check if supplier carries selected products
  const getSupplierCompatibility = (supplier) => {
    if (selectedProducts.length === 0) return { compatible: false, message: "No products selected" };
    
    // In a real app, this would check if the supplier carries the selected products
    // For demo purposes, we'll use a simple keyword matching
    const supplierKeywords = supplier.products || [];
    const matchingProducts = selectedProducts.filter(product => 
      supplierKeywords.some(keyword => 
        product.title.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matchingProducts.length === selectedProducts.length) {
      return { compatible: true, message: "All selected products available" };
    } else if (matchingProducts.length > 0) {
      return { 
        compatible: true, 
        message: `${matchingProducts.length}/${selectedProducts.length} products available` 
      };
    } else {
      return { compatible: false, message: "No matching products" };
    }
  };
  
  return (
    <Card>
      <BlockStack gap="4">
        <Text fontWeight="bold" as="h3">
          Select Supplier
        </Text>
        
        <TextField
          label="Search suppliers"
          value={searchTerm}
          onChange={setSearchTerm}
          autoComplete="off"
          placeholder="Search by supplier name or email"
          clearButton
          onClearButtonClick={() => setSearchTerm("")}
        />
        
        <BlockStack gap="4">
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map(supplier => {
              const { compatible, message } = getSupplierCompatibility(supplier);
              
              return (
                <Card key={supplier.id}>
                  <BlockStack gap="4">
                    <Text fontWeight="bold" variant="headingMd">
                      {supplier.name}
                    </Text>
                    <Text variant="bodyMd">
                      Email: {supplier.email}
                    </Text>
                    
                    {selectedProducts.length > 0 && (
                      <BlockStack gap="2">
                        <Text variant="bodyMd" fontWeight="semibold">
                          Selected Products:
                        </Text>
                        <List type="bullet">
                          {selectedProducts.map(product => (
                            <List.Item key={product.id}>
                              {product.title} (Qty: {product.quantity})
                            </List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}
                    
                    <InlineStack align="start">
                      <Text variant="bodyMd">
                        Compatibility: {message}
                      </Text>
                      
                      <Button
                        onClick={() => onCreateOrder(supplier)}
                        disabled={selectedProducts.length === 0 || !compatible}
                      >
                        Create Order
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              );
            })
          ) : (
            <Text>No suppliers found matching your search.</Text>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 