import { Card, BlockStack, TextField, Select, Button } from "@shopify/polaris";

/**
 * AnalysisFilters component for filtering sales analysis data
 */
export function AnalysisFilters({ filters, onFiltersChange }) {
  // Handle text field change
  const handleTextFieldChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };
  
  // Handle select field change
  const handleSelectChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };
  
  // Handle reset filters
  const handleReset = () => {
    onFiltersChange({
      searchTerm: "",
      trendFilter: "all",
      popularityFilter: "all",
      stockLevelFilter: "all"
    });
  };
  
  return (
    <Card>
      <BlockStack gap="4">
        <TextField
          label="Search products"
          value={filters.searchTerm}
          onChange={(value) => handleTextFieldChange("searchTerm", value)}
          placeholder="Search by product name or SKU"
          clearButton
          onClearButtonClick={() => handleTextFieldChange("searchTerm", "")}
          autoComplete="off"
        />
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <Select
            label="Trend"
            options={[
              { label: "All trends", value: "all" },
              { label: "Growing (>5%)", value: "growing" },
              { label: "Declining (<-5%)", value: "declining" },
              { label: "Stable (-5% to 5%)", value: "stable" }
            ]}
            value={filters.trendFilter}
            onChange={(value) => handleSelectChange("trendFilter", value)}
          />
          
          <Select
            label="Popularity"
            options={[
              { label: "All popularity levels", value: "all" },
              { label: "Very High", value: "very-high" },
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" }
            ]}
            value={filters.popularityFilter}
            onChange={(value) => handleSelectChange("popularityFilter", value)}
          />
          
          <Select
            label="Stock Level"
            options={[
              { label: "All stock levels", value: "all" },
              { label: "Low stock (<7 days)", value: "low" },
              { label: "Medium (7-30 days)", value: "medium" },
              { label: "High (>30 days)", value: "high" }
            ]}
            value={filters.stockLevelFilter}
            onChange={(value) => handleSelectChange("stockLevelFilter", value)}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleReset}>Reset Filters</Button>
        </div>
      </BlockStack>
    </Card>
  );
} 