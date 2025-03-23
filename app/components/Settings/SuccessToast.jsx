import { Toast } from "@shopify/polaris";

/**
 * Success toast notification component
 * Shows a toast message when settings are successfully saved
 */
export function SuccessToast({
  isActive,
  onDismiss,
  message = "Settings saved successfully"
}) {
  if (!isActive) return null;
  
  return (
    <Toast
      content={message}
      onDismiss={onDismiss}
      duration={3000}
    />
  );
} 