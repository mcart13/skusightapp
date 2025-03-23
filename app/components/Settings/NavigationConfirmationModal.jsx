import { Modal, TextContainer, ButtonGroup, Button } from "@shopify/polaris";

/**
 * Navigation confirmation modal
 * Shows a warning when trying to leave the settings page with unsaved changes
 */
export function NavigationConfirmationModal({
  isOpen,
  onConfirm,
  onCancel
}) {
  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      title="Unsaved Changes"
      primaryAction={{
        content: "Discard changes",
        destructive: true,
        onAction: onConfirm,
      }}
      secondaryActions={[
        {
          content: "Keep editing",
          onAction: onCancel,
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            You have unsaved changes that will be lost if you leave this page.
            Are you sure you want to discard your changes?
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
} 