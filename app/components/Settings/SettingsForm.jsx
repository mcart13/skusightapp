import { useState, useEffect } from "react";
import {
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  ChoiceList,
  InlineStack,
  Checkbox,
  Divider,
  Text
} from "@shopify/polaris";

/**
 * SettingsForm component for the Settings page
 * This component handles the main form for app settings
 */
export function SettingsForm({
  initialValues,
  onSubmit,
  onFormChange,
  hasUnsavedChanges,
  isSubmitting
}) {
  const [formValues, setFormValues] = useState(initialValues || {});
  
  // Update form values when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormValues(initialValues);
    }
  }, [initialValues]);
  
  // Notify parent component about form changes
  useEffect(() => {
    onFormChange(formValues);
  }, [formValues, onFormChange]);
  
  // Update form value and maintain the rest
  const updateFormValue = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Helper function to safely convert to string
  const safeToString = (value) => {
    return value !== undefined && value !== null ? value.toString() : "";
  };
  
  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formValues);
  };
  
  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <BlockStack gap="6">
          <Text variant="headingMd" fontWeight="semibold">
            General Settings
          </Text>
          
          <FormLayout>
            <TextField
              label="Lead Time (days)"
              type="number"
              value={safeToString(formValues.leadTime)}
              onChange={(value) => updateFormValue("leadTime", parseInt(value) || 0)}
              helpText="Average days between ordering and receiving inventory"
              min={1}
              autoComplete="off"
            />
            
            <Select
              label="Restock Strategy"
              options={[
                { label: "Economic Order Quantity", value: "economic" },
                { label: "Just-in-Time", value: "jit" },
                { label: "Fixed Interval", value: "fixed" },
                { label: "Fixed Quantity", value: "quantity" }
              ]}
              value={formValues.restockStrategy || "economic"}
              onChange={(value) => updateFormValue("restockStrategy", value)}
              helpText="Strategy used to determine when and how much to reorder"
            />
            
            <InlineStack wrap={false} gap="2">
              <TextField
                label="Low Stock Threshold (days)"
                type="number"
                value={safeToString(formValues.lowStockThreshold)}
                onChange={(value) => updateFormValue("lowStockThreshold", parseInt(value) || 0)}
                min={1}
                autoComplete="off"
              />
              
              <TextField
                label="Critical Stock Threshold (days)"
                type="number"
                value={safeToString(formValues.criticalStockThreshold)}
                onChange={(value) => updateFormValue("criticalStockThreshold", parseInt(value) || 0)}
                min={1}
                autoComplete="off"
              />
            </InlineStack>
            
            <ChoiceList
              title="Notification Preferences"
              allowMultiple
              choices={[
                { label: "Email", value: "email" },
                { label: "SMS", value: "sms" },
                { label: "In-app", value: "app" },
                { label: "Slack", value: "slack" }
              ]}
              selected={formValues.notificationPreferences || []}
              onChange={(values) => updateFormValue("notificationPreferences", values)}
            />
          </FormLayout>
          
          <Divider />
          
          <BlockStack gap="4">
            <InlineStack align="space-between">
              <Text variant="headingMd" fontWeight="semibold">
                Advanced Settings
              </Text>
              
              <Checkbox
                label="Enable Advanced Features"
                checked={formValues.advancedEnabled || false}
                onChange={(value) => updateFormValue("advancedEnabled", value)}
              />
            </InlineStack>
            
            {formValues.advancedEnabled && (
              <FormLayout>
                <TextField
                  label="Safety Stock Days"
                  type="number"
                  value={safeToString(formValues.safetyStockDays)}
                  onChange={(value) => updateFormValue("safetyStockDays", parseInt(value) || 0)}
                  helpText="Extra inventory to protect against variability"
                  min={0}
                  autoComplete="off"
                />
                
                <TextField
                  label="Service Level (%)"
                  type="number"
                  value={safeToString(formValues.serviceLevelPercent)}
                  onChange={(value) => updateFormValue("serviceLevelPercent", parseInt(value) || 0)}
                  helpText="Target percentage of customer demand to be satisfied"
                  min={50}
                  max={100}
                  autoComplete="off"
                />
                
                <TextField
                  label="Forecast Days"
                  type="number"
                  value={safeToString(formValues.forecastDays)}
                  onChange={(value) => updateFormValue("forecastDays", parseInt(value) || 0)}
                  helpText="Number of days to forecast demand"
                  min={7}
                  autoComplete="off"
                />
              </FormLayout>
            )}
          </BlockStack>
          
          <Divider />
          
          <BlockStack gap="4">
            <Text variant="headingMd" fontWeight="semibold">
              AI Tagging Settings
            </Text>
            
            <FormLayout>
              <Checkbox
                label="Enable AI Product Tagging"
                checked={formValues.aiTaggingEnabled !== false}
                onChange={(value) => updateFormValue("aiTaggingEnabled", value)}
                helpText="Use AI to automatically categorize and tag products"
              />
              
              {formValues.aiTaggingEnabled !== false && (
                <>
                  <Select
                    label="Tagging Frequency"
                    options={[
                      { label: "Daily", value: "daily" },
                      { label: "Weekly", value: "weekly" },
                      { label: "On Product Update", value: "onUpdate" },
                      { label: "Manual Only", value: "manual" }
                    ]}
                    value={formValues.aiTaggingFrequency || "daily"}
                    onChange={(value) => updateFormValue("aiTaggingFrequency", value)}
                  />
                  
                  <TextField
                    label="Batch Size"
                    type="number"
                    value={safeToString(formValues.aiTaggingBatchSize)}
                    onChange={(value) => updateFormValue("aiTaggingBatchSize", value)}
                    helpText="Number of products to process in each batch"
                    min={1}
                    max={200}
                    autoComplete="off"
                  />
                  
                  <ChoiceList
                    title="AI Data Sources"
                    allowMultiple
                    choices={[
                      { label: "Product Metadata", value: "metadata" },
                      { label: "Sales History", value: "sales" },
                      { label: "Profit Margins", value: "margins" },
                      { label: "Seasonal Patterns", value: "seasonal" },
                      { label: "Lead Times", value: "leadtime" }
                    ]}
                    selected={formValues.aiTaggingDataSources || []}
                    onChange={(values) => updateFormValue("aiTaggingDataSources", values)}
                  />
                </>
              )}
            </FormLayout>
          </BlockStack>
          
          <InlineStack align="end">
            <Button
              submit
              primary
              loading={isSubmitting}
              disabled={!hasUnsavedChanges || isSubmitting}
            >
              Save Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </form>
    </Card>
  );
} 