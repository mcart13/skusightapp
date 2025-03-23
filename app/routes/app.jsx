import { Link, Outlet, useLoaderData, useRouteError, useNavigate, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect, useMemo } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { 
  Card, 
  EmptyState, 
  Layout, 
  Page, 
  Text, 
  Button, 
  Banner, 
  Frame,
  TopBar,
  ContextualSaveBar
} from "@shopify/polaris";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    // Extract shop and host from URL for convenience
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    // Attempt to authenticate with Shopify
    const { admin, session } = await authenticate.admin(request);
    
    // If we get here, authentication was successful
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: shop || session?.shop,
      host: host || "",
      isAuthenticated: true,
      isTestStore: shop === "testingstore.myshopify.com",
      userError: null
    });
  } catch (error) {
    console.error("Authentication error:", error);
    
    // For development only - fallback to test store data
    // IMPORTANT: This should be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️ Development mode: Using test store fallback authentication");
      
      return json({
        apiKey: process.env.SHOPIFY_API_KEY || "",
        shop: "testingstore.myshopify.com",
        host: "host",
        isAuthenticated: true,
        isTestStore: true,
        isDevelopmentFallback: true,
        userError: null
      });
    }
    
    // In production, return an error state that will be handled by the component
    return json({
      isAuthenticated: false,
      userError: "Authentication failed. Please try again.",
      shop: null,
      host: null,
      apiKey: null,
      isTestStore: false
    });
  }
};

export default function App() {
  const { 
    apiKey, 
    shop, 
    host, 
    isAuthenticated, 
    isTestStore, 
    isDevelopmentFallback, 
    userError
  } = useLoaderData();
  
  // If authentication failed, show an error state
  if (!isAuthenticated && userError) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <EmptyState
                  heading="Authentication Error"
                  image={null}
                >
                  <p>{userError}</p>
                  <Button url="/" primary>Return to Login</Button>
                </EmptyState>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Standard embedded app setup with Frame component
  return (
    <AppProvider
      isEmbeddedApp={true}
      apiKey={apiKey}
      shop={shop}
      host={host}
      forceRedirect={!isTestStore} // Only force redirect for non-test stores
    >
      <Frame>
        {isDevelopmentFallback && (
          <Banner status="warning" title="Development Mode">
            <p>⚠️ Using test store data for development. This authentication bypass should be removed in production.</p>
          </Banner>
        )}
        
        <NavMenu>
          <a href={`/app?shop=${shop}&host=${host}`} rel="home">Home</a>
          <a href={`/app/dashboard?shop=${shop}&host=${host}`}>Visual Dashboard</a>
          <a href={`/app/sales-analysis?shop=${shop}&host=${host}`}>Sales Analysis</a>
          <a href={`/app/order-automation?shop=${shop}&host=${host}`}>Restock Orders</a>
          <a href={`/app/system-status?shop=${shop}&host=${host}`}>System Status</a>
          <a href={`/app/settings?shop=${shop}&host=${host}`}>Settings</a>
        </NavMenu>
        <Outlet context={{ shop, host, isTestStore }} />
      </Frame>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
