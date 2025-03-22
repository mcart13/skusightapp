import { Link, Outlet, useLoaderData, useRouteError, useNavigate, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect, useMemo } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Card, EmptyState, Layout, Page, Text, Button, Banner } from "@shopify/polaris";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { apiKey, shop, host, isAuthenticated, isTestStore, isDevelopmentFallback, userError } = useLoaderData();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && userError) {
      // In a real app, we'd redirect to the login page
      // For now, we'll just navigate to root
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, userError, navigate]);

  // Create URL search params object for consistent parameter handling
  const buildUrl = useMemo(() => {
    return (path) => {
      const params = new URLSearchParams();
      if (shop) params.set('shop', shop);
      if (host) params.set('host', host);
      
      return `${path}?${params.toString()}`;
    };
  }, [shop, host]);
  
  // Navigation menu with proper dynamic URLs
  const navItems = useMemo(() => [
    {
      label: "Home",
      destination: buildUrl('/app')
    },
    {
      label: "Visual Dashboard", 
      destination: buildUrl('/app/dashboard')
    },
    {
      label: "Sales Analysis",
      destination: buildUrl('/app/sales-analysis')
    },
    {
      label: "Restock Orders",
      destination: buildUrl('/app/order-automation')
    },
    {
      label: "System Status",
      destination: buildUrl('/app/system-status')
    },
    {
      label: "Logs & Monitoring",
      destination: buildUrl('/app/logsview'),
      subNavigationItems: [
        {
          destination: buildUrl('/app/logsview'),
          label: 'View Logs',
        }
      ]
    },
    {
      label: "Settings",
      destination: buildUrl('/app/settings')
    }
  ], [buildUrl]);

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

  return (
    <AppProvider
      isEmbeddedApp={true}
      apiKey={apiKey}
      shop={shop}
      host={host}
      forceRedirect={!isTestStore} // Only force redirect for non-test stores
    >
      {isDevelopmentFallback && (
        <Banner status="warning" title="Development Mode">
          <p>⚠️ Using test store data for development. This authentication bypass should be removed in production.</p>
        </Banner>
      )}
      
      <NavMenu navigation={navItems} />
      <Outlet context={{ shop, host, isTestStore }} />
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
