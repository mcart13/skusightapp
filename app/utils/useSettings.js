import { useState, useEffect } from 'react';
import { getSettings, subscribeToSettingsChanges } from './settings';

/**
 * Custom React hook for using app settings in components
 * 
 * This hook:
 * 1. Loads the current settings when the component mounts
 * 2. Updates when settings change via the global event system
 * 3. Provides access to all settings with automatic updates
 * 
 * @returns {Object} Current application settings
 */
export function useSettings() {
  const [settings, setSettings] = useState(getSettings());
  
  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = subscribeToSettingsChanges((newSettings) => {
      setSettings(newSettings);
    });
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  return settings;
}

/**
 * Hook that provides calculations for a product based on current settings
 * 
 * @param {Object} product - The product with inventoryQuantity
 * @param {number} dailySales - Average daily sales
 * @returns {Object} Calculations including reorderPoint, safetyStock, etc.
 */
export function useProductCalculations(product, dailySales) {
  const settings = useSettings();
  
  // Basic calculations
  const safetyStockDays = settings.safetyStockDays || 14;
  const safetyStock = Math.ceil(dailySales * safetyStockDays);
  
  const leadTime = settings.leadTime || 7;
  const leadTimeBuffer = Math.ceil(dailySales * leadTime);
  
  const reorderPoint = leadTimeBuffer + safetyStock;
  
  const lowStockThreshold = settings.lowStockThreshold || 7;
  const lowStockLevel = Math.ceil(dailySales * lowStockThreshold);
  
  const criticalStockThreshold = settings.criticalStockThreshold || 3;
  const criticalStockLevel = Math.ceil(dailySales * criticalStockThreshold);
  
  // Calculate optimal order quantity based on restock strategy
  let optimalOrderQty;
  const inventoryQuantity = product?.inventoryQuantity || 0;
  
  switch (settings.restockStrategy) {
    case "jit":
      // Just-in-time: Order exactly what you need
      optimalOrderQty = leadTimeBuffer;
      break;
    case "fixed":
      // Fixed safety stock: Order to replenish to safety stock level + lead time buffer
      optimalOrderQty = reorderPoint - inventoryQuantity;
      break;
    case "economic":
    default:
      // Economic Order Quantity (EOQ)
      optimalOrderQty = Math.ceil(dailySales * 30); // Simplified: Order a month's worth
      break;
  }
  
  // Determine stock status
  let status = "success";
  let label = "Healthy";
  
  if (inventoryQuantity <= 0) {
    status = "critical";
    label = "Out of Stock";
  } else if (inventoryQuantity <= criticalStockLevel) {
    status = "critical";
    label = "Critical Stock";
  } else if (inventoryQuantity <= lowStockLevel) {
    status = "warning";
    label = "Low Stock";
  } else if (inventoryQuantity <= reorderPoint) {
    status = "attention";
    label = "Monitor";
  }
  
  return {
    // Basic metrics
    safetyStock,
    leadTimeBuffer,
    reorderPoint,
    lowStockLevel,
    criticalStockLevel,
    optimalOrderQty: Math.max(0, optimalOrderQty),
    daysUntilStockout: dailySales > 0 ? Math.ceil(inventoryQuantity / dailySales) : Infinity,
    
    // Status indicators
    status,
    label,
    
    // Settings used in calculations
    settingsUsed: {
      safetyStockDays,
      leadTime,
      lowStockThreshold,
      criticalStockThreshold,
      restockStrategy: settings.restockStrategy
    }
  };
} 