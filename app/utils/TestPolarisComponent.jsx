import React from 'react';
import { Card, Text } from "@shopify/polaris";

function TestPolarisComponent() {
  return (
    <Card>
      <Card.Section>
        <Text variant="headingMd">Test Polaris Component</Text>
        <Text>This is a test component that uses Polaris components.</Text>
      </Card.Section>
    </Card>
  );
}

export default TestPolarisComponent; 