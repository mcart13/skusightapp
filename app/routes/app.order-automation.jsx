import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, Link, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  DataTable,
  TextField,
  Button,
  Banner,
  Modal,
  TextContainer,
  List,
  Divider,
  Checkbox,
  Icon,
  Badge,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Query to get products and their variants
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
  
  // In a real app, we would fetch supplier information from a database
  // For demo purposes, we'll simulate supplier data
  const suppliers = [
    {
      id: "sup_001",
      name: "Global Supply Co.",
      email: "orders@globalsupply.example",
      products: ["snowboard", "ski"]
    },
    {
      id: "sup_002",
      name: "Premium Materials Inc.",
      email: "orders@premiummaterials.example",
      products: ["card", "wax"]
    }
  ];

  // In a real app, we would fetch order history from a database
  // For demo purposes, we'll simulate order history
  const orderHistory = [
    {
      id: "ORD-764291",
      supplier: "Global Supply Co.",
      supplierEmail: "orders@globalsupply.example",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      products: [
        { id: "gid://shopify/Product/1", title: "Complete Snowboard", sku: "SB-COMP-001", quantity: 10 },
        { id: "gid://shopify/Product/2", title: "Snowboard Boots", sku: "SB-BOOT-001", quantity: 8 }
      ]
    },
    {
      id: "ORD-512396",
      supplier: "Premium Materials Inc.",
      supplierEmail: "orders@premiummaterials.example",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      products: [
        { id: "gid://shopify/Product/3", title: "Gift Card", sku: "GC-001", quantity: 20 }
      ]
    }
  ];

  return json({ 
    products: responseJson.data.products,
    suppliers,
    orderHistory
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const supplierEmail = formData.get("supplierEmail");
  const supplierName = formData.get("supplierName");
  const products = JSON.parse(formData.get("products"));
  const isQuickOrder = formData.get("quickOrder") === "true";
  
  // In a real app, you would send an actual email to the supplier
  // For demo purposes, we'll simulate a successful order submission
  
  return json({
    success: true,
    orderNumber: "ORD-" + Math.floor(Math.random() * 1000000),
    supplier: supplierName,
    timestamp: new Date().toLocaleString(),
    products,
    isQuickOrder
  });
};

export default function OrderAutomation() {
  const { products, suppliers, orderHistory } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  
  const [selected, setSelected] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [initialQuantitiesSet, setInitialQuantitiesSet] = useState(false);
  const [reorderHistoryModalOpen, setReorderHistoryModalOpen] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
  
  // Calculate optimal reorder quantities and group products by supplier
  const productsBySupplier = {};
  suppliers.forEach(supplier => {
    productsBySupplier[supplier.id] = [];
  });
  
  // Process product data for reordering
  const productData = products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    const sku = variant?.sku || "";
    const price = variant?.price || 0;
    
    // Simulate historical sales data and calculate reorder point
    const avgDailySales = Math.random() * 3 + 0.5; // 0.5 to 3.5 units per day
    const leadTime = Math.floor(Math.random() * 5) + 3; // 3-7 days
    const stdDev = avgDailySales * 0.3; // Assume variability
    const safetyStock = Math.ceil(1.645 * stdDev * Math.sqrt(leadTime));
    const reorderPoint = Math.ceil(avgDailySales * leadTime) + safetyStock;
    
    // Determine suggested reorder quantity
    const annualDemand = avgDailySales * 365;
    const orderingCost = 20;
    const holdingCost = price * 0.2 || 5;
    const eoq = Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
    
    // Determine if reorder needed
    const needsReorder = currentStock <= reorderPoint;
    
    // Suggested order quantity
    const suggestedQuantity = needsReorder ? Math.max(eoq, reorderPoint - currentStock) : 0;
    
    // Find appropriate supplier based on product title
    const supplierMatch = suppliers.find(supplier => 
      supplier.products.some(keyword => node.title.toLowerCase().includes(keyword))
    );
    const supplierId = supplierMatch ? supplierMatch.id : suppliers[0].id;
    
    // Add to supplier group
    if (needsReorder && suggestedQuantity > 0) {
      productsBySupplier[supplierId].push({
        id: node.id,
        title: node.title,
        sku,
        currentStock,
        reorderPoint,
        suggestedQuantity
      });
    }
    
    return {
      id: node.id,
      title: node.title,
      sku,
      currentStock,
      reorderPoint,
      suggestedQuantity,
      needsReorder,
      supplierId
    };
  });
  
  // Set initial quantities only once to prevent infinite loops
  useEffect(() => {
    if (!initialQuantitiesSet && productData.length > 0) {
      const initialQuantities = {};
      productData.forEach(product => {
        if (product.needsReorder && product.suggestedQuantity > 0) {
          initialQuantities[product.id] = product.suggestedQuantity;
        }
      });
      setQuantities(initialQuantities);
      setInitialQuantitiesSet(true);
    }
  }, [productData, initialQuantitiesSet]);
  
  // Show success modal when action completes
  useEffect(() => {
    if (actionData?.success && !successModalOpen) {
      setSuccessModalOpen(true);
    }
  }, [actionData, successModalOpen]);
  
  // Only products that need reordering
  const reorderNeededProducts = productData.filter(p => p.needsReorder);
  
  // Create rows for the table
  const rows = reorderNeededProducts.map(product => [
    <Checkbox
      label=""
      checked={selected.includes(product.id)}
      onChange={() => {
        if (selected.includes(product.id)) {
          setSelected(selected.filter(id => id !== product.id));
        } else {
          setSelected([...selected, product.id]);
        }
      }}
    />,
    product.title,
    product.sku,
    product.currentStock,
    product.reorderPoint,
    <TextField
      type="number"
      value={quantities[product.id]?.toString() || product.suggestedQuantity.toString()}
      onChange={(value) => {
        setQuantities({
          ...quantities,
          [product.id]: parseInt(value) || 0
        });
      }}
      min={0}
    />,
    suppliers.find(s => s.id === product.supplierId)?.name || "Unknown",
    <Button 
      size="slim"
      onClick={() => handleQuickOrder(product)}
    >
      Quick Order
    </Button>
  ]);
  
  // Create rows for order history
  const historyRows = orderHistory.map(order => [
    order.id,
    order.supplier,
    order.products.length.toString(),
    order.date,
    <Button 
      size="slim"
      onClick={() => {
        setSelectedHistoryOrder(order);
        setReorderHistoryModalOpen(true);
      }}
    >
      Reorder Same Items
    </Button>
  ]);
  
  const handleCreateOrder = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setCurrentSupplier(supplier);
    setOrderModalOpen(true);
  };
  
  const handleSubmitOrder = () => {
    const productsForSupplier = reorderNeededProducts
      .filter(p => selected.includes(p.id) && p.supplierId === currentSupplier.id)
      .map(p => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        quantity: quantities[p.id] || p.suggestedQuantity
      }));
    
    const formData = new FormData();
    formData.append("supplierEmail", currentSupplier.email);
    formData.append("supplierName", currentSupplier.name);
    formData.append("products", JSON.stringify(productsForSupplier));
    
    submit(formData, { method: "post" });
    setOrderModalOpen(false);
  };
  
  const handleQuickOrder = (product) => {
    const supplier = suppliers.find(s => s.id === product.supplierId);
    
    const formData = new FormData();
    formData.append("supplierEmail", supplier?.email || "orders@example.com");
    formData.append("supplierName", supplier?.name || "Default Supplier");
    formData.append("products", JSON.stringify([{
      id: product.id,
      title: product.title,
      sku: product.sku,
      quantity: quantities[product.id] || product.suggestedQuantity
    }]));
    formData.append("quickOrder", "true");
    
    // Use replace: true to force a full navigation
    submit(formData, { 
      method: "post",
      replace: true
    });
  };
  
  const handleReorderFromHistory = () => {
    if (!selectedHistoryOrder) return;
    
    const formData = new FormData();
    formData.append("supplierEmail", selectedHistoryOrder.supplierEmail);
    formData.append("supplierName", selectedHistoryOrder.supplier);
    formData.append("products", JSON.stringify(selectedHistoryOrder.products));
    
    submit(formData, { method: "post" });
    setReorderHistoryModalOpen(false);
  };
  
  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    // Optionally refresh the page to ensure state is clean
    navigate(".", { replace: true });
  };
  
  return (
    <Page 
      title="Order Automation" 
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
      secondaryActions={[
        {
          content: 'Select All',
          onAction: () => setSelected(reorderNeededProducts.map(p => p.id))
        },
        {
          content: 'Clear Selection',
          onAction: () => setSelected([])
        }
      ]}
    >
      <Layout>
        {reorderNeededProducts.length === 0 ? (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  No products currently need reordering
                </Text>
                <Text>
                  All your products have sufficient inventory based on current forecasts.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        ) : (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingMd">
                    Products Needing Restock
                  </Text>
                  
                  <DataTable
                    columnContentTypes={["text", "text", "text", "numeric", "numeric", "numeric", "text", "text"]}
                    headings={["Select", "Product", "SKU", "Current Stock", "Reorder Point", "Order Quantity", "Supplier", "Quick Action"]}
                    rows={rows}
                  />
                  
                  <Text variant="bodySm">
                    Suggested quantities are calculated based on your sales velocity, lead time, and optimal order size.
                    Use "Quick Order" to instantly place an order without confirmation.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
            
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Create Purchase Orders
                  </Text>
                  
                  <BlockStack gap="400">
                    {suppliers.map(supplier => {
                      const supplierProducts = productsBySupplier[supplier.id]
                        .filter(p => selected.includes(p.id));
                      
                      if (supplierProducts.length === 0) return null;
                      
                      return (
                        <Card key={supplier.id}>
                          <BlockStack gap="400">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text variant="headingSm">{supplier.name}</Text>
                              <Button 
                                primary 
                                onClick={() => handleCreateOrder(supplier.id)}
                              >
                                Create Purchase Order
                              </Button>
                            </div>
                            
                            <Text>{supplierProducts.length} products selected</Text>
                          </BlockStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </>
        )}
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recent Purchase Orders
              </Text>
              
              {orderHistory.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text"]}
                  headings={["Order #", "Supplier", "Products", "Date", "Actions"]}
                  rows={historyRows}
                />
              ) : (
                <EmptyState
                  heading="No recent orders"
                  image=""
                >
                  <p>When you place orders, they will appear here for easy reordering.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {/* Order confirmation modal */}
      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Confirm Purchase Order"
        primaryAction={{
          content: "Submit Order",
          onAction: handleSubmitOrder
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setOrderModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          {currentSupplier && (
            <TextContainer>
              <Text>You are about to send a purchase order to:</Text>
              <Text variant="headingMd">{currentSupplier.name}</Text>
              <Text variant="bodySm">{currentSupplier.email}</Text>
              
              <Divider />
              
              <Text variant="headingSm">Order Contents:</Text>
              <List type="bullet">
                {reorderNeededProducts
                  .filter(p => selected.includes(p.id) && p.supplierId === currentSupplier.id)
                  .map(p => (
                    <List.Item key={p.id}>
                      {p.title} (SKU: {p.sku}) - Quantity: {quantities[p.id] || p.suggestedQuantity}
                    </List.Item>
                  ))}
              </List>
            </TextContainer>
          )}
        </Modal.Section>
      </Modal>
      
      {/* Reorder from history modal */}
      <Modal
        open={reorderHistoryModalOpen}
        onClose={() => setReorderHistoryModalOpen(false)}
        title="Reorder Previous Order"
        primaryAction={{
          content: "Confirm Reorder",
          onAction: handleReorderFromHistory
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setReorderHistoryModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          {selectedHistoryOrder && (
            <TextContainer>
              <Text>You are about to reorder these items from:</Text>
              <Text variant="headingMd">{selectedHistoryOrder.supplier}</Text>
              
              <Divider />
              
              <Text variant="headingSm">Order Contents:</Text>
              <List type="bullet">
                {selectedHistoryOrder.products.map(p => (
                  <List.Item key={p.id}>
                    {p.title} (SKU: {p.sku}) - Quantity: {p.quantity}
                  </List.Item>
                ))}
              </List>
              
              <div style={{ marginTop: '16px' }}>
                <Banner status="info">
                  This will create a new purchase order with the same items and quantities as order {selectedHistoryOrder.id}.
                </Banner>
              </div>
            </TextContainer>
          )}
        </Modal.Section>
      </Modal>
      
      {/* Success modal */}
      <Modal
        open={successModalOpen && actionData !== undefined}
        onClose={closeSuccessModal}
        title={actionData?.isQuickOrder ? "Quick Order Submitted" : "Order Submitted Successfully"}
        primaryAction={{
          content: "Continue",
          onAction: closeSuccessModal
        }}
      >
        <Modal.Section>
          {actionData && (
            <TextContainer>
              <Banner status="success">
                {actionData.isQuickOrder 
                  ? `Your quick order has been sent to ${actionData.supplier}` 
                  : `Your purchase order has been sent to ${actionData.supplier}`}
              </Banner>
              
              <div style={{ marginTop: '12px' }}>
                <Text>Order number: {actionData.orderNumber}</Text>
                <Text variant="bodySm">
                  {actionData.products.length} {actionData.products.length === 1 ? 'product' : 'products'} ordered
                </Text>
                <Text variant="bodySm">
                  Order date: {actionData.timestamp}
                </Text>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <Text>
                  In an actual implementation, this would:
                </Text>
                <List type="bullet">
                  <List.Item>Send a formatted email to your supplier</List.Item>
                  <List.Item>Update your purchase order history</List.Item>
                  <List.Item>Track the order status until delivery</List.Item>
                </List>
              </div>
            </TextContainer>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}