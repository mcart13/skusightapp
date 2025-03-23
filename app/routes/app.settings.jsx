import { useState, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, Link, useNavigate, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Banner,
  Frame,
  Button
} from "@shopify/polaris";
import { DEFAULT_SETTINGS } from "../utils/constants";
import { getSettings, saveSettings } from "../utils/settings";
import {
  SettingsForm,
  NavigationConfirmationModal,
  SuccessToast
} from "../components/Settings";

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
  const actionData = useActionData();
  const submit = useSubmit();
  
  // UI state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState(initialSettings);
  const [formValues, setFormValues] = useState({});
  const [savedFormValues, setSavedFormValues] = useState(null);
  
  const formRef = useRef(null);
  
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
      aiTaggingEnabled: loadedSettings.aiTaggingEnabled ?? true,
      aiTaggingFrequency: loadedSettings.aiTaggingFrequency || "daily",
      aiTaggingBatchSize: loadedSettings.aiTaggingBatchSize || "50",
      aiTaggingDataSources: loadedSettings.aiTaggingDataSources || ["metadata", "sales", "margins", "seasonal", "leadtime"]
    };
    
    setFormValues(initialFormValues);
    // Store a copy of the initial form values to detect changes
    setSavedFormValues(JSON.parse(JSON.stringify(initialFormValues)));
    setHasUnsavedChanges(false);
  }, []);
  
  // Add event listener for page unload when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes that will be lost if you leave this page.";
        return e.returnValue;
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  // Handle successful form submission
  useEffect(() => {
    if (actionData?.success && isSubmitting) {
      // Reset submission state
      setIsSubmitting(false);
      
      // Show success toast
      setShowSuccessToast(true);
      
      // Save to localStorage
      saveSettings(actionData.settings);
      
      // Update saved values to match current values
      setSavedFormValues(JSON.parse(JSON.stringify(formValues)));
      setHasUnsavedChanges(false);
    }
  }, [actionData, isSubmitting, formValues]);
  
  // Handle form submission
  const handleSubmit = (values) => {
    setIsSubmitting(true);
    
    // Convert form values to FormData
    const formData = new FormData();
    
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(val => formData.append(key, val));
      } else if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else {
        formData.append(key, value);
      }
    });
    
    submit(formData, { method: "post" });
  };
  
  // Handle form value changes
  const handleFormValueChange = (newValues) => {
    setFormValues(newValues);
    if (savedFormValues) {
      const formString = JSON.stringify(newValues);
      const savedString = JSON.stringify(savedFormValues);
      setHasUnsavedChanges(formString !== savedString);
    }
  };
  
  // Handle navigation away from the page
  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      // Store the pending navigation and show confirmation dialog
      setPendingNavigation("/app");
      setShowNavigationModal(true);
    } else {
      // No changes, navigate directly
      navigate("/app");
    }
  };
  
  // Handle confirmed navigation
  const handleConfirmedNavigation = () => {
    setShowNavigationModal(false);
    
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };
  
  return (
    <Frame>
      <Page
        title="Settings"
        backAction={{
          content: "Dashboard",
          onAction: handleBackNavigation
        }}
        primaryAction={
          <Button onClick={() => navigate("/app/sales-analysis")}>
            View Sales Analysis
          </Button>
        }
      >
        <BlockStack gap="5">
          {actionData?.success === false && (
            <Banner tone="critical">
              {actionData.message || "There was an error saving your settings."}
            </Banner>
          )}
          
          <Layout>
            <Layout.Section>
              <SettingsForm
                initialValues={formValues}
                onSubmit={handleSubmit}
                onFormChange={handleFormValueChange}
                hasUnsavedChanges={hasUnsavedChanges}
                isSubmitting={isSubmitting}
              />
            </Layout.Section>
            
            <Layout.Section secondary>
              <Card>
                <BlockStack gap="4">
                  <Text variant="headingMd" fontWeight="semibold">
                    Settings Help
                  </Text>
                  
                  <Text>
                    Configure your inventory management preferences here. These settings affect how the app calculates reorder points,
                    safety stock, and when to alert you about low inventory.
                  </Text>
                  
                  <Text>
                    <strong>Lead Time:</strong> The average time it takes from placing an order to receiving it at your warehouse.
                  </Text>
                  
                  <Text>
                    <strong>Safety Stock:</strong> Extra inventory kept to reduce the risk of stockouts due to uncertainty in demand and supply.
                  </Text>
                  
                  <Text>
                    <strong>AI Tagging:</strong> Enables the system to automatically categorize and tag your products based on multiple data sources.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
        
        {/* Navigation confirmation modal */}
        <NavigationConfirmationModal
          isOpen={showNavigationModal}
          onConfirm={handleConfirmedNavigation}
          onCancel={() => setShowNavigationModal(false)}
        />
        
        {/* Success toast notification */}
        <SuccessToast
          isActive={showSuccessToast}
          onDismiss={() => setShowSuccessToast(false)}
          message="Settings saved successfully"
        />
      </Page>
    </Frame>
  );
}