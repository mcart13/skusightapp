import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Filters,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  InlineStack,
  Box,
  Collapsible,
  Link as PolarisLink,
  Tabs,
  Banner,
  EmptyState,
  Pagination,
  BlockStack,
  TextField,
  Select
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Client-side version of the constants (duplicated from logging.server.js)
// This avoids importing server-only code in client components
const ClientLogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
};

const ClientLogCategory = {
  WEBHOOK: "webhook",
  CRON: "cron",
  AUTH: "auth",
  API: "api",
  DATABASE: "database",
  APP: "app",
  SYSTEM: "system"
};

// Number of logs to show per page
const LOGS_PER_PAGE = 25;

export const loader = async ({ request }) => {
  try {
    // For server-side code, we can import the server modules
    let LogLevel, LogCategory;
    try {
      const loggingService = await import("../services/logging.server.js");
      LogLevel = loggingService.LogLevel;
      LogCategory = loggingService.LogCategory;
    } catch (importError) {
      console.error("Failed to import logging service:", importError);
      // Fallback to client-side constants
      LogLevel = ClientLogLevel;
      LogCategory = ClientLogCategory;
    }
    
    // Authenticate the request
    const { admin, session } = await authenticate.admin(request);
    const shop = session?.shop;
    
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const category = url.searchParams.get("category") || null;
    const level = url.searchParams.get("level") || null;
    const search = url.searchParams.get("search") || null;
    const correlationId = url.searchParams.get("correlationId") || null;
    
    // Set up the database query
    const whereClause = {
      shop
    };
    
    if (category) whereClause.category = category;
    if (level) whereClause.level = level;
    if (search) whereClause.message = { contains: search };
    if (correlationId) whereClause.id = correlationId;
    
    // Fetch logs with pagination
    const logs = await db.appLog.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      skip: (page - 1) * LOGS_PER_PAGE,
      take: LOGS_PER_PAGE
    });
    
    // Get total count for pagination
    const totalCount = await db.appLog.count({
      where: whereClause
    });
    
    // Fetch some stats for the dashboard
    const stats = {
      totalLogs: await db.appLog.count({ where: { shop } }),
      errorCount: await db.appLog.count({ where: { shop, level: LogLevel.ERROR } }),
      webhookCount: await db.appLog.count({ where: { shop, category: LogCategory.WEBHOOK } }),
      cronJobCount: await db.appLog.count({ where: { shop, category: LogCategory.CRON } })
    };
    
    // Return the data
    return json({
      logs,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / LOGS_PER_PAGE),
        totalCount
      },
      filters: {
        category,
        level,
        search,
        correlationId
      }
    });
  } catch (error) {
    console.error("Error loading logs:", error);
    return json({
      logs: [],
      stats: {
        totalLogs: 0,
        errorCount: 0,
        webhookCount: 0,
        cronJobCount: 0
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0
      },
      filters: {},
      error: "Failed to load logs"
    });
  }
};

export default function LogsPage() {
  const { logs, stats, pagination, filters, error } = useLoaderData();
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Handle expanding/collapsing a log item
  const toggleItem = useCallback((id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);
  
  // Get badge status based on log level
  const getLevelBadgeStatus = (level) => {
    switch (level) {
      case ClientLogLevel.ERROR:
      case ClientLogLevel.CRITICAL:
        return "critical";
      case ClientLogLevel.WARNING:
        return "warning";
      case ClientLogLevel.INFO:
        return "info";
      case ClientLogLevel.DEBUG:
        return "success";
      default:
        return "new";
    }
  };
  
  // Get category badge status
  const getCategoryBadgeStatus = (category) => {
    switch (category) {
      case ClientLogCategory.WEBHOOK:
        return "info";
      case ClientLogCategory.CRON:
        return "success";
      case ClientLogCategory.AUTH:
        return "attention";
      case ClientLogCategory.API:
        return "warning";
      default:
        return "new";
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Parse JSON metadata
  const parseMetadata = (metadataString) => {
    try {
      return JSON.parse(metadataString);
    } catch (error) {
      return { error: "Invalid metadata format" };
    }
  };
  
  // Define tabs for the different log views
  const tabs = [
    {
      id: "all",
      content: "All Logs",
      accessibilityLabel: "All logs",
      panelID: "all-logs-panel",
    },
    {
      id: "webhooks",
      content: "Webhooks",
      accessibilityLabel: "Webhook logs",
      panelID: "webhook-logs-panel",
    },
    {
      id: "cron",
      content: "Cron Jobs",
      accessibilityLabel: "Cron job logs",
      panelID: "cron-logs-panel",
    },
    {
      id: "errors",
      content: "Errors",
      accessibilityLabel: "Error logs",
      panelID: "error-logs-panel",
    }
  ];
  
  // Category and level options for filters
  const categoryOptions = [
    { label: "All Categories", value: "" },
    ...Object.values(ClientLogCategory).map(category => ({
      label: category.charAt(0).toUpperCase() + category.slice(1),
      value: category
    }))
  ];
  
  const levelOptions = [
    { label: "All Levels", value: "" },
    ...Object.values(ClientLogLevel).map(level => ({
      label: level.charAt(0).toUpperCase() + level.slice(1),
      value: level
    }))
  ];
  
  // Simple component without the full complex UI
  return (
    <Page
      title="Logs & Monitoring"
      subtitle="View detailed logs for webhooks, cron jobs, and system events"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      {error && (
        <Layout.Section>
          <Banner status="critical">
            <p>{error}</p>
          </Banner>
        </Layout.Section>
      )}
      
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <Text variant="headingMd">System Overview</Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <Text variant="headingLg">{stats.totalLogs}</Text>
                  <Text variant="bodySm">Total Logs</Text>
                </div>
                <div>
                  <Text variant="headingLg">{stats.errorCount}</Text>
                  <Text variant="bodySm">Errors</Text>
                </div>
                <div>
                  <Text variant="headingLg">{stats.webhookCount}</Text>
                  <Text variant="bodySm">Webhooks</Text>
                </div>
                <div>
                  <Text variant="headingLg">{stats.cronJobCount}</Text>
                  <Text variant="bodySm">Cron Jobs</Text>
                </div>
              </div>
            </Card.Section>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Tabs 
              tabs={tabs} 
              selected={selectedTab} 
              onSelect={setSelectedTab}
              fitted
            >
              <Card.Section>
                <Text variant="headingMd">Logs</Text>
                
                {Array.isArray(logs) && logs.length > 0 ? (
                  logs.map(item => (
                    <div key={item.id || `log-${Math.random()}`} style={{ marginBottom: '16px', padding: '8px', border: '1px solid #ddd' }}>
                      <Text variant="bodyMd" fontWeight="semibold">{item.message || 'No message'}</Text>
                      <div>Level: {item.level || 'unknown'}</div>
                      <div>Category: {item.category || 'unknown'}</div>
                      <div>Time: {formatTimestamp(item.timestamp || new Date())}</div>
                    </div>
                  ))
                ) : (
                  <div>No logs found. Try adjusting your filters.</div>
                )}
                
                {pagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <Pagination
                      hasPrevious={pagination.currentPage > 1}
                      onPrevious={() => {
                        window.location.href = `/app/logs?category=${filters.category || ''}&level=${filters.level || ''}&search=${filters.search || ''}&page=${pagination.currentPage - 1}`;
                      }}
                      hasNext={pagination.currentPage < pagination.totalPages}
                      onNext={() => {
                        window.location.href = `/app/logs?category=${filters.category || ''}&level=${filters.level || ''}&search=${filters.search || ''}&page=${pagination.currentPage + 1}`;
                      }}
                    />
                  </div>
                )}
              </Card.Section>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 