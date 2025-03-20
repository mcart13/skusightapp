import { useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  FormLayout,
  TextField,
  Button,
  Select,
  Banner,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // In a real app, we would fetch saved settings from database
  // For now, we'll use default values
  return json({
    settings: {
      leadTime: 7,
      safetyStockDays: 14,
      serviceLevelPercent: 95,
      lowStockThreshold: 7,
      criticalStockThreshold: 3,
      forecastDays: 30,
      enableNotifications: true,
      notificationEmail: "",
      restockStrategy: "economic",
    }
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // In a real app, we would save these settings to a database
  const settings = {
    leadTime: parseInt(formData.get("leadTime")),
    safetyStockDays: parseInt(formData.get("safetyStockDays")),
    serviceLevelPercent: parseInt(formData.get("serviceLevelPercent")),
    lowStockThreshold: parseInt(formData.get("lowStockThreshold")),
    criticalStockThreshold: parseInt(formData.get("criticalStockThreshold")),
    forecastDays: parseInt(formData.get("forecastDays")),
    enableNotifications: formData.get("enableNotifications") === "true",
    notificationEmail: formData.get("notificationEmail"),
    restockStrategy: formData.get("restockStrategy"),
  };
  
  // Simulating saving settings
  return json({ 
    settings, 
    saved: true,
    timestamp: new Date().toLocaleString()
  });
};

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  
  const [formValues, setFormValues] = useState({
    leadTime: settings.leadTime,
    safetyStockDays: settings.safetyStockDays,
    serviceLevelPercent: settings.serviceLevelPercent,
    lowStockThreshold: settings.lowStockThreshold,
    criticalStockThreshold: settings.criticalStockThreshold,
    forecastDays: settings.forecastDays,
    enableNotifications: settings.enableNotifications,
    notificationEmail: settings.notificationEmail,
    restockStrategy: settings.restockStrategy,
  });
  
  const handleSubmit = () => {
    submit(formValues, { method: "post" });
  };
  
  const handleChange = (field) => (value) => {
    setFormValues({ ...formValues, [field]: value });
  };
  
  const restockOptions = [
    { label: "Economic Order Quantity (EOQ)", value: "economic" },
    { label: "Just-in-Time", value: "jit" },
    { label: "Fixed Safety Stock", value: "fixed" },
  ];
  
  return (
    <Page 
      title="SkuSight Settings" 
      backAction={{
        content: 'Inventory Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {actionData?.saved && (
          <Layout.Section>
            <Banner
              title="Settings saved"
              status="success"
              onDismiss={() => {}}
            >
              <p>Your settings were successfully saved at {actionData.timestamp}.</p>
            </Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Inventory Prediction Settings
              </Text>
              
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Average Lead Time (days)"
                    type="number"
                    value={formValues.leadTime.toString()}
                    onChange={handleChange("leadTime")}
                    helpText="Average time between placing an order and receiving it"
                  />
                  
                  <TextField
                    label="Safety Stock (days)"
                    type="number"
                    value={formValues.safetyStockDays.toString()}
                    onChange={handleChange("safetyStockDays")}
                    helpText="Extra inventory to prevent stockouts during demand spikes"
                  />
                </FormLayout.Group>
                
                <Select
                  label="Restock Strategy"
                  options={restockOptions}
                  value={formValues.restockStrategy}
                  onChange={handleChange("restockStrategy")}
                  helpText="The algorithm used to determine optimal order quantities"
                />
                
                <TextField
                  label="Service Level Percentage"
                  type="number"
                  value={formValues.serviceLevelPercent.toString()}
                  onChange={handleChange("serviceLevelPercent")}
                  helpText="Higher service levels reduce stockouts but increase inventory costs (80-99%)"
                  min={80}
                  max={99}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Alert Settings
              </Text>
              
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Low Stock Threshold (days)"
                    type="number"
                    value={formValues.lowStockThreshold.toString()}
                    onChange={handleChange("lowStockThreshold")}
                    helpText="Inventory levels below this many days of sales will trigger a low stock alert"
                  />
                  
                  <TextField
                    label="Critical Stock Threshold (days)"
                    type="number"
                    value={formValues.criticalStockThreshold.toString()}
                    onChange={handleChange("criticalStockThreshold")}
                    helpText="Inventory levels below this many days of sales will trigger a critical alert"
                  />
                </FormLayout.Group>
                
                <TextField
                  label="Forecast Days"
                  type="number"
                  value={formValues.forecastDays.toString()}
                  onChange={handleChange("forecastDays")}
                  helpText="Number of days to include in inventory forecasts"
                />
                
                <Divider />
                
                <Select
                  label="Enable Notifications"
                  options={[
                    { label: "Yes", value: "true" },
                    { label: "No", value: "false" }
                  ]}
                  value={formValues.enableNotifications.toString()}
                  onChange={handleChange("enableNotifications")}
                  helpText="Receive alerts when inventory levels are low"
                />
                
                {formValues.enableNotifications && (
                  <TextField
                    label="Notification Email"
                    type="email"
                    value={formValues.notificationEmail}
                    onChange={handleChange("notificationEmail")}
                    helpText="Email address to receive inventory alerts"
                  />
                )}
              </FormLayout>
              
              <div style={{ marginTop: '2rem' }}>
                <Button primary onClick={handleSubmit}>Save Settings</Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}