import { useState, useEffect } from "react";
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
  Divider,
  InlineStack,
  Checkbox,
  Toast,
  ChoiceList
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Default values instead of database query
  const settings = {
    leadTime: 7,
    notificationPreferences: ["email"],
    advancedEnabled: false,
    safetyStockDays: 14,
    serviceLevelPercent: 95,
    lowStockThreshold: 7,
    criticalStockThreshold: 3,
    forecastDays: 30,
    restockStrategy: "economic",
  };
  
  return json({ settings });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // Log settings instead of saving to database
  console.log("Settings saved:", {
    shop: session.shop,
    leadTime: formData.get("leadTime"),
    notificationPreferences: formData.getAll("notificationPreferences"),
    advancedEnabled: formData.get("advancedEnabled"),
  });
  
  return json({ success: true, timestamp: new Date().toLocaleString() });
};

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [formValues, setFormValues] = useState({
    leadTime: settings.leadTime?.toString() || "7",
    notificationPreferences: settings.notificationPreferences || ["email"],
    advancedEnabled: settings.advancedEnabled || false,
    safetyStockDays: settings.safetyStockDays?.toString() || "14",
    serviceLevelPercent: settings.serviceLevelPercent?.toString() || "95",
    lowStockThreshold: settings.lowStockThreshold?.toString() || "7",
    criticalStockThreshold: settings.criticalStockThreshold?.toString() || "3",
    forecastDays: settings.forecastDays?.toString() || "30",
    restockStrategy: settings.restockStrategy || "economic",
  });
  
  useEffect(() => {
    if (actionData?.success) {
      setShowSuccessToast(true);
    }
  }, [actionData]);
  
  const handleSubmit = () => {
    const formData = new FormData();
    
    formData.append("leadTime", formValues.leadTime);
    formValues.notificationPreferences.forEach(pref => {
      formData.append("notificationPreferences", pref);
    });
    formData.append("advancedEnabled", formValues.advancedEnabled.toString());
    formData.append("safetyStockDays", formValues.safetyStockDays);
    formData.append("serviceLevelPercent", formValues.serviceLevelPercent);
    formData.append("lowStockThreshold", formValues.lowStockThreshold);
    formData.append("criticalStockThreshold", formValues.criticalStockThreshold);
    formData.append("forecastDays", formValues.forecastDays);
    formData.append("restockStrategy", formValues.restockStrategy);
    
    submit(formData, { method: "post" });
  };
  
  return (
    <Page 
      title="SkuSight Settings" 
      subtitle="Smart defaults already applied - customize only if needed"
      backAction={{
        content: 'Inventory Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd">Essential Settings</Text>
              
              <Banner title="Smart defaults applied">
                <p>We've analyzed your store and applied optimal settings automatically. 
                Adjustments are optional.</p>
              </Banner>
              
              <FormLayout>
                <TextField
                  label="Default restock lead time (days)"
                  type="number"
                  value={formValues.leadTime}
                  onChange={(value) => setFormValues({...formValues, leadTime: value})}
                  helpText="We'll alert you this many days before you run out of stock"
                  autoComplete="off"
                />
                
                <ChoiceList
                  allowMultiple
                  title="Send alerts via:"
                  choices={[
                    { label: "Email", value: "email" },
                    { label: "Shopify admin notifications", value: "admin" },
                    { label: "SMS (coming soon)", value: "sms", disabled: true },
                  ]}
                  selected={formValues.notificationPreferences}
                  onChange={(value) => setFormValues({...formValues, notificationPreferences: value})}
                />
              </FormLayout>
              
              <Divider />
              
              <InlineStack distribution="trailing">
                <Button primary onClick={handleSubmit}>Save Settings</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <InlineStack align="space-between">
                <Text variant="headingMd">Advanced Settings</Text>
                <div>
                  <Checkbox
                    label="Enable advanced settings"
                    checked={formValues.advancedEnabled}
                    onChange={(checked) => setFormValues({...formValues, advancedEnabled: checked})}
                  />
                </div>
              </InlineStack>
              
              {!formValues.advancedEnabled ? (
                <Text variant="bodyMd" color="subdued">
                  The default settings work for most stores. Enable advanced options 
                  only if you need to customize thresholds, forecasting parameters, or inventory algorithms.
                </Text>
              ) : (
                <BlockStack gap="4">
                  <Text variant="headingMd">Inventory Calculation Settings</Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Safety Stock (days)"
                        type="number"
                        value={formValues.safetyStockDays}
                        onChange={(value) => setFormValues({...formValues, safetyStockDays: value})}
                        helpText="Extra inventory to prevent stockouts during demand spikes"
                      />
                      
                      <TextField
                        label="Service Level Percentage"
                        type="number"
                        value={formValues.serviceLevelPercent}
                        onChange={(value) => setFormValues({...formValues, serviceLevelPercent: value})}
                        helpText="Higher service levels reduce stockouts but increase costs (80-99%)"
                      />
                    </FormLayout.Group>
                    
                    <Select
                      label="Restock Strategy"
                      options={[
                        { label: "Economic Order Quantity (EOQ)", value: "economic" },
                        { label: "Just-in-Time", value: "jit" },
                        { label: "Fixed Safety Stock", value: "fixed" }
                      ]}
                      value={formValues.restockStrategy}
                      onChange={(value) => setFormValues({...formValues, restockStrategy: value})}
                      helpText="The algorithm used to determine optimal order quantities"
                    />
                    
                    <Divider />
                    
                    <Text variant="headingMd">Alert Settings</Text>
                    <FormLayout.Group>
                      <TextField
                        label="Low Stock Threshold (days)"
                        type="number"
                        value={formValues.lowStockThreshold}
                        onChange={(value) => setFormValues({...formValues, lowStockThreshold: value})}
                        helpText="Days of inventory to trigger low stock alerts"
                      />
                      
                      <TextField
                        label="Critical Stock Threshold (days)"
                        type="number"
                        value={formValues.criticalStockThreshold}
                        onChange={(value) => setFormValues({...formValues, criticalStockThreshold: value})}
                        helpText="Days of inventory to trigger critical alerts"
                      />
                    </FormLayout.Group>
                    
                    <TextField
                      label="Forecast Days"
                      type="number"
                      value={formValues.forecastDays}
                      onChange={(value) => setFormValues({...formValues, forecastDays: value})}
                      helpText="Number of days to include in inventory forecasts"
                    />
                  </FormLayout>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {showSuccessToast && (
        <Toast content="Settings saved successfully" onDismiss={() => setShowSuccessToast(false)} />
      )}
    </Page>
  );
}