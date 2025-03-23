import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
// Import specific Polaris components
import { Card, Page, Layout, Text } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  
  return json({
    shop
  });
};

export default function SimpleSystemStatus() {
  const { shop } = useLoaderData();
  
  return (
    <Page title="System Status">
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <Text variant="headingMd">Shop: {shop}</Text>
              <Text>All systems operational</Text>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 