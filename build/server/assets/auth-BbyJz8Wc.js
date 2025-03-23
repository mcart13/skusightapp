async function authenticateRoute(request) {
  console.log("⚠️ Using authentication bypass (TEMPORARY WORKAROUND)");
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "testingstore.myshopify.com";
  return {
    admin: mockAdmin,
    session: { shop, accessToken: "mock-token" },
    isTestStore: true
  };
}
const mockAdmin = {
  // Simple graphql mock that returns sample product data
  graphql: async (query) => {
    console.log("⚠️ Using mock graphql - authentication bypass");
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
        return { data: {} };
      }
    };
  }
};
export {
  authenticateRoute
};
