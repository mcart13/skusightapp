// auth.js - Centralized authentication handling

/**
 * TEMPORARY AUTHENTICATION BYPASS
 * Always returns mock authenticated data without actually authenticating with Shopify
 * This is a short-term workaround and should be removed when proper authentication is implemented
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Object>} Authentication result with mock admin API client
 */
export async function authenticateRoute(request) {
  console.log("⚠️ Using authentication bypass (TEMPORARY WORKAROUND)");
  
  // Extract shop from URL if available
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "testingstore.myshopify.com";
  
  // Return mock admin with realistic test data
  return {
    admin: mockAdmin,
    session: { shop, accessToken: "mock-token" },
    isTestStore: true
  };
}

// Mock admin object with a graphql method that returns mock data
const mockAdmin = {
  // Simple graphql mock that returns sample product data
  graphql: async (query) => {
    console.log("⚠️ Using mock graphql - authentication bypass");
    
    // Create a response that matches the structure expected by the app
    // This simulates a successful API call without actually making one
    return {
      json: async () => {
        if (query.includes("products")) {
          return {
            data: {
              products: {
                edges: [
                  {
                    node: {
                      id: "gid://shopify/Product/1",
                      title: "Example Snowboard",
                      variants: {
                        edges: [
                          {
                            node: {
                              id: "gid://shopify/ProductVariant/1",
                              inventoryQuantity: 15,
                              price: "159.99",
                              sku: "SNOW-001"
                            }
                          }
                        ]
                      }
                    }
                  },
                  {
                    node: {
                      id: "gid://shopify/Product/2",
                      title: "Winter Jacket",
                      variants: {
                        edges: [
                          {
                            node: {
                              id: "gid://shopify/ProductVariant/2",
                              inventoryQuantity: 8,
                              price: "249.99",
                              sku: "WJ-001"
                            }
                          }
                        ]
                      }
                    }
                  },
                  {
                    node: {
                      id: "gid://shopify/Product/3",
                      title: "Gift Card",
                      variants: {
                        edges: [
                          {
                            node: {
                              id: "gid://shopify/ProductVariant/3",
                              inventoryQuantity: 0,
                              price: "50.00",
                              sku: "GC-001"
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          };
        }
        
        // Default fallback response
        return { data: {} };
      }
    };
  }
}; 