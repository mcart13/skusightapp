import { useState } from "react";
import {
  Card,
  Modal,
  TextContainer,
  BlockStack,
  Button,
  Text,
  List,
  TextField,
  Banner
} from "@shopify/polaris";

/**
 * OrderForm component for the OrderAutomation page
 * This component handles creation and submission of supplier orders
 */
export function OrderForm({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  selectedProducts,
  isSubmitting = false,
  orderSuccess = null
}) {
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // For a production app, additional validation could be added here
  
  // Handle form submission
  const handleSubmit = () => {
    onSubmit({
      supplier: supplier,
      products: selectedProducts,
      notes: additionalNotes
    });
  };
  
  // Total number of products and units
  const totalUnits = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
  
  // If order was successful, show a success message
  if (orderSuccess) {
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Order Submitted Successfully"
      >
        <Modal.Section>
          <BlockStack gap="4">
            <Banner tone="success">
              Order has been sent to {supplier.name}!
            </Banner>
            
            <TextContainer>
              <Text>Order ID: {orderSuccess.id}</Text>
              <Text>Date: {orderSuccess.date}</Text>
              <Text>
                {selectedProducts.length} products, {totalUnits} total units
              </Text>
            </TextContainer>
            
            <Button onClick={onClose}>Close</Button>
          </BlockStack>
        </Modal.Section>
      </Modal>
    );
  }
  
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Create Order: ${supplier?.name || ""}`}
      primaryAction={{
        content: "Submit Order",
        onAction: handleSubmit,
        loading: isSubmitting,
        disabled: isSubmitting || selectedProducts.length === 0
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
          disabled: isSubmitting
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="4">
          <TextContainer>
            <Text fontWeight="bold">Supplier:</Text>
            <Text>{supplier?.name}</Text>
            <Text>{supplier?.email}</Text>
          </TextContainer>
          
          <TextContainer>
            <Text fontWeight="bold">Products:</Text>
            <List type="bullet">
              {selectedProducts.map(product => (
                <List.Item key={product.id}>
                  {product.title} (SKU: {product.sku}) - Quantity: {product.quantity}
                </List.Item>
              ))}
            </List>
          </TextContainer>
          
          <TextContainer>
            <Text fontWeight="bold">Order Summary:</Text>
            <Text>{selectedProducts.length} products, {totalUnits} total units</Text>
          </TextContainer>
          
          <TextField
            label="Additional Notes"
            value={additionalNotes}
            onChange={setAdditionalNotes}
            multiline={4}
            placeholder="Add any specific instructions or notes for this order..."
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
} 