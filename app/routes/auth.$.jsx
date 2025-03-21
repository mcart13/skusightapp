// auth.$.jsx
import { useEffect } from "react";
import { Box, Card, Layout, Text, ProgressBar } from "@shopify/polaris";
import { useNavigate, useLocation } from "@remix-run/react";

export default function AuthenticateRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract shop and host from search params
  const searchParams = new URLSearchParams(location.search);
  const shop = searchParams.get("shop") || "testingstore.myshopify.com";
  const host = searchParams.get("host") || "host";

  // TEMPORARY WORKAROUND: Always auto-redirect to the app without auth
  useEffect(() => {
    console.log("⚠️ Authentication bypass - redirecting directly to app");
    
    // Get any path after /auth to preserve intended destination
    const returnPath = location.pathname.replace(/^\/auth/, '/app');
    const urlWithParams = `${returnPath}?shop=${shop}&host=${host}`;
    
    // Redirect immediately to the app
    navigate(urlWithParams, { replace: true });
  }, [navigate, shop, host, location.pathname]);

  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="4">
            <Text variant="headingLg" as="h1">SkuSight - Authentication Bypass</Text>
            <Text variant="bodyMd" as="p">
              Temporarily bypassing authentication as a workaround.
            </Text>
            
            <Box paddingBlock="4">
              <ProgressBar progress={50} />
            </Box>
            <Text variant="bodyMd">
              Redirecting to app (authentication bypass)...
            </Text>
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );
}