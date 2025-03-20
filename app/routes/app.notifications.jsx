import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  ResourceList,
  ResourceItem,
  Badge,
  Button,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // In a real app, we would fetch actual notifications from a database
  // For now, we'll simulate notifications
  const notifications = [
    {
      id: "1",
      title: "Sales Acceleration Detected",
      description: "The Complete Snowboard sales have increased by 32% in the last week. Consider restocking soon.",
      type: "trend",
      status: "unread",
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(), // 2 hours ago
      actionUrl: "/app/sales-analysis"
    },
    {
      id: "2",
      title: "Seasonal Stock Alert",
      description: "Winter products typically sell 40% faster during December. Your current stock of snowboards may run out 2 weeks earlier than predicted.",
      type: "seasonal",
      status: "unread",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString(), // 1 day ago
      actionUrl: "/app/sales-analysis"
    },
    {
      id: "3",
      title: "Critical Inventory Alert",
      description: "Gift Card is out of stock. This may result in approximately $450 in lost sales based on current demand.",
      type: "stockout",
      status: "read",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString(), // 3 days ago
      actionUrl: "/app/sales-analysis"
    }
  ];
  
  return json({ notifications });
};

export default function Notifications() {
  const { notifications } = useLoaderData();
  
  const getBadgeStatus = (type) => {
    switch (type) {
      case "trend":
        return "info";
      case "seasonal":
        return "attention";
      case "stockout":
        return "critical";
      default:
        return "new";
    }
  };
  
  return (
    <Page
      title="Notification Center"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h2" variant="headingMd">
                  Smart Inventory Alerts
                </Text>
                <Button>Mark All As Read</Button>
              </div>
              
              {notifications.length > 0 ? (
                <ResourceList
                  resourceName={{ singular: 'notification', plural: 'notifications' }}
                  items={notifications}
                  renderItem={(item) => (
                    <ResourceItem
                      id={item.id}
                      onClick={() => {}}
                      shortcutActions={[
                        {
                          content: 'View Details',
                          url: item.actionUrl
                        }
                      ]}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Text variant="headingSm" fontWeight="bold">
                              {item.title}
                            </Text>
                            {item.status === "unread" && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2C6ECB' }}></div>
                            )}
                            <Badge status={getBadgeStatus(item.type)}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </Badge>
                          </div>
                          <Text variant="bodyMd">{item.description}</Text>
                          <Text variant="bodySm" color="subdued">
                            {item.date}
                          </Text>
                        </div>
                      </div>
                    </ResourceItem>
                  )}
                />
              ) : (
                <EmptyState
                  heading="No notifications"
                  image=""
                >
                  <p>When we detect important inventory trends or alerts, they'll appear here.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}