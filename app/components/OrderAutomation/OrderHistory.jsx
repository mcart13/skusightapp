import {
  Card,
  DataTable,
  Text,
  BlockStack,
  Badge,
  Button,
  Modal,
  List
} from "@shopify/polaris";
import { useState } from "react";

/**
 * OrderHistory component for the OrderAutomation page
 * This component displays past orders and allows viewing details
 */
export function OrderHistory({ orderHistory }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalActive, setModalActive] = useState(false);
  
  // Handle view details click
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setModalActive(true);
  };
  
  // Close the modal
  const handleCloseModal = () => {
    setModalActive(false);
  };
  
  // Create rows for DataTable
  const rows = orderHistory.map(order => [
    <Text key={`id-${order.id}`} fontWeight="bold">{order.id}</Text>,
    <Text key={`date-${order.id}`}>{order.date}</Text>,
    <Text key={`supplier-${order.id}`}>{order.supplier}</Text>,
    <Text key={`products-${order.id}`}>{order.products.length} products</Text>,
    <Button key={`action-${order.id}`} onClick={() => handleViewDetails(order)}>
      View Details
    </Button>
  ]);
  
  return (
    <>
      <Card>
        <BlockStack gap="4">
          <Text variant="headingMd" fontWeight="bold">
            Order History
          </Text>
          
          {rows.length > 0 ? (
            <DataTable
              columnContentTypes={["text", "text", "text", "numeric", "text"]}
              headings={["Order ID", "Date", "Supplier", "Products", "Actions"]}
              rows={rows}
            />
          ) : (
            <Text>No order history available.</Text>
          )}
        </BlockStack>
      </Card>
      
      {selectedOrder && (
        <Modal
          open={modalActive}
          onClose={handleCloseModal}
          title={`Order Details: ${selectedOrder.id}`}
          primaryAction={{
            content: "Close",
            onAction: handleCloseModal,
          }}
        >
          <Modal.Section>
            <BlockStack gap="4">
              <BlockStack gap="2">
                <Text fontWeight="bold">Date:</Text>
                <Text>{selectedOrder.date}</Text>
              </BlockStack>
              
              <BlockStack gap="2">
                <Text fontWeight="bold">Supplier:</Text>
                <Text>{selectedOrder.supplier}</Text>
              </BlockStack>
              
              <BlockStack gap="2">
                <Text fontWeight="bold">Email:</Text>
                <Text>{selectedOrder.supplierEmail}</Text>
              </BlockStack>
              
              <BlockStack gap="2">
                <Text fontWeight="bold">Products:</Text>
                <List type="bullet">
                  {selectedOrder.products.map(product => (
                    <List.Item key={product.id}>
                      {product.title} - SKU: {product.sku}, Quantity: {product.quantity}
                    </List.Item>
                  ))}
                </List>
              </BlockStack>
              
              <BlockStack gap="2">
                <Text fontWeight="bold">Status:</Text>
                <Badge tone="success">Completed</Badge>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </>
  );
} 