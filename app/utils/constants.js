// constants.js - App-wide constants

// Settings constants
export const SETTINGS_STORAGE_KEY = "skusight_settings";
export const SETTINGS_CHANGED_EVENT = "skusight_settings_changed";

// Default settings
export const DEFAULT_SETTINGS = {
  leadTime: 7,
  notificationPreferences: ["email"],
  advancedEnabled: false,
  safetyStockDays: 14,
  serviceLevelPercent: 95,
  lowStockThreshold: 7,
  criticalStockThreshold: 3,
  forecastDays: 30,
  restockStrategy: "economic",
  aiTaggingEnabled: true,
  aiTaggingFrequency: "daily",
  aiTaggingBatchSize: "50",
  aiTaggingDataSources: ["metadata", "sales", "margins", "seasonal", "leadtime"]
}; 