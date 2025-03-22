import { useState, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getCache, setCache, deleteCache } from "../utils/redis.server.js";
import { getCacheStats, clearAllCaches, clearCachePattern } from "../utils/cache-manager.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  
  // Check cache first
  const cacheKey = `system-status:${shop}`;
  let cachedData = await getCache(cacheKey);
  
  // If we have a valid cache, return it
  if (cachedData) {
    console.log("Using cached system status data");
    return json(cachedData);
  }
  
  // Import server-only modules directly in the loader function
  const { getRecentAlerts } = await import("../services/alerting.server");
  const { LogLevel } = await import("../services/logging.server");
  const db = await import("../db.server").then(module => module.default);
  
  // Fetch system status information
  const lastRun = new Date(Date.now() - 12 * 60 * 60 * 1000).toLocaleString();
  const nextScheduledRun = new Date(Date.now() + 12 * 60 * 60 * 1000).toLocaleString();
  
  // Get stats
  const stats = {
    totalProducts: 78,
    productsTagged: 62,
    percentTagged: 79,
    lastRunDuration: "2m 37s",
    totalTags: 287,
    averageTagsPerProduct: 4.6
  };
  
  // Get recent alerts from the database
  const recentAlerts = await getRecentAlerts({
    shop,
    limit: 5
  });
  
  // Get settings
  const settings = await db.shopSettings.findUnique({
    where: { shopDomain: shop }
  }) || {
    aiTaggingEnabled: true,
    aiTaggingFrequency: "daily",
    performanceAlertThreshold: 60000 // 1 minute in ms
  };
  
  // Get cache stats
  const cacheStats = await getCacheStats();
  
  const responseData = { 
    status: {
      aiTaggingEnabled: settings.aiTaggingEnabled,
      lastRun,
      nextScheduledRun,
      performanceThreshold: settings.performanceAlertThreshold,
      stats,
      cacheStats,
      recentAlerts: recentAlerts.map(alert => ({
        id: alert.id,
        timestamp: new Date(alert.timestamp).toLocaleString(),
        level: alert.level,
        message: alert.message,
        source: alert.source
      }))
    } 
  };
  
  // Cache the data for 5 minutes (300 seconds)
  await setCache(cacheKey, responseData, 300);
  
  return json(responseData);
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  const formData = await request.formData();
  const action = formData.get("action");
  const fullSync = formData.get("fullSync") === "true";
  
  // Import server-only modules directly in the action function
  const db = await import("../db.server").then(module => module.default);
  
  switch (action) {
    case "run-now":
      // Trigger a new tagging job
      try {
        // In a real app, this would queue a background job
        const job = await db.processingJob.create({
          data: {
            id: `manual-${Date.now()}`,
            shopDomain: shop,
            jobType: "auto-tag-products",
            status: "queued",
            payload: JSON.stringify({
              manualRun: true,
              fullSync: fullSync,
              timestamp: Date.now()
            }),
            createdAt: new Date()
          }
        });
        
        // Clear the system status cache since we just triggered a job
        await deleteCache(`system-status:${shop}`);
        
        return json({
          success: true,
          message: fullSync 
            ? "Full auto-tagging job started successfully" 
            : "Auto-tagging job started successfully",
          jobId: job.id
        });
      } catch (error) {
        return json({
          success: false,
          message: `Failed to start job: ${error.message}`
        });
      }
      
    case "clear-cache":
      // Clear all or specific caches
      try {
        const pattern = formData.get("pattern");
        let result;
        
        if (pattern) {
          result = await clearCachePattern(pattern);
        } else {
          result = await clearAllCaches();
        }
        
        // Clear the system status cache
        await deleteCache(`system-status:${shop}`);
        
        return json({
          success: result.success,
          message: result.message
        });
      } catch (error) {
        return json({
          success: false,
          message: `Failed to clear caches: ${error.message}`
        });
      }
      
    default:
      return json({
        success: false,
        message: "Unknown action"
      });
  }
};

export default function SystemStatus() {
  const { status } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [fullSync, setFullSync] = useState(false);
  const [cachePattern, setCachePattern] = useState("*");
  
  const handleRunNow = () => {
    const formData = new FormData();
    formData.append("action", "run-now");
    formData.append("fullSync", fullSync.toString());
    submit(formData, { method: "post" });
  };
  
  const handleClearCache = (pattern = null) => {
    const formData = new FormData();
    formData.append("action", "clear-cache");
    if (pattern) {
      formData.append("pattern", pattern);
    }
    submit(formData, { method: "post" });
  };
  
  return (
    <div style={{ padding: "20px" }}>
      <h1>System Status Dashboard</h1>
      
      <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h2>System Overview</h2>
        <p>System Status: {status.aiTaggingEnabled ? "Active" : "Paused"}</p>
        <p>Last Run: {status.lastRun}</p>
        <p>Next Scheduled Run: {status.nextScheduledRun}</p>
        <p>Performance Threshold: {(status.performanceThreshold / 1000).toFixed(0)} seconds</p>
        
        <div style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
          <input
            type="checkbox"
            id="fullSync"
            checked={fullSync}
            onChange={(e) => setFullSync(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          <label htmlFor="fullSync">Full Sync (process all products, may take longer)</label>
        </div>
        
        <button 
          onClick={handleRunNow}
          style={{
            backgroundColor: "#008060",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Run Tagging Job Now
        </button>
      </div>
      
      <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h2>Tagging Statistics</h2>
        <p>Total Products: {status.stats.totalProducts}</p>
        <p>Products Tagged: {status.stats.productsTagged} ({status.stats.percentTagged}%)</p>
        <p>Average Tags per Product: {status.stats.averageTagsPerProduct}</p>
        <p>Last Run Duration: {status.stats.lastRunDuration}</p>
      </div>
      
      {status.cacheStats && (
        <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h2>Cache Status</h2>
          <p>Status: <span style={{color: status.cacheStats.status === 'connected' ? '#008060' : '#cc0000'}}>{status.cacheStats.status}</span></p>
          <p>Keys Stored: {status.cacheStats.keyCount}</p>
          <p>Memory Usage: {status.cacheStats.memoryUsage}</p>
          <p>Hit Rate: {status.cacheStats.hitRate}%</p>
          <p>Uptime: {status.cacheStats.uptime} minutes</p>
          
          <div style={{ margin: "15px 0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => handleClearCache()}
              style={{
                backgroundColor: "#cc0000",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear All Caches
            </button>
            
            <button
              onClick={() => handleClearCache("products:*")}
              style={{
                backgroundColor: "#e67700",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear Product Cache
            </button>
            
            <button
              onClick={() => handleClearCache("orders:*")}
              style={{
                backgroundColor: "#e67700",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear Orders Cache
            </button>
            
            <button
              onClick={() => handleClearCache("metrics:*")}
              style={{
                backgroundColor: "#e67700",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear Metrics Cache
            </button>
          </div>
          
          <div style={{ marginTop: "15px" }}>
            <p style={{ marginBottom: "5px" }}>Clear cache by pattern:</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={cachePattern}
                onChange={(e) => setCachePattern(e.target.value)}
                placeholder="Cache pattern (e.g., products:*)"
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  flex: 1
                }}
              />
              <button
                onClick={() => handleClearCache(cachePattern)}
                style={{
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
        <h2>Recent Alerts</h2>
        {status.recentAlerts && status.recentAlerts.length > 0 ? (
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {status.recentAlerts.map(alert => (
              <li key={alert.id} style={{ 
                padding: "10px", 
                marginBottom: "10px", 
                backgroundColor: alert.level === "error" ? "#ffebee" : 
                                 alert.level === "warning" ? "#fff8e1" : "#e8f5e9",
                borderRadius: "3px"
              }}>
                <p><strong>{alert.timestamp}</strong> - {alert.level.toUpperCase()}</p>
                <p>{alert.message}</p>
                <p style={{ fontSize: "0.9em", color: "#777" }}>Source: {alert.source || "System"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent alerts to display.</p>
        )}
      </div>
      
      {actionData && (
        <div style={{
          marginTop: "20px",
          padding: "10px 15px",
          backgroundColor: actionData.success ? "#e8f5e9" : "#ffebee",
          borderRadius: "4px"
        }}>
          <p>{actionData.message}</p>
        </div>
      )}
    </div>
  );
} 