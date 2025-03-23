import { useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
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
import {
  ProductSelection,
  SupplierSelection,
  OrderHistory,
  OrderForm
} from "../components/OrderAutomation";

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
    
    // In a real app, we would send order to the supplier or create a draft order
    // For demo purposes, we'll just return a success response
    
    return json({
      success: true,
      message: "Order created successfully",
      order: {
        id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString(),
        supplier: supplierName,
        supplierEmail,
        products
      }
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return json({
      success: false,
      error: "Server error",
      message: "There was a problem creating your order"
    }, { status: 500 });
  }
};

export default function OrderAutomation() {
  const { products, suppliers, orderHistory } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  
  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Order form state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  
  // Handle product selection
  const handleProductSelect = (product) => {
    // Check if product already exists, if so update quantity
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        quantity: product.quantity
      };
      setSelectedProducts(updatedProducts);
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };
  
  // Handle quick order
  const handleQuickOrder = (product) => {
    const variant = product.variants.edges[0]?.node || {};
    const productData = {
      id: product.id,
      title: product.title,
      sku: variant.sku || "N/A",
      quantity: 1 // Default to 1 for quick orders
    };
    
    // Add to selected products
    handleProductSelect(productData);
    
    // Find first compatible supplier
    const compatibleSupplier = suppliers.find(supplier => 
      supplier.products.some(keyword => 
        product.title.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (compatibleSupplier) {
      handleCreateOrder(compatibleSupplier);
    }
  };
  
  // Handle create order
  const handleCreateOrder = (supplier) => {
    setSelectedSupplier(supplier);
    setOrderModalOpen(true);
  };
  
  // Handle submit order
  const handleSubmitOrder = (formData) => {
    setIsSubmitting(true);
    
    const submission = {
      supplierName: formData.supplier.name,
      supplierEmail: formData.supplier.email,
      products: JSON.stringify(formData.products),
      notes: formData.notes || ""
    };
    
    submit(submission, { method: "post" });
  };
  
  // Process form response
  if (actionData && !orderSuccess) {
    if (actionData.success) {
      setOrderSuccess(actionData.order);
      setIsSubmitting(false);
    } else {
      // Handle error
      setIsSubmitting(false);
    }
  }
  
  // Close modals and reset state
  const closeOrderModal = () => {
    setOrderModalOpen(false);
    setSelectedSupplier(null);
    setOrderSuccess(null);
    
    // If order was successful, clear selected products
    if (orderSuccess) {
      setSelectedProducts([]);
    }
  };
  
  return (
    <Page 
      title="Order Automation"
      backAction={{
        content: 'Dashboard',
        onAction: () => navigate("/app")
      }}
      primaryAction={{
        content: 'View Sales Analysis',
        onAction: () => navigate("/app/sales-analysis")
      }}
    >
      <BlockStack gap="5">
        {actionData && !actionData.success && (
          <Banner tone="critical">
            {actionData.message || "There was an error creating your order."}
          </Banner>
        )}
        
        <Layout>
          <Layout.Section>
            <ProductSelection
              products={products}
              selectedProducts={selectedProducts}
              onProductSelect={handleProductSelect}
              onQuickOrder={handleQuickOrder}
            />
          </Layout.Section>
          
          <Layout.Section secondary>
            <BlockStack gap="5">
              <SupplierSelection
                suppliers={suppliers}
                selectedProducts={selectedProducts}
                onCreateOrder={handleCreateOrder}
              />
              
              <OrderHistory orderHistory={orderHistory} />
            </BlockStack>
          </Layout.Section>
        </Layout>
        
        <OrderForm
          isOpen={orderModalOpen}
          onClose={closeOrderModal}
          onSubmit={handleSubmitOrder}
          supplier={selectedSupplier}
          selectedProducts={selectedProducts}
          isSubmitting={isSubmitting}
          orderSuccess={orderSuccess}
        />
      </BlockStack>
    </Page>
  );
}