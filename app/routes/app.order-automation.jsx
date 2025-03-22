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
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    
    // Validate form data
    const supplierEmail = formData.get("supplierEmail");
    const supplierName = formData.get("supplierName");
    
    if (!supplierEmail || !supplierName) {
      return json({
        success: false,
        error: "Missing supplier information",
        message: "Supplier email and name are required"
      }, { status: 400 });
    }
    
    let products;
    try {
      products = JSON.parse(formData.get("products") || "[]");
      
      // Validate products data structure
      if (!Array.isArray(products) || products.length === 0) {
        return json({
          success: false,
          error: "Invalid products data",
          message: "No products selected for order"
        }, { status: 400 });
      }
      
      // Validate product quantities
      const invalidProducts = products.filter(p => 
        typeof p.quantity !== 'number' || 
        isNaN(p.quantity) || 
        p.quantity <= 0
      );
      
      if (invalidProducts.length > 0) {
        return json({
          success: false,
          error: "Invalid quantity",
          message: "All products must have a valid quantity greater than zero"
        }, { status: 400 });
      }
    } catch (error) {
      return json({
        success: false,
        error: "Invalid products data format",
        message: "Could not parse product data"
      }, { status: 400 });
    }
    
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
  } catch (error) {
    console.error("Order submission error:", error);
    return json({
      success: false,
      error: "Server error",
      message: "An unexpected error occurred while processing your order"
    }, { status: 500 });
  }
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
  const [errors, setErrors] = useState({});
  
  // Load saved state from localStorage on component mount
  useEffect(() => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      try {
        const savedSelected = localStorage.getItem('orderFormSelected');
        const savedQuantities = localStorage.getItem('orderFormQuantities');
        
        if (savedSelected) {
          try {
            const parsedSelected = JSON.parse(savedSelected);
            if (Array.isArray(parsedSelected)) {
              setSelected(parsedSelected);
            }
          } catch (parseError) {
            console.error('Error parsing saved selections:', parseError);
            // Clear invalid data
            localStorage.removeItem('orderFormSelected');
          }
        }
        
        if (savedQuantities) {
          try {
            const parsedQuantities = JSON.parse(savedQuantities);
            if (parsedQuantities && typeof parsedQuantities === 'object') {
              setQuantities(parsedQuantities);
            }
          } catch (parseError) {
            console.error('Error parsing saved quantities:', parseError);
            // Clear invalid data
            localStorage.removeItem('orderFormQuantities');
          }
        }
      } catch (error) {
        console.error('Error loading saved order form:', error);
      }
    }
  }, []);
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selected.length > 0) {
      try {
        localStorage.setItem('orderFormSelected', JSON.stringify(selected));
      } catch (error) {
        console.error('Error saving selections to localStorage:', error);
      }
    }
  }, [selected]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(quantities).length > 0) {
      try {
        localStorage.setItem('orderFormQuantities', JSON.stringify(quantities));
      } catch (error) {
        console.error('Error saving quantities to localStorage:', error);
      }
    }
  }, [quantities]);
  
  // Clear saved state after successful order submission
  useEffect(() => {
    if (actionData?.success) {
      try {
        localStorage.removeItem('orderFormSelected');
        localStorage.removeItem('orderFormQuantities');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [actionData]);
  
  // Show error banner if action returns an error
  useEffect(() => {
    if (actionData && !actionData.success) {
      setErrors({
        message: actionData.message || "An error occurred during order submission"
      });
    } else {
      setErrors({});
    }
  }, [actionData]);
  
  // Calculate optimal reorder quantities and group products by supplier
  const productsBySupplier = {};
  suppliers.forEach(supplier => {
    productsBySupplier[supplier.id] = [];
  });
  
  // Process product data for reordering
  const productData = products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const currentStock = variant?.inventoryQuantity || 0;
    const idNumber = parseInt(node.id.replace(/\D/g, '')) || 1;
    const sku = variant?.sku || `SKU-${node.title.substring(0, 3).toUpperCase()}-${idNumber.toString().padStart(3, '0')}`;
    const price = variant?.price || 0;
    
    // Use deterministic values based on product ID instead of random numbers
    const avgDailySales = 0.5 + (idNumber % 3); // 0.5 to 3.5 units per day, determined by product ID
    const leadTime = 3 + (idNumber % 5); // 3-7 days, determined by product ID
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
  
  // Validate a quantity value
  const validateQuantity = (value) => {
    const numValue = parseInt(value);
    return !isNaN(numValue) && numValue > 0 ? numValue : null;
  };
  
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
        const validatedValue = validateQuantity(value);
        setQuantities({
          ...quantities,
          [product.id]: validatedValue !== null ? validatedValue : 0
        });
      }}
      error={quantities[product.id] === 0 ? "Quantity must be greater than 0" : undefined}
      min={1}
    />,
    suppliers.find(s => s.id === product.supplierId)?.name || "Unknown",
    <Button 
      size="slim"
      onClick={() => handleQuickOrder(product)}
      disabled={quantities[product.id] === 0}
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
      Order Details
    </Button>
  ]);
  
  const handleCreateOrder = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    setCurrentSupplier(supplier);
    setOrderModalOpen(true);
  };
  
  const handleSubmitOrder = () => {
    const productsForSupplier = reorderNeededProducts
      .filter(p => selected.includes(p.id) && p.supplierId === currentSupplier.id)
      .map(p => {
        const quantity = quantities[p.id] || p.suggestedQuantity;
        return {
          id: p.id,
          title: p.title,
          sku: p.sku,
          quantity: quantity > 0 ? quantity : p.suggestedQuantity
        };
      });
    
    // Don't submit if no products are selected for this supplier
    if (productsForSupplier.length === 0) {
      setOrderModalOpen(false);
      setErrors({ message: "No valid products selected for this supplier" });
      return;
    }
    
    // Validate all quantities
    const invalidProducts = productsForSupplier.filter(p => p.quantity <= 0);
    if (invalidProducts.length > 0) {
      setErrors({ 
        message: "All products must have quantities greater than zero",
        invalidProducts: invalidProducts
      });
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("supplierEmail", currentSupplier.email);
      formData.append("supplierName", currentSupplier.name);
      formData.append("products", JSON.stringify(productsForSupplier));
      
      submit(formData, { method: "post" });
      setOrderModalOpen(false);
    } catch (error) {
      console.error("Error submitting order:", error);
      setErrors({ message: "Failed to submit order. Please try again." });
    }
  };
  
  const handleQuickOrder = (product) => {
    const supplier = suppliers.find(s => s.id === product.supplierId);
    const quantity = quantities[product.id] || product.suggestedQuantity;
    
    // Validate quantity
    if (quantity <= 0) {
      setErrors({ message: `Invalid quantity for ${product.title}. Must be greater than zero.` });
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("supplierEmail", supplier?.email || "orders@example.com");
      formData.append("supplierName", supplier?.name || "Default Supplier");
      formData.append("products", JSON.stringify([{
        id: product.id,
        title: product.title,
        sku: product.sku,
        quantity: quantity
      }]));
      formData.append("quickOrder", "true");
      
      submit(formData, { 
        method: "post",
        replace: true
      });
    } catch (error) {
      console.error("Error submitting quick order:", error);
      setErrors({ message: "Failed to submit quick order. Please try again." });
    }
  };
  
  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    // Remove saved order form data after successful submission
    try {
      localStorage.removeItem('orderFormSelected');
      localStorage.removeItem('orderFormQuantities');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    // Refresh the page to ensure state is clean
    navigate(".", { replace: true });
  };
  
  return (
    <Page 
      title="Order Automation" 
      backAction={{
        content: 'Dashboard',
        onAction: () => navigate("/app")
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
      {errors.message && (
        <div style={{ marginBottom: '16px' }}>
          <Banner status="critical" onDismiss={() => setErrors({})}>
            <p>{errors.message}</p>
          </Banner>
        </div>
      )}
      
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
                    truncate={true}
                    columnVisibilityData={[
                      { fixed: true, width: "50px" },
                      { fixed: false, width: "200px" },
                      { fixed: false, width: "100px" },
                      { fixed: false, width: "100px" },
                      { fixed: false, width: "100px" },
                      { fixed: false, width: "100px" },
                      { fixed: false, width: "150px" },
                      { fixed: true, width: "100px" }
                    ]}
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
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Order Form
                  </Text>
                  
                  {!selected.length ? (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <Text color="subdued" variant="bodySm">
                        Add multiple items that need restocked to place a bulk order
                      </Text>
                    </div>
                  ) : (
                    <BlockStack gap="300">
                      {/* Group selected products by supplier */}
                      {Object.entries(
                        selected.reduce((acc, productId) => {
                          const product = reorderNeededProducts.find(p => p.id === productId);
                          if (!product) return acc;
                          
                          if (!acc[product.supplierId]) {
                            acc[product.supplierId] = {
                              supplier: suppliers.find(s => s.id === product.supplierId),
                              products: []
                            };
                          }
                          
                          acc[product.supplierId].products.push(product);
                          return acc;
                        }, {})
                      ).map(([supplierId, data]) => (
                        <Card key={supplierId} padding="300">
                          <BlockStack gap="300">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text variant="headingSm">{data.supplier?.name || "Unknown Supplier"}</Text>
                            </div>
                            
                            <Text variant="bodySm">{data.products.length} products selected</Text>
                            
                            {/* Show product list */}
                            <div style={{ marginTop: '4px' }}>
                              {data.products.map(product => (
                                <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #E4E5E7' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span 
                                      role="button"
                                      tabIndex="0"
                                      onClick={() => {
                                        setSelected(selected.filter(id => id !== product.id));
                                      }}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          setSelected(selected.filter(id => id !== product.id));
                                        }
                                      }}
                                      aria-label="Remove item"
                                      style={{ 
                                        color: '#8c9196', 
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        transition: 'color 0.2s',
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.color = '#202223'}
                                      onMouseOut={(e) => e.currentTarget.style.color = '#8c9196'}
                                    >
                                      ×
                                    </span>
                                    <Text variant="bodySm">{product.title}</Text>
                                  </div>
                                  <Text variant="bodySm">Qty: {quantities[product.id] || product.suggestedQuantity}</Text>
                                </div>
                              ))}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                              <Button 
                                primary 
                                onClick={() => handleCreateOrder(supplierId)}
                              >
                                Submit Order
                              </Button>
                            </div>
                          </BlockStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </>
        )}
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recent Supply Orders
              </Text>
              
              {orderHistory.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text"]}
                  headings={["Order #", "Supplier", "Products", "Date", ""]}
                  rows={historyRows}
                  truncate={true}
                  columnVisibilityData={[
                    { fixed: false, width: "120px" },
                    { fixed: false, width: "150px" },
                    { fixed: false, width: "80px" },
                    { fixed: false, width: "120px" },
                    { fixed: true, width: "120px" }
                  ]}
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
        title="Submit Order"
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
      
      {/* Order details modal */}
      <Modal
        open={reorderHistoryModalOpen}
        onClose={() => setReorderHistoryModalOpen(false)}
        title="Order Details"
        primaryAction={{
          content: "Close",
          onAction: () => setReorderHistoryModalOpen(false)
        }}
      >
        <Modal.Section>
          {selectedHistoryOrder && (
            <TextContainer>
              <Text>Order placed with:</Text>
              <Text variant="headingMd">{selectedHistoryOrder.supplier}</Text>
              
              <div style={{ marginTop: '12px' }}>
                <Text variant="bodySm">
                  Order #{selectedHistoryOrder.id}
                </Text>
                <Text variant="bodySm">
                  Order date: {selectedHistoryOrder.date}
                </Text>
              </div>
              
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
                  A confirmation email was sent to the supplier when this order was placed.
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
          content: "Ok",
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