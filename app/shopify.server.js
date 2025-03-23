import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  hooks: {
    afterAuth: async (session) => {
      await syncInitialStoreData(session);
    },
  },
  // Set CORS headers to allow embedding in Shopify Admin
  customMiddleware: (app) => {
    app.use((req, res, next) => {
      // Allow embedded app to run in Shopify Admin iframe
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com;");
      res.setHeader("X-Frame-Options", "ALLOW-FROM https://admin.shopify.com");
      next();
    });
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

async function syncInitialStoreData(session) {
  try {
    const client = new shopify.api.clients.Graphql({
      session,
    });
    
    // Fetch initial product data
    const productsResponse = await client.query({
      data: `{
        products(first: 250) {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    inventoryQuantity
                    sku
                  }
                }
              }
            }
          }
        }
      }`,
    });
    
    // Fetch order history for sales velocity calculation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const ordersResponse = await client.query({
      data: `{
        orders(first: 250, query: "created_at:>=${sixMonthsAgo.toISOString()}") {
          edges {
            node {
              id
              createdAt
              lineItems(first: 50) {
                edges {
                  node {
                    quantity
                    variantId
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }`,
    });
    
    // Process and store data with smart defaults
    await processInitialData(
      session.shop,
      productsResponse.body.data.products.edges,
      ordersResponse.body.data.orders.edges
    );
    
    return { success: true };
  } catch (error) {
    console.error("Initial data sync failed:", error);
    return { success: false, error };
  }
}

async function processInitialData(shop, productEdges, orderEdges) {
  // Transform GraphQL edges to more usable format
  const products = productEdges.map(edge => ({
    id: edge.node.id.replace('gid://shopify/Product/', ''),
    title: edge.node.title,
    variants: edge.node.variants.edges.map(varEdge => ({
      id: varEdge.node.id.replace('gid://shopify/ProductVariant/', ''),
      inventory: varEdge.node.inventoryQuantity,
      sku: varEdge.node.sku
    }))
  }));
  
  const orders = orderEdges.map(edge => ({
    id: edge.node.id,
    createdAt: edge.node.createdAt,
    lineItems: edge.node.lineItems.edges.map(lineEdge => ({
      productId: lineEdge.node.product?.id?.replace('gid://shopify/Product/', ''),
      variantId: lineEdge.node.variantId?.replace('gid://shopify/ProductVariant/', ''),
      quantity: lineEdge.node.quantity
    })).filter(item => item.productId)
  }));

  // Calculate sales velocity and smart defaults for each product
  for (const product of products) {
    // Calculate sales velocity based on order history
    const salesVelocity = calculateSalesVelocity(product.id, orders);
    
    // Set smart default thresholds based on velocity
    const reorderPoint = Math.max(Math.ceil(salesVelocity * 7), 3); // 1 week supply or minimum 3
    const maxStock = Math.ceil(salesVelocity * 30); // 1 month supply
    
    // Store in database with upsert to avoid duplicates
    await prisma.inventorySettings.upsert({
      where: {
        shopDomain_productId: {
          shopDomain: shop,
          productId: product.id
        }
      },
      update: {
        title: product.title,
        salesVelocity,
        reorderPoint,
        maxStock,
        lastSync: new Date()
      },
      create: {
        shopDomain: shop,
        productId: product.id,
        title: product.title,
        salesVelocity,
        reorderPoint,
        maxStock,
        lastSync: new Date()
      }
    });
  }
}

function calculateSalesVelocity(productId, orders) {
  // Find line items in orders that match this product
  const matchingLineItems = orders.flatMap(order => 
    order.lineItems.filter(item => item.productId === productId)
  );
  
  // Calculate units sold
  const totalUnitsSold = matchingLineItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate sales velocity (units per day)
  const oldestOrderDate = orders.length > 0 ? 
    new Date(Math.min(...orders.map(o => new Date(o.createdAt).getTime()))) : 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days if no orders
    
  const today = new Date();
  const daysDifference = Math.max(1, Math.ceil((today - oldestOrderDate) / (1000 * 60 * 60 * 24)));
  
  return totalUnitsSold / daysDifference;
}

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
export const beginDataSync = syncInitialStoreData;