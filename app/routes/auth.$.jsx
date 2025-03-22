// auth.$.jsx - Handles OAuth authentication flow with Shopify
import { useEffect, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useNavigate, useLocation, useFetcher, useLoaderData } from "@remix-run/react";
import { 
  Box, 
  Card, 
  Layout, 
  Text, 
  ProgressBar, 
  Banner, 
  Button, 
  Link, 
  InlineStack, 
  Spinner 
} from "@shopify/polaris";
import { login } from "../shopify.server";

// Server-side loader to handle redirect from Shopify OAuth
export async function loader({ request }) {
  try {
    // Get the authenticated session using Shopify's login utility
    const authResponse = await login(request);
    
    // If the auth response doesn't include a shop, it might be an error
    // or the auth flow isn't complete
    if (!authResponse) {
      return json({ 
        status: "initializing", 
        error: null,
        shop: new URL(request.url).searchParams.get("shop") || null,
        isDevMode: process.env.NODE_ENV === "development"
      });
    }
    
    // Successful auth - client will redirect to app
    return json({ 
      status: "authenticated", 
      error: null,
      shop: authResponse.session?.shop,
      isDevMode: process.env.NODE_ENV === "development"
    });
  } catch (error) {
    console.error("Authentication error:", error);
    
    // Return error state
    return json({ 
      status: "error", 
      error: error.message || "Authentication failed",
      isDevMode: process.env.NODE_ENV === "development"
    });
  }
}

export default function AuthenticateRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  
  // Local state for handling the authentication flow
  const [authState, setAuthState] = useState({
    isProcessing: true,
    progress: 25,
    statusMessage: "Initializing authentication...",
    hasError: false,
    errorMessage: "",
    devModeEnabled: loaderData?.isDevMode || false
  });
  
  // Extract shop and host from search params with validation
  const searchParams = new URLSearchParams(location.search);
  const shop = searchParams.get("shop") || "";
  const host = searchParams.get("host") || "";
  
  // Function to get intended destination after auth
  const getIntendedDestination = useCallback(() => {
    // Start with the base path of /app
    let returnPath = '/app';
    
    // If there's a specific path after /auth, use it instead (remove /auth prefix)
    if (location.pathname && location.pathname !== '/auth') {
      returnPath = location.pathname.replace(/^\/auth/, '/app');
    }
    
    // Add shop and host as query parameters
    const params = new URLSearchParams();
    if (shop) params.set('shop', shop);
    if (host) params.set('host', host);
    
    // Return the full URL with parameters
    return `${returnPath}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [location.pathname, shop, host]);
  
  // Handle authentication flow
  useEffect(() => {
    // Exit early if server already confirmed authentication
    if (loaderData?.status === "authenticated") {
      setAuthState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        statusMessage: "Authentication successful!",
      }));
      
      // Navigate to the app
      const destination = getIntendedDestination();
      const navigationTimer = setTimeout(() => {
        navigate(destination, { replace: true });
      }, 500); // Short delay to allow the user to see success message
      
      // Cleanup timer on unmount
      return () => clearTimeout(navigationTimer);
    }
    
    // Handle server-side errors
    if (loaderData?.status === "error") {
      setAuthState(prev => ({
        ...prev,
        isProcessing: false,
        hasError: true,
        progress: 100,
        errorMessage: loaderData.error || "Authentication failed",
        statusMessage: "Authentication failed",
      }));
      return;
    }
    
    // If we don't have a shop parameter, show an error
    if (!shop) {
      setAuthState(prev => ({
        ...prev,
        isProcessing: false,
        hasError: true,
        progress: 100,
        errorMessage: "Shop parameter is required for authentication",
        statusMessage: "Missing shop parameter",
      }));
      return;
    }
    
    // Set in-progress state
    setAuthState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 50,
      statusMessage: "Authenticating with Shopify..."
    }));
    
    // Continue with the authentication process
    // In a real flow, this would be handled by Shopify's OAuth redirect
    
  }, [loaderData, navigate, getIntendedDestination, shop]);
  
  // For development mode only - Show a debug panel with options
  const DevModePanel = () => {
    if (!authState.devModeEnabled) return null;
    
    const handleDevModeRedirect = () => {
      const destination = getIntendedDestination();
      console.warn("⚠️ Development mode: Bypassing authentication for testing");
      navigate(destination, { replace: true });
    };
    
    return (
      <Card>
        <Card.Section>
          <Banner status="warning" title="Development Mode">
            <p>Authentication bypass is available in development mode only.</p>
            <div style={{ marginTop: '12px' }}>
              <Button onClick={handleDevModeRedirect}>Continue to App (Dev Mode Only)</Button>
            </div>
          </Banner>
        </Card.Section>
      </Card>
    );
  };
  
  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="4">
            <Text variant="headingLg" as="h1">SkuSight Authentication</Text>
            
            {authState.hasError ? (
              <Box paddingBlock="4">
                <Banner status="critical" title="Authentication Error">
                  <p>{authState.errorMessage}</p>
                </Banner>
                <Box paddingBlock="4">
                  <InlineStack gap="3" align="center">
                    <Link url="/">Return to Login</Link>
                    {authState.devModeEnabled && (
                      <Button onClick={() => window.location.reload()}>Retry Authentication</Button>
                    )}
                  </InlineStack>
                </Box>
              </Box>
            ) : (
              <Box paddingBlock="4">
                <Text variant="bodyMd" as="p">
                  {authState.statusMessage}
                </Text>
                
                <Box paddingBlock="4">
                  <ProgressBar progress={authState.progress} />
                </Box>
                
                {authState.isProcessing && (
                  <Box paddingBlock="4" textAlign="center">
                    <Spinner size="small" />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Card>
      </Layout.Section>
      
      {/* Development Mode Panel - Only visible in development */}
      {authState.devModeEnabled && (
        <Layout.Section>
          <DevModePanel />
        </Layout.Section>
      )}
    </Layout>
  );
}