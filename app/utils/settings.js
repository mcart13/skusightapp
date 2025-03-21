import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, SETTINGS_CHANGED_EVENT } from "./constants";

// Get current settings from localStorage
export function getSettings() {
  if (typeof window !== 'undefined') {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveSettings(settings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    
    // Dispatch event so other components can react
    const event = new CustomEvent(SETTINGS_CHANGED_EVENT, { 
      detail: { settings } 
    });
    window.dispatchEvent(event);
    
    return true;
  }
  return false;
}

// Subscribe to settings changes
export function subscribeToSettingsChanges(callback) {
  if (typeof window !== 'undefined') {
    const handler = (event) => {
      callback(event.detail.settings);
    };
    
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    
    // Return unsubscribe function
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
    };
  }
  
  // Return no-op if not in browser
  return () => {};
}

// React hook for accessing settings
export function useAppSettings() {
  // This would be a React custom hook that uses useState and useEffect
  // to manage and subscribe to settings changes
  // For demo purposes, we'll just return a simple getter function
  return getSettings();
}

// Apply settings to calculations
export function applySettingsToCalculations(product, dailySales) {
  const settings = getSettings();
  
  // Calculate safety stock based on settings
  const safetyStockDays = settings.safetyStockDays || 14;
  const safetyStock = Math.ceil(dailySales * safetyStockDays);
  
  // Calculate lead time buffer based on settings
  const leadTime = settings.leadTime || 7;
  const leadTimeBuffer = Math.ceil(dailySales * leadTime);
  
  // Calculate reorder point based on settings
  const reorderPoint = leadTimeBuffer + safetyStock;
  
  // Calculate low stock threshold
  const lowStockThreshold = settings.lowStockThreshold || 7;
  const lowStockLevel = Math.ceil(dailySales * lowStockThreshold);
  
  // Calculate critical stock threshold
  const criticalStockThreshold = settings.criticalStockThreshold || 3;
  const criticalStockLevel = Math.ceil(dailySales * criticalStockThreshold);
  
  // Calculate optimal order quantity based on restock strategy
  let optimalOrderQty;
  
  switch (settings.restockStrategy) {
    case "jit":
      // Just-in-time: Order exactly what you need
      optimalOrderQty = leadTimeBuffer;
      break;
    case "fixed":
      // Fixed safety stock: Order to replenish to safety stock level + lead time buffer
      optimalOrderQty = reorderPoint - product.inventoryQuantity;
      break;
    case "economic":
    default:
      // Economic Order Quantity (EOQ): More complex calculation
      // In a real implementation, this would use the EOQ formula with holding costs, etc.
      // For simplicity, we'll use a basic approximation
      optimalOrderQty = Math.ceil(dailySales * 30); // Order a month's worth of inventory
      break;
  }
  
  return {
    safetyStock,
    leadTimeBuffer,
    reorderPoint,
    lowStockLevel,
    criticalStockLevel,
    optimalOrderQty: Math.max(0, optimalOrderQty),
    daysUntilStockout: dailySales > 0 ? Math.ceil(product.inventoryQuantity / dailySales) : Infinity
  };
} 