// auth.$.jsx
import { useCallback, useState } from "react";
import { Banner, Box, Button, Card, Layout, Text, ProgressBar } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export default function AuthenticateRoute() {
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAuth = useCallback(async () => {
    setIsAuthenticating(true);
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 8, 90));
    }, 300);
    
    try {
      await authenticate();
      clearInterval(progressInterval);
      setProgress(100);
      navigate("/app/dashboard");
    } catch (error) {
      clearInterval(progressInterval);
      setIsAuthenticating(false);
      setProgress(0);
    }
  }, [navigate]);

  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="4">
            <Text variant="headingLg" as="h1">SkuSight Inventory Assistant</Text>
            <Text variant="bodyMd" as="p">
              One-click connection for intelligent inventory management.
            </Text>
            
            {isAuthenticating ? (
              <>
                <Box paddingBlock="4">
                  <ProgressBar progress={progress} />
                </Box>
                <Text variant="bodyMd">
                  Setting up your store... We're analyzing your inventory data.
                </Text>
              </>
            ) : (
              <Box paddingBlockStart="4">
                <Button primary size="large" onClick={handleAuth} fullWidth>
                  Connect Your Shopify Store
                </Button>
                <Box paddingBlockStart="3">
                  <Banner title="Zero configuration required">
                    We'll automatically sync and analyze your inventory data.
                  </Banner>
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );
}