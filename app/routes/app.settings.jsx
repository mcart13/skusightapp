import { useState, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigate, useLocation, useOutletContext, Form } from "@remix-run/react";
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
  ChoiceList,
  Frame,
  Modal
} from "@shopify/polaris";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, SETTINGS_CHANGED_EVENT } from "../utils/constants";
import { getSettings, saveSettings } from "../utils/settings";

export const loader = async ({ request }) => {
  // Import our authentication utility that bypasses Shopify auth
  const { authenticateRoute } = await import("../utils/auth");
  
  // Use the custom auth utility that bypasses authentication
  await authenticateRoute(request);
  
  return json({ initialSettings: DEFAULT_SETTINGS });
};

export const action = async ({ request }) => {
  // Import our authentication utility that bypasses Shopify auth
  const { authenticateRoute } = await import("../utils/auth");
  
  // Use the custom auth utility that bypasses authentication
  await authenticateRoute(request);
  const formData = await request.formData();
  
  // Process form data
  const settings = {
    leadTime: parseInt(formData.get("leadTime") || "7", 10),
    notificationPreferences: formData.getAll("notificationPreferences"),
    advancedEnabled: formData.get("advancedEnabled") === "true",
    safetyStockDays: parseInt(formData.get("safetyStockDays") || "14", 10),
    serviceLevelPercent: parseInt(formData.get("serviceLevelPercent") || "95", 10),
    lowStockThreshold: parseInt(formData.get("lowStockThreshold") || "7", 10),
    criticalStockThreshold: parseInt(formData.get("criticalStockThreshold") || "3", 10),
    forecastDays: parseInt(formData.get("forecastDays") || "30", 10),
    restockStrategy: formData.get("restockStrategy") || "economic",
    aiTaggingEnabled: formData.get("aiTaggingEnabled") === "true",
    aiTaggingFrequency: formData.get("aiTaggingFrequency") || "daily",
    aiTaggingBatchSize: formData.get("aiTaggingBatchSize") || "50",
    aiTaggingDataSources: formData.getAll("aiTaggingDataSources")
  };
  
  // Return success response
  return json({ 
    settings, 
    success: true,
    timestamp: new Date().toLocaleString()
  });
};

export default function Settings() {
  const navigate = useNavigate();
  const { initialSettings } = useLoaderData();
  const { shop, host } = useOutletContext();
  const actionData = useActionData();
  const submit = useSubmit();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);
  
  // Initialize form values as an empty state that will be populated
  const [formValues, setFormValues] = useState({
    leadTime: "",
    notificationPreferences: [],
    advancedEnabled: false,
    safetyStockDays: "",
    serviceLevelPercent: "",
    lowStockThreshold: "",
    criticalStockThreshold: "",
    forecastDays: "",
    restockStrategy: "",
    aiTaggingEnabled: true,
    aiTaggingFrequency: "",
    aiTaggingBatchSize: "",
    aiTaggingDataSources: []
  });
  
  // Store a reference to the last saved form values
  const [savedFormValues, setSavedFormValues] = useState(null);
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    
    // Initialize form values from loaded settings 
    const initialFormValues = {
      leadTime: loadedSettings.leadTime?.toString() || "7",
      notificationPreferences: loadedSettings.notificationPreferences || ["email"],
      advancedEnabled: loadedSettings.advancedEnabled || false,
      safetyStockDays: loadedSettings.safetyStockDays?.toString() || "14",
      serviceLevelPercent: loadedSettings.serviceLevelPercent?.toString() || "95",
      lowStockThreshold: loadedSettings.lowStockThreshold?.toString() || "7",
      criticalStockThreshold: loadedSettings.criticalStockThreshold?.toString() || "3",
      forecastDays: loadedSettings.forecastDays?.toString() || "30",
      restockStrategy: loadedSettings.restockStrategy || "economic",
      aiTaggingEnabled: loadedSettings.aiTaggingEnabled || true,
      aiTaggingFrequency: loadedSettings.aiTaggingFrequency || "daily",
      aiTaggingBatchSize: loadedSettings.aiTaggingBatchSize || "50",
      aiTaggingDataSources: loadedSettings.aiTaggingDataSources || ["metadata", "sales", "margins", "seasonal", "leadtime"]
    };
    
    setFormValues(initialFormValues);
    // Store a copy of the initial form values to detect changes
    setSavedFormValues(JSON.parse(JSON.stringify(initialFormValues)));
    setHasUnsavedChanges(false);
  }, []);
  
  // Compare current form values with saved form values whenever form values change
  useEffect(() => {
    if (savedFormValues && !isSubmitting) {
      const formString = JSON.stringify(formValues);
      const savedString = JSON.stringify(savedFormValues);
      setHasUnsavedChanges(formString !== savedString);
    }
  }, [formValues, savedFormValues, isSubmitting]);
  
  // Handle successful form submission
  useEffect(() => {
    if (actionData?.success && isSubmitting) {
      // Reset submission state
      setIsSubmitting(false);
      
      // Show success toast for 3 seconds
      setShowSuccessToast(true);
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      
      // Convert form values to settings object
      const settingsToSave = {
        leadTime: parseInt(formValues.leadTime),
        notificationPreferences: formValues.notificationPreferences,
        advancedEnabled: formValues.advancedEnabled,
        safetyStockDays: parseInt(formValues.safetyStockDays),
        serviceLevelPercent: parseInt(formValues.serviceLevelPercent),
        lowStockThreshold: parseInt(formValues.lowStockThreshold),
        criticalStockThreshold: parseInt(formValues.criticalStockThreshold),
        forecastDays: parseInt(formValues.forecastDays),
        restockStrategy: formValues.restockStrategy,
        aiTaggingEnabled: formValues.aiTaggingEnabled,
        aiTaggingFrequency: formValues.aiTaggingFrequency,
        aiTaggingBatchSize: formValues.aiTaggingBatchSize,
        aiTaggingDataSources: formValues.aiTaggingDataSources
      };
      
      // Save settings
      saveSettings(settingsToSave);
      
      // Update the settings state
      setSettings(settingsToSave);
      
      // After saving, create a new copy of form values to detect future changes
      setSavedFormValues(JSON.parse(JSON.stringify(formValues)));
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // If there's a pending navigation, execute it
      if (pendingNavigation) {
        const urlParams = shop && host ? `?shop=${shop}&host=${host}` : '';
        window.location.href = `${pendingNavigation}${urlParams}`;
        setPendingNavigation(null);
      }
      
      // Clean up timer if component unmounts
      return () => clearTimeout(timer);
    }
  }, [actionData, formValues, shop, host, pendingNavigation, isSubmitting]);
  
  // Handle form submission
  const handleSubmit = () => {
    // Set submitting state to true to indicate intentional submission
    setIsSubmitting(true);
    
    // Create FormData for Remix submit function
    const formData = new FormData();
    
    // Add all form values
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
    
    // AI tagging settings
    formData.append("aiTaggingEnabled", formValues.aiTaggingEnabled.toString());
    formData.append("aiTaggingFrequency", formValues.aiTaggingFrequency);
    formData.append("aiTaggingBatchSize", formValues.aiTaggingBatchSize);
    formValues.aiTaggingDataSources.forEach(source => {
      formData.append("aiTaggingDataSources", source);
    });
    
    // Use Remix's submit function which will handle the submission as an AJAX request
    submit(formData, { method: "post" });
  };
  
  // Handle form value changes
  const handleFormValueChange = (newValues) => {
    // Update form values with the new values
    setFormValues({...formValues, ...newValues});
  };
  
  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only trigger warning if there are unsaved changes AND we're not currently submitting
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isSubmitting]);
  
  // Handle navigation when there are unsaved changes
  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      setShowNavigationModal(true);
      setPendingNavigation('/app');
    } else {
      // Always include shop and host parameters when navigating
      const urlParams = shop && host ? `?shop=${shop}&host=${host}` : '';
      // Use window.location for direct navigation rather than React Router
      window.location.href = `/app${urlParams}`;
    }
  };
  
  // Handle confirmed navigation
  const handleConfirmedNavigation = () => {
    if (pendingNavigation) {
      const urlParams = shop && host ? `?shop=${shop}&host=${host}` : '';
      window.location.href = `${pendingNavigation}${urlParams}`;
      setPendingNavigation(null);
      setShowNavigationModal(false);
    }
  };
  
  return (
    <Frame>
      <Page 
        title="SkuSight Settings" 
        subtitle="Smart defaults already applied - customize only if needed"
        backAction={{
          content: 'Inventory Dashboard',
          onAction: handleBackNavigation
        }}
      >
        {/* Only show the unsaved changes notification if changes are detected */}
        {hasUnsavedChanges && (
          <div style={{ 
            position: 'sticky', 
            top: '0', 
            zIndex: 10, 
            backgroundColor: '#f4f6f8', 
            padding: '16px', 
            marginBottom: '16px',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft: '4px solid #50b83c'
          }}>
            <Text variant="bodyMd" fontWeight="medium">You have unsaved changes</Text>
            <Button primary onClick={handleSubmit}>Save Changes</Button>
          </div>
        )}

        <Form
          method="post"
          ref={formRef}
        >
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="4">
                  <Text variant="headingMd">General Settings</Text>
                  
                  <Banner title="Smart defaults applied">
                    <p>We've analyzed your store and applied optimal settings automatically. 
                    Adjustments are optional.</p>
                  </Banner>
                  
                  <FormLayout>
                    <TextField
                      label="Default restock lead time (days)"
                      type="number"
                      value={formValues.leadTime}
                      onChange={(value) => handleFormValueChange({leadTime: value})}
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
                      onChange={(value) => handleFormValueChange({notificationPreferences: value})}
                    />
                  </FormLayout>
                  
                  <Divider />
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
                        onChange={(checked) => handleFormValueChange({advancedEnabled: checked})}
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
                            onChange={(value) => handleFormValueChange({safetyStockDays: value})}
                            helpText="Extra inventory to prevent stockouts during demand spikes"
                          />
                          
                          <TextField
                            label="Service Level Percentage"
                            type="number"
                            value={formValues.serviceLevelPercent}
                            onChange={(value) => handleFormValueChange({serviceLevelPercent: value})}
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
                          onChange={(value) => handleFormValueChange({restockStrategy: value})}
                          helpText="The algorithm used to determine optimal order quantities"
                        />
                        
                        <Divider />
                        
                        <Text variant="headingMd">Alert Settings</Text>
                        <FormLayout.Group>
                          <TextField
                            label="Low Stock Threshold (days)"
                            type="number"
                            value={formValues.lowStockThreshold}
                            onChange={(value) => handleFormValueChange({lowStockThreshold: value})}
                            helpText="Days of inventory to trigger low stock alerts"
                          />
                          
                          <TextField
                            label="Critical Stock Threshold (days)"
                            type="number"
                            value={formValues.criticalStockThreshold}
                            onChange={(value) => handleFormValueChange({criticalStockThreshold: value})}
                            helpText="Days of inventory to trigger critical alerts"
                          />
                        </FormLayout.Group>
                        
                        <TextField
                          label="Forecast Days"
                          type="number"
                          value={formValues.forecastDays}
                          onChange={(value) => handleFormValueChange({forecastDays: value})}
                          helpText="Number of days to include in inventory forecasts"
                        />
                        
                        <Divider />
                        
                        <Text variant="headingMd">AI Tagging System</Text>
                        <Banner title="Automatic AI tagging" status="info">
                          <p>The AI tagging system automatically analyzes your products and adds smart tags to optimize inventory forecasting.</p>
                        </Banner>
                        
                        <Checkbox
                          label="Enable automatic AI tagging"
                          checked={formValues.aiTaggingEnabled}
                          onChange={(checked) => handleFormValueChange({aiTaggingEnabled: checked})}
                          helpText="When enabled, AI tags will be automatically applied to your products on a regular schedule"
                        />
                        
                        <FormLayout.Group>
                          <Select
                            label="Tagging Frequency"
                            disabled={!formValues.aiTaggingEnabled}
                            options={[
                              { label: "Daily", value: "daily" },
                              { label: "Weekly", value: "weekly" },
                              { label: "Monthly", value: "monthly" },
                              { label: "With inventory changes", value: "changes" }
                            ]}
                            value={formValues.aiTaggingFrequency}
                            onChange={(value) => handleFormValueChange({aiTaggingFrequency: value})}
                            helpText="How often AI should analyze and update product tags"
                          />
                          
                          <TextField
                            label="Products Per Batch"
                            type="number"
                            disabled={!formValues.aiTaggingEnabled}
                            value={formValues.aiTaggingBatchSize}
                            onChange={(value) => handleFormValueChange({aiTaggingBatchSize: value})}
                            helpText="Maximum number of products to process in each batch"
                          />
                        </FormLayout.Group>
                        
                        <FormLayout.Group>
                          <ChoiceList
                            title="Data Sources for Tagging"
                            disabled={!formValues.aiTaggingEnabled}
                            allowMultiple
                            choices={[
                              { label: "Product categories and vendors", value: "metadata", disabled: false },
                              { label: "Sales history and velocity", value: "sales", disabled: false },
                              { label: "Price and margins", value: "margins", disabled: false },
                              { label: "Seasonality patterns", value: "seasonal", disabled: false },
                              { label: "Supplier lead times", value: "leadtime", disabled: false }
                            ]}
                            selected={formValues.aiTaggingDataSources}
                            onChange={(value) => handleFormValueChange({aiTaggingDataSources: value})}
                          />
                        </FormLayout.Group>
                      </FormLayout>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
          
          {/* Success toast - controlled by a single state variable */}
          {showSuccessToast && (
            <Toast content="Settings saved successfully" onDismiss={() => setShowSuccessToast(false)} />
          )}
          
          {/* Navigation confirmation modal */}
          <Modal
            open={showNavigationModal}
            onClose={() => setShowNavigationModal(false)}
            title="Unsaved Changes"
            primaryAction={{
              content: "Save and Continue",
              onAction: handleSubmit
            }}
            secondaryActions={[
              {
                content: "Leave Without Saving",
                onAction: handleConfirmedNavigation
              },
              {
                content: "Cancel",
                onAction: () => setShowNavigationModal(false)
              }
            ]}
          >
            <Modal.Section>
              <Text>You have unsaved changes. What would you like to do?</Text>
            </Modal.Section>
          </Modal>
        </Form>
      </Page>
    </Frame>
  );
}