import { useState } from "react";
import { DataTable, Text, Badge, ProgressBar } from "@shopify/polaris";
import { calculateProgressPercentage } from "../../services/salesAnalysis";
import styles from "./TrendTable.module.css";

/**
 * TrendTable component for displaying sales data with trend indicators
 */
export function TrendTable({ products, onProductSelect }) {
  const [sortedField, setSortedField] = useState("trend");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Sort the products based on the selected field and direction
  const sortedProducts = [...products].sort((a, b) => {
    const aValue = a[sortedField];
    const bValue = b[sortedField];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    }
    
    // String comparison for non-numeric fields
    const aString = String(aValue || '');
    const bString = String(bValue || '');
    
    return sortDirection === 'desc' 
      ? bString.localeCompare(aString) 
      : aString.localeCompare(bString);
  });
  
  // Handle sort change
  const handleSort = (field) => {
    if (field === sortedField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction to descending
      setSortedField(field);
      setSortDirection('desc');
    }
  };
  
  // Create table rows from product data
  const rows = sortedProducts.map(product => [
    <Text key={`title-${product.id}`} variant="bodyMd" fontWeight="semibold" onClick={() => onProductSelect(product)}>
      {product.title}
    </Text>,
    <Text key={`sku-${product.id}`} variant="bodyMd">{product.sku || 'N/A'}</Text>,
    <Text key={`monthly-${product.id}`} variant="bodyMd" alignment="end">{product.monthlyVolume}</Text>,
    <div key={`trend-${product.id}`}>
      <Text
        variant="bodyMd" 
        alignment="end"
        color={product.trend > 0 ? 'success' : (product.trend < 0 ? 'critical' : 'subdued')}
      >
        {product.trend > 0 ? '+' : ''}{product.trend}%
      </Text>
    </div>,
    <div key={`popularity-${product.id}`}>
      {product.popularityTier === 'very-high' && <Badge tone="success">Very High</Badge>}
      {product.popularityTier === 'high' && <Badge tone="success">High</Badge>}
      {product.popularityTier === 'medium' && <Badge tone="attention">Medium</Badge>}
      {product.popularityTier === 'low' && <Badge tone="info">Low</Badge>}
    </div>,
    <div key={`stock-${product.id}`} className={styles.stockContainer}>
      <Text variant="bodyMd" alignment="end">{product.stockLevel}</Text>
      <ProgressBar 
        progress={calculateProgressPercentage(
          product.stockLevel, 
          Math.max(product.stockLevel, product.monthlyVolume * 2)
        )}
        size="small"
        tone={product.daysOfInventory < 7 ? 'critical' : (product.daysOfInventory < 14 ? 'warning' : 'success')}
      />
      <Text variant="bodySm" alignment="end" color="subdued">
        {product.daysOfInventory} days
      </Text>
    </div>
  ]);
  
  // Define sortable headings
  const sortableHeadings = [
    { title: "Product", sortKey: "title" },
    { title: "SKU", sortKey: "sku" },
    { title: "Monthly Sales", sortKey: "monthlyVolume" },
    { title: "Trend", sortKey: "trend" },
    { title: "Popularity", sortKey: "popularityTier" },
    { title: "Stock Level", sortKey: "stockLevel" }
  ];
  
  // Generate headings with sort indicators
  const headings = sortableHeadings.map(heading => {
    const isSorted = sortedField === heading.sortKey;
    
    return (
      <div key={heading.sortKey} onClick={() => handleSort(heading.sortKey)} className={styles.clickableHeading}>
        <Text fontWeight={isSorted ? 'bold' : 'regular'}>
          {heading.title}
          {isSorted && ` ${sortDirection === 'asc' ? '↑' : '↓'}`}
        </Text>
      </div>
    );
  });
  
  return (
    <DataTable
      columnContentTypes={["text", "text", "numeric", "numeric", "text", "numeric"]}
      headings={headings}
      rows={rows}
      sortable
      hoverable
    />
  );
} 