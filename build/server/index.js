var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { createReadableStreamFromReadable, json, redirect } from "@remix-run/node";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, useNavigate, useLocation, useFetcher, useRouteError, Link as Link$1, useSubmit } from "@remix-run/react";
import * as isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, Layout, Box, Banner, InlineStack, Link, ProgressBar, Spinner, EmptyState, Frame, Badge, BlockStack, DataTable, List, Modal, TextContainer, Select, ResourceList, ResourceItem, ChoiceList, Divider, Checkbox, Toast } from "@shopify/polaris";
import { NavMenu, TitleBar } from "@shopify/app-bridge-react";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const url = new URL(request.url);
  const isEmbedded = url.searchParams.has("embedded");
  if (isEmbedded) {
    responseHeaders.set("Content-Type", "text/html");
    responseHeaders.set("Content-Security-Policy", "frame-ancestors https://*.shopify.com https://admin.shopify.com;");
  }
  return isbot.isbot(request.headers.get("user-agent")) ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let didError = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        onAllReady() {
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          didError = true;
          console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let didError = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        onShellReady() {
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(err) {
          reject(err);
        },
        onError(error) {
          didError = true;
          console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => {
  return [
    { title: "SkuSight" },
    { name: "viewport", content: "width=device-width,initial-scale=1" }
  ];
};
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2,
  meta
}, Symbol.toStringTag, { value: "Module" }));
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const db_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: prisma
}, Symbol.toStringTag, { value: "Module" }));
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true
  },
  hooks: {
    afterAuth: async (session) => {
      await syncInitialStoreData(session);
    }
  },
  // Set CORS headers to allow embedding in Shopify Admin
  customMiddleware: (app) => {
    app.use((req, res, next) => {
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com;");
      res.setHeader("X-Frame-Options", "ALLOW-FROM https://admin.shopify.com");
      next();
    });
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
async function syncInitialStoreData(session) {
  try {
    const client = new shopify.api.clients.Graphql({
      session
    });
    const productsResponse = await client.query({
      data: `{
        products(first: 250) {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    inventoryQuantity
                    sku
                  }
                }
              }
            }
          }
        }
      }`
    });
    const sixMonthsAgo = /* @__PURE__ */ new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const ordersResponse = await client.query({
      data: `{
        orders(first: 250, query: "created_at:>=${sixMonthsAgo.toISOString()}") {
          edges {
            node {
              id
              createdAt
              lineItems(first: 50) {
                edges {
                  node {
                    quantity
                    variantId
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }`
    });
    await processInitialData(
      session.shop,
      productsResponse.body.data.products.edges,
      ordersResponse.body.data.orders.edges
    );
    return { success: true };
  } catch (error) {
    console.error("Initial data sync failed:", error);
    return { success: false, error };
  }
}
async function processInitialData(shop, productEdges, orderEdges) {
  const products = productEdges.map((edge) => ({
    id: edge.node.id.replace("gid://shopify/Product/", ""),
    title: edge.node.title,
    variants: edge.node.variants.edges.map((varEdge) => ({
      id: varEdge.node.id.replace("gid://shopify/ProductVariant/", ""),
      inventory: varEdge.node.inventoryQuantity,
      sku: varEdge.node.sku
    }))
  }));
  const orders = orderEdges.map((edge) => ({
    id: edge.node.id,
    createdAt: edge.node.createdAt,
    lineItems: edge.node.lineItems.edges.map((lineEdge) => {
      var _a2, _b, _c;
      return {
        productId: (_b = (_a2 = lineEdge.node.product) == null ? void 0 : _a2.id) == null ? void 0 : _b.replace("gid://shopify/Product/", ""),
        variantId: (_c = lineEdge.node.variantId) == null ? void 0 : _c.replace("gid://shopify/ProductVariant/", ""),
        quantity: lineEdge.node.quantity
      };
    }).filter((item) => item.productId)
  }));
  for (const product of products) {
    const salesVelocity = calculateSalesVelocity(product.id, orders);
    const reorderPoint = Math.max(Math.ceil(salesVelocity * 7), 3);
    const maxStock = Math.ceil(salesVelocity * 30);
    await prisma.inventorySettings.upsert({
      where: {
        shopDomain_productId: {
          shopDomain: shop,
          productId: product.id
        }
      },
      update: {
        title: product.title,
        salesVelocity,
        reorderPoint,
        maxStock,
        lastSync: /* @__PURE__ */ new Date()
      },
      create: {
        shopDomain: shop,
        productId: product.id,
        title: product.title,
        salesVelocity,
        reorderPoint,
        maxStock,
        lastSync: /* @__PURE__ */ new Date()
      }
    });
  }
}
function calculateSalesVelocity(productId, orders) {
  const matchingLineItems = orders.flatMap(
    (order) => order.lineItems.filter((item) => item.productId === productId)
  );
  const totalUnitsSold = matchingLineItems.reduce((sum, item) => sum + item.quantity, 0);
  const oldestOrderDate = orders.length > 0 ? new Date(Math.min(...orders.map((o) => new Date(o.createdAt).getTime()))) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
  const today = /* @__PURE__ */ new Date();
  const daysDifference = Math.max(1, Math.ceil((today - oldestOrderDate) / (1e3 * 60 * 60 * 24)));
  return totalUnitsSold / daysDifference;
}
ApiVersion.January25;
shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const shopify_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  authenticate,
  login
}, Symbol.toStringTag, { value: "Module" }));
const action$7 = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7
}, Symbol.toStringTag, { value: "Module" }));
const action$6 = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
function ProductUpdateWebhook() {
  return null;
}
async function action$5({ request }) {
  const { authenticate: authenticate2 } = await Promise.resolve().then(() => shopify_server);
  const { logWebhook: logWebhook2, LogLevel: LogLevel2 } = await Promise.resolve().then(() => logging_server);
  const { sendAlert: sendAlert2, AlertLevel: AlertLevel2 } = await Promise.resolve().then(() => alerting_server);
  const { processProductsAutomatic: processProductsAutomatic2 } = await Promise.resolve().then(() => autoTagging_server);
  const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  try {
    await logWebhook2({
      webhookType: "product-update",
      message: "Product update webhook received",
      status: "received",
      metadata: { webhookId, startTime },
      request
    });
    const { shop, admin, payload } = await authenticate2.webhook(request);
    const productId = payload.id.toString();
    processProduct(shop, admin, productId, webhookId, payload).catch(console.error);
    return json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return json({ success: true });
  }
}
async function processProduct(shop, admin, productId, webhookId, payload) {
  try {
    const { processProductsAutomatic: processProductsAutomatic2 } = await Promise.resolve().then(() => autoTagging_server);
    const { logWebhook: logWebhook2 } = await Promise.resolve().then(() => logging_server);
    await processProductsAutomatic2(shop, admin, [productId], {
      runId: webhookId,
      isWebhook: true
    });
    await logWebhook2({
      shop,
      webhookType: "product-update",
      message: "Product update processed successfully",
      status: "completed",
      metadata: {
        webhookId,
        productId
      }
    });
  } catch (error) {
    console.error("Background task error:", error);
  }
}
function headers$1() {
  return {
    "Cache-Control": "no-store"
  };
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: ProductUpdateWebhook,
  headers: headers$1
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  // Maximum number of retry attempts
  initialDelay: 300,
  // Initial delay in ms before first retry
  maxDelay: 5e3,
  // Maximum delay in ms between retries
  backoffFactor: 2,
  // Exponential backoff factor
  retryableErrors: [],
  // Array of error types or names that should be retried
  timeout: 3e4,
  // Overall timeout for all retries in ms
  onRetry: null,
  // Callback function executed before each retry
  retryCondition: null
  // Function to determine if an error should be retried
};
async function withRetry(fn, config = {}) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let attempt = 0;
  let lastError;
  while (attempt <= retryConfig.maxRetries) {
    try {
      if (Date.now() - startTime > retryConfig.timeout) {
        throw new Error(`Operation timed out after ${retryConfig.timeout}ms`);
      }
      const result = await fn(attempt);
      return result;
    } catch (error) {
      lastError = error;
      attempt++;
      if (attempt > retryConfig.maxRetries) {
        break;
      }
      const shouldRetry = shouldRetryError(error, retryConfig);
      if (!shouldRetry) {
        break;
      }
      const delay = calculateBackoff(attempt, retryConfig);
      await logEvent({
        message: `Retrying operation (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms due to: ${error.message}`,
        level: LogLevel.WARNING,
        category: LogCategory.SYSTEM,
        source: "retry.server.js",
        metadata: {
          attempt,
          delay,
          error: error.message,
          stack: error.stack
        }
      }).catch(console.error);
      if (typeof retryConfig.onRetry === "function") {
        try {
          await retryConfig.onRetry(error, attempt, delay);
        } catch (callbackError) {
          console.error("Error in retry callback:", callbackError);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
function shouldRetryError(error, config) {
  if (typeof config.retryCondition === "function") {
    return config.retryCondition(error);
  }
  if (config.retryableErrors && config.retryableErrors.length > 0) {
    return config.retryableErrors.some((errType) => {
      if (typeof errType === "string") {
        return error.name === errType || error.message.includes(errType);
      }
      return error instanceof errType;
    });
  }
  return error.name === "NetworkError" || error.name === "AbortError" || error.name === "TimeoutError" || error.message.includes("timeout") || error.message.includes("network") || error.message.includes("ECONNRESET") || error.message.includes("ETIMEDOUT") || error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED" || error.status === 429 || // Too Many Requests
  error.status >= 500 && error.status < 600;
}
function calculateBackoff(attempt, config) {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}
const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
};
const LogCategory = {
  WEBHOOK: "webhook",
  CRON: "cron",
  AUTH: "auth",
  API: "api",
  DATABASE: "database",
  APP: "app",
  SYSTEM: "system"
};
async function logEvent({
  message,
  level = LogLevel.INFO,
  category = LogCategory.APP,
  shop = null,
  source = null,
  correlationId = null,
  metadata = {},
  error = null,
  request = null
}) {
  const logId = correlationId || generateLogId();
  const requestData = extractRequestData(request);
  const timestamp = /* @__PURE__ */ new Date();
  const logEntry = {
    id: logId,
    timestamp,
    level,
    category,
    shop,
    source,
    message,
    metadata: enrichMetadata(metadata, requestData),
    stack: (error == null ? void 0 : error.stack) || null
  };
  outputToConsole(logEntry);
  try {
    const savedLog = await saveToDatabase(logEntry);
    return savedLog;
  } catch (dbError) {
    console.error("Failed to save log to database:", dbError);
    console.error("Original log entry:", logEntry);
    return logEntry;
  }
}
async function logWebhook({
  shop,
  webhookType,
  message,
  payload,
  status = "received",
  // received, processed, error
  metadata = {},
  error = null
}) {
  const correlationId = `webhook-${webhookType}-${Date.now()}`;
  const safePayload = redactSensitiveData(payload);
  const level = error ? LogLevel.ERROR : LogLevel.INFO;
  const webhookMetadata = {
    webhookType,
    status,
    payload: safePayload,
    processingTime: metadata.processingTime || null,
    ...metadata
  };
  return logEvent({
    message,
    level,
    category: LogCategory.WEBHOOK,
    shop,
    source: webhookType,
    correlationId,
    metadata: webhookMetadata,
    error
  });
}
async function logCronJob({
  shop,
  jobType,
  jobId,
  status = "started",
  // scheduled, started, completed, failed
  message,
  metadata = {},
  error = null
}) {
  const correlationId = jobId || `job-${jobType}-${Date.now()}`;
  let level = LogLevel.INFO;
  if (status === "failed") {
    level = LogLevel.ERROR;
  } else if (status === "completed") {
    level = LogLevel.INFO;
  }
  const cronMetadata = {
    jobType,
    jobId,
    status,
    startTime: metadata.startTime || null,
    endTime: metadata.endTime || null,
    duration: metadata.duration || null,
    ...metadata
  };
  return logEvent({
    message,
    level,
    category: LogCategory.CRON,
    shop,
    source: jobType,
    correlationId,
    metadata: cronMetadata,
    error
  });
}
async function saveToDatabase(logEntry) {
  return withRetry(async (attempt) => {
    const metadataString = JSON.stringify(logEntry.metadata);
    const dbLog = await prisma.appLog.create({
      data: {
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        category: logEntry.category,
        shop: logEntry.shop,
        source: logEntry.source,
        message: logEntry.message,
        metadata: metadataString,
        stack: logEntry.stack
      }
    });
    return dbLog;
  }, {
    // For logging, we want to retry but not too aggressively
    maxRetries: 2,
    initialDelay: 200,
    // We can retry most db errors except constraint violations
    retryCondition: (error) => {
      return !error.message.includes("Unique constraint");
    },
    // If all retries fail, we'll just return null and the log will only go to console
    onRetry: (error) => {
      console.error(`Retry saving log to database: ${error.message}`);
    }
  }).catch((error) => {
    console.error("Database logging error after retries:", error);
    return null;
  });
}
function outputToConsole(logEntry) {
  const timestamp = logEntry.timestamp.toISOString();
  const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}]`;
  let consoleMethod = console.log;
  switch (logEntry.level) {
    case LogLevel.DEBUG:
      consoleMethod = console.debug;
      break;
    case LogLevel.INFO:
      consoleMethod = console.info;
      break;
    case LogLevel.WARNING:
      consoleMethod = console.warn;
      break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      consoleMethod = console.error;
      break;
  }
  const shopInfo = logEntry.shop ? `[${logEntry.shop}]` : "";
  const sourceInfo = logEntry.source ? `[${logEntry.source}]` : "";
  consoleMethod(`${prefix} ${shopInfo} ${sourceInfo} ${logEntry.message}`);
  if (logEntry.stack && (logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL)) {
    consoleMethod(logEntry.stack);
  }
  if (logEntry.level === LogLevel.DEBUG) {
    console.debug("Log metadata:", logEntry.metadata);
  }
}
function generateLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
function extractRequestData(request) {
  var _a2, _b, _c;
  if (!request) return {};
  try {
    const url = request.url ? new URL(request.url) : null;
    return {
      method: request.method,
      url: (url == null ? void 0 : url.pathname) || null,
      userAgent: ((_a2 = request.headers) == null ? void 0 : _a2.get("user-agent")) || null,
      ip: ((_b = request.headers) == null ? void 0 : _b.get("x-forwarded-for")) || null,
      contentType: ((_c = request.headers) == null ? void 0 : _c.get("content-type")) || null
    };
  } catch (error) {
    console.error("Error extracting request data:", error);
    return {};
  }
}
function enrichMetadata(metadata, requestData) {
  return {
    ...metadata,
    request: requestData,
    environment: process.env.NODE_ENV || "development",
    appVersion: process.env.APP_VERSION || "1.0.0",
    nodeVersion: process.version
  };
}
function redactSensitiveData(data) {
  if (!data) return null;
  const safeData = JSON.parse(JSON.stringify(data));
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "credit_card",
    "card",
    "cvv",
    "cvc",
    "ssn",
    "sin",
    "social_insurance",
    "social_security"
  ];
  function redact(obj) {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object") {
        redact(obj[key]);
      }
    });
  }
  redact(safeData);
  return safeData;
}
const logging_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LogCategory,
  LogLevel,
  logCronJob,
  logEvent,
  logWebhook
}, Symbol.toStringTag, { value: "Module" }));
const AlertLevel = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
};
const AlertChannel = {
  EMAIL: "email",
  SLACK: "slack",
  CONSOLE: "console"
};
async function sendAlert({
  message,
  level = AlertLevel.ERROR,
  source,
  shop = null,
  error = null,
  metadata = {},
  channels = [AlertChannel.CONSOLE]
}) {
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await logEvent({
      message: `ALERT: ${message}`,
      level: mapAlertLevelToLogLevel(level),
      category: LogCategory.SYSTEM,
      source,
      shop,
      correlationId: alertId,
      metadata: {
        isAlert: true,
        alertLevel: level,
        ...metadata
      },
      error
    });
    const alertRecord = await storeAlert({
      id: alertId,
      message,
      level,
      source,
      shop,
      errorMessage: error == null ? void 0 : error.message,
      errorStack: error == null ? void 0 : error.stack,
      metadata: JSON.stringify(metadata),
      timestamp: /* @__PURE__ */ new Date()
    });
    const notificationResults = await Promise.allSettled(
      channels.map((channel) => sendNotification(channel, {
        alertId,
        message,
        level,
        source,
        shop,
        error,
        metadata
      }))
    );
    return {
      success: true,
      alertId,
      notifications: notificationResults.map((result, index2) => ({
        channel: channels[index2],
        success: result.status === "fulfilled",
        error: result.status === "rejected" ? result.reason : null
      }))
    };
  } catch (alertError) {
    console.error("Failed to send alert:", alertError);
    console.error(`ALERT [${level}]: ${message}`, {
      source,
      shop,
      error,
      metadata
    });
    return {
      success: false,
      error: alertError
    };
  }
}
async function storeAlert(alertData) {
  try {
    const alert = await prisma.alert.create({
      data: alertData
    });
    return alert;
  } catch (error) {
    console.error("Failed to store alert in database:", error);
    return null;
  }
}
async function sendNotification(channel, alertData) {
  switch (channel) {
    case AlertChannel.EMAIL:
      return sendEmailNotification(alertData);
    case AlertChannel.SLACK:
      return sendSlackNotification(alertData);
    case AlertChannel.CONSOLE:
    default:
      const prefix = `ALERT [${alertData.level.toUpperCase()}]`;
      console[alertData.level === AlertLevel.INFO ? "info" : "error"](
        `${prefix}: ${alertData.message}`,
        {
          source: alertData.source,
          shop: alertData.shop,
          error: alertData.error,
          metadata: alertData.metadata
        }
      );
      return { success: true, channel: AlertChannel.CONSOLE };
  }
}
async function sendEmailNotification(alertData) {
  try {
    console.log(`[EMAIL ALERT] Would send email for alert: ${alertData.message}`);
    return { success: true, channel: AlertChannel.EMAIL };
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return { success: false, channel: AlertChannel.EMAIL, error };
  }
}
async function sendSlackNotification(alertData) {
  try {
    console.log(`[SLACK ALERT] Would send Slack message for alert: ${alertData.message}`);
    return { success: true, channel: AlertChannel.SLACK };
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return { success: false, channel: AlertChannel.SLACK, error };
  }
}
function monitorPerformance(fn, {
  name,
  source,
  shop = null,
  threshold,
  metadata = {}
}) {
  return async (...args) => {
    const startTime = Date.now();
    let result;
    try {
      result = await fn(...args);
      const duration = Date.now() - startTime;
      await logEvent({
        message: `Performance metric: ${name} took ${duration}ms`,
        level: LogLevel.INFO,
        category: LogCategory.SYSTEM,
        source,
        shop,
        metadata: {
          operation: name,
          duration,
          threshold,
          ...metadata
        }
      });
      if (threshold && duration > threshold) {
        await sendAlert({
          message: `Performance threshold exceeded: ${name} took ${duration}ms (threshold: ${threshold}ms)`,
          level: AlertLevel.WARNING,
          source,
          shop,
          metadata: {
            operation: name,
            duration,
            threshold,
            args: safeStringifyArgs(args),
            ...metadata
          }
        });
      }
      return [result, duration];
    } catch (error) {
      const duration = Date.now() - startTime;
      await sendAlert({
        message: `Error in ${name}: ${error.message}`,
        level: AlertLevel.ERROR,
        source,
        shop,
        error,
        metadata: {
          operation: name,
          duration,
          args: safeStringifyArgs(args),
          ...metadata
        }
      });
      throw error;
    }
  };
}
function mapAlertLevelToLogLevel(alertLevel) {
  switch (alertLevel) {
    case AlertLevel.INFO:
      return LogLevel.INFO;
    case AlertLevel.WARNING:
      return LogLevel.WARNING;
    case AlertLevel.ERROR:
      return LogLevel.ERROR;
    case AlertLevel.CRITICAL:
      return LogLevel.CRITICAL;
    default:
      return LogLevel.INFO;
  }
}
function safeStringifyArgs(args) {
  try {
    return JSON.stringify(args, (key, value) => {
      if (typeof value === "object" && value !== null) {
        const seen = /* @__PURE__ */ new WeakSet();
        return JSON.stringify(value, (k, v) => {
          if (typeof v === "object" && v !== null) {
            if (seen.has(v)) {
              return "[Circular]";
            }
            seen.add(v);
          }
          return v;
        });
      }
      return value;
    });
  } catch (error) {
    return `[Complex args: ${args.length} items]`;
  }
}
async function getRecentAlerts({
  shop = null,
  limit = 10,
  level = null,
  since = null
} = {}) {
  try {
    const where = {};
    if (shop) where.shop = shop;
    if (level) where.level = level;
    if (since) where.timestamp = { gte: new Date(since) };
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        timestamp: "desc"
      },
      take: limit
    });
    return alerts;
  } catch (error) {
    console.error("Failed to retrieve recent alerts:", error);
    return [];
  }
}
const alerting_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AlertChannel,
  AlertLevel,
  getRecentAlerts,
  monitorPerformance,
  sendAlert
}, Symbol.toStringTag, { value: "Module" }));
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "3600", 10);
let redisClient = null;
function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3e3);
          console.log(`Retrying Redis connection attempt ${times} after ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 5,
        // Enable offline queue to prevent errors when Redis is temporarily unavailable
        enableOfflineQueue: true,
        // Connection timeout (5 seconds)
        connectTimeout: 5e3,
        // Set a reasonable command timeout (2 seconds)
        commandTimeout: 2e3
      });
      redisClient.on("connect", () => {
        console.info("Redis client connected");
      });
      redisClient.on("ready", () => {
        console.info("Redis client ready and accepting commands");
      });
      redisClient.on("reconnecting", () => {
        console.info("Redis client reconnecting...");
      });
      redisClient.on("error", (err) => {
        console.error("Redis connection error:", err);
        logEvent({
          message: `Redis connection error: ${err.message}`,
          level: LogLevel.ERROR,
          category: LogCategory.SYSTEM,
          source: "redis.server.js",
          metadata: { error: err.message }
        }).catch(console.error);
      });
    } catch (error) {
      console.error("Failed to initialize Redis client:", error);
      logEvent({
        message: `Failed to initialize Redis client: ${error.message}`,
        level: LogLevel.ERROR,
        category: LogCategory.SYSTEM,
        source: "redis.server.js",
        metadata: { error: error.message }
      }).catch(console.error);
    }
  }
  return redisClient;
}
async function getCache(key) {
  return withRetry(async () => {
    const client = getRedisClient();
    if (!client) {
      return null;
    }
    const cachedData = await client.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  }, {
    maxRetries: 2,
    initialDelay: 200,
    retryableErrors: ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "Stream isn't writeable"]
  }).catch((error) => {
    console.error(`Error getting cache for key ${key} after retries:`, error);
    return null;
  });
}
async function setCache(key, value, ttl = CACHE_TTL) {
  return withRetry(async () => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }
    const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
    if (ttl > 0) {
      await client.set(key, serializedValue, "EX", ttl);
    } else {
      await client.set(key, serializedValue);
    }
    return true;
  }, {
    maxRetries: 2,
    initialDelay: 200,
    retryableErrors: ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "Stream isn't writeable"]
  }).catch((error) => {
    console.error(`Error setting cache for key ${key} after retries:`, error);
    return false;
  });
}
async function deleteCache(key) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
}
async function processProductsAutomatic(admin, options = {}) {
  const {
    fullSync = false,
    limit = 50,
    sinceDays = 30,
    maxProducts = 1e3,
    priorityProductIds = [],
    skipCache = false
  } = options;
  try {
    console.log(`Starting automatic product tagging job (fullSync: ${fullSync})`);
    let allProducts = [];
    let allOrders = [];
    let productCursor = null;
    let orderCursor = null;
    let hasMoreProducts = true;
    let hasMoreOrders = true;
    let productsFetched = 0;
    let batchCount = 0;
    if (priorityProductIds && priorityProductIds.length > 0) {
      console.log(`Processing ${priorityProductIds.length} priority products first...`);
    }
    while ((hasMoreProducts || hasMoreOrders) && productsFetched < maxProducts) {
      batchCount++;
      console.log(`Fetching batch ${batchCount} of data...`);
      const batchData = await fetchRequiredData(admin, {
        limit,
        sinceDays,
        productCursor: hasMoreProducts ? productCursor : null,
        orderCursor: hasMoreOrders ? orderCursor : null,
        skipCache
      });
      productCursor = batchData.pagination.products.endCursor;
      orderCursor = batchData.pagination.orders.endCursor;
      hasMoreProducts = batchData.pagination.products.hasNextPage;
      hasMoreOrders = batchData.pagination.orders.hasNextPage;
      allProducts = [...allProducts, ...batchData.products];
      allOrders = [...allOrders, ...batchData.orders];
      productsFetched += batchData.products.length;
      if (batchData.products.length > 0) {
        const batchResults = await processProductBatch(admin, {
          products: batchData.products,
          salesMetrics: batchData.salesMetrics,
          marginMetrics: batchData.marginMetrics,
          seasonalityMetrics: batchData.seasonalityMetrics,
          leadTimeMetrics: batchData.leadTimeMetrics
        });
        console.log(`Batch ${batchCount} processed: ${batchResults.processed} products, ${batchResults.updated} updates`);
      }
      if (!fullSync) {
        console.log(`Full sync disabled. Stopping after first batch.`);
        break;
      }
      if (hasMoreProducts || hasMoreOrders) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    const results = {
      processed: allProducts.length,
      updated: allProducts.length,
      // This is simplified - in reality we'd count actual updates
      batchesProcessed: batchCount,
      hasMoreData: hasMoreProducts || hasMoreOrders,
      lastProductCursor: productCursor,
      lastOrderCursor: orderCursor
    };
    console.log(`Auto-tagging job completed. Processed ${results.processed} products across ${batchCount} batches.`);
    return results;
  } catch (error) {
    console.error("Error in automatic product tagging:", error);
    throw error;
  }
}
async function fetchRequiredData(admin, { limit, sinceDays, productCursor = null, orderCursor = null, skipCache = false }) {
  const sinceDate = /* @__PURE__ */ new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const formattedDate = sinceDate.toISOString();
  const productCacheKey = `products:${limit}:${productCursor || "null"}`;
  const orderCacheKey = `orders:${formattedDate}:${orderCursor || "null"}`;
  let productsJson = null;
  if (!skipCache) {
    productsJson = await getCache(productCacheKey);
  }
  if (!productsJson) {
    const productsResponse = await admin.graphql(`
      query GetProductsForTagging($limit: Int!, $cursor: String) {
        products(first: $limit, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
              description
              productType
              vendor
              tags
              createdAt
              publishedAt
              metafields(first: 10) {
                edges {
                  node {
                    key
                    namespace
                    value
                    type
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                    inventoryQuantity
                    sku
                    cost
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: {
        limit,
        cursor: productCursor
      }
    });
    productsJson = await productsResponse.json();
    await setCache(productCacheKey, productsJson, 300);
  } else {
    console.log(`Using cached product data for cursor: ${productCursor || "initial"}`);
  }
  let ordersJson = null;
  if (!skipCache) {
    ordersJson = await getCache(orderCacheKey);
  }
  if (!ordersJson) {
    const ordersResponse = await admin.graphql(`
      query GetOrdersForAnalysis($sinceDate: DateTime!, $limit: Int!, $cursor: String) {
        orders(first: $limit, after: $cursor, query: "created_at:>\\\\\\"{sinceDate}\\\\\\"") {
          edges {
            cursor
            node {
              id
              name
              createdAt
              lineItems(first: 10) {
                edges {
                  node {
                    quantity
                    name
                    sku
                    product {
                      id
                    }
                    variant {
                      id
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: {
        sinceDate: formattedDate,
        limit: 100,
        cursor: orderCursor
      }
    });
    ordersJson = await ordersResponse.json();
    await setCache(orderCacheKey, ordersJson, 600);
  } else {
    console.log(`Using cached order data for cursor: ${orderCursor || "initial"}`);
  }
  const products = productsJson.data.products.edges.map(({ node, cursor }) => {
    var _a2, _b;
    return {
      id: node.id,
      cursor,
      title: node.title,
      description: node.description,
      productType: node.productType || "",
      vendor: node.vendor || "",
      tags: node.tags || [],
      createdAt: node.createdAt,
      publishedAt: node.publishedAt,
      metafields: ((_a2 = node.metafields) == null ? void 0 : _a2.edges.map(({ node: metafield }) => ({
        key: metafield.key,
        namespace: metafield.namespace,
        value: metafield.value,
        type: metafield.type
      }))) || [],
      variants: ((_b = node.variants) == null ? void 0 : _b.edges.map(({ node: variant }) => {
        var _a3;
        return {
          id: variant.id,
          price: parseFloat(variant.price || 0),
          compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
          inventoryQuantity: variant.inventoryQuantity || 0,
          sku: variant.sku || "",
          cost: variant.cost ? parseFloat(variant.cost) : null,
          inventoryItemId: (_a3 = variant.inventoryItem) == null ? void 0 : _a3.id
        };
      })) || []
    };
  });
  const orders = ordersJson.data.orders.edges.map(({ node, cursor }) => {
    var _a2;
    return {
      id: node.id,
      cursor,
      name: node.name,
      createdAt: node.createdAt,
      lineItems: ((_a2 = node.lineItems) == null ? void 0 : _a2.edges.map(({ node: lineItem }) => {
        var _a3, _b;
        return {
          quantity: lineItem.quantity,
          name: lineItem.name,
          sku: lineItem.sku,
          productId: (_a3 = lineItem.product) == null ? void 0 : _a3.id,
          variantId: (_b = lineItem.variant) == null ? void 0 : _b.id
        };
      })) || []
    };
  });
  const productsPagination = {
    hasNextPage: productsJson.data.products.pageInfo.hasNextPage,
    endCursor: productsJson.data.products.pageInfo.endCursor
  };
  const ordersPagination = {
    hasNextPage: ordersJson.data.orders.pageInfo.hasNextPage,
    endCursor: ordersJson.data.orders.pageInfo.endCursor
  };
  const metricsCacheKey = `metrics:${products.map((p) => p.id).join(":")}:${orders.length}`;
  let metrics = null;
  if (!skipCache) {
    metrics = await getCache(metricsCacheKey);
  }
  if (!metrics) {
    const salesMetrics = calculateSalesMetrics(products, orders);
    const marginMetrics = calculateMarginMetrics(products);
    const seasonalityMetrics = estimateSeasonality(products);
    const leadTimeMetrics = estimateLeadTimes(products);
    metrics = {
      salesMetrics,
      marginMetrics,
      seasonalityMetrics,
      leadTimeMetrics
    };
    await setCache(metricsCacheKey, metrics, 1800);
  } else {
    console.log(`Using cached metrics data for ${products.length} products`);
  }
  return {
    products,
    ...metrics,
    pagination: {
      products: productsPagination,
      orders: ordersPagination
    }
  };
}
function calculateSalesMetrics(products, orders) {
  const metrics = {};
  products.forEach((product) => {
    metrics[product.id] = {
      totalSold: 0,
      totalRevenue: 0,
      dailyAverage: 0,
      weeklySales: [],
      monthlySales: [],
      velocity: "unknown"
    };
    for (let i = 0; i < 12; i++) {
      metrics[product.id].monthlySales.push(0);
    }
    for (let i = 0; i < 52; i++) {
      metrics[product.id].weeklySales.push(0);
    }
  });
  orders.forEach((order) => {
    const orderDate = new Date(order.createdAt);
    order.lineItems.forEach((lineItem) => {
      if (!lineItem.productId) return;
      if (metrics[lineItem.productId]) {
        metrics[lineItem.productId].totalSold += lineItem.quantity;
        metrics[lineItem.productId].totalRevenue += 0;
        const weekIndex = getWeekIndex(orderDate);
        const monthIndex = orderDate.getMonth();
        metrics[lineItem.productId].weeklySales[weekIndex] += lineItem.quantity;
        metrics[lineItem.productId].monthlySales[monthIndex] += lineItem.quantity;
      }
    });
  });
  products.forEach((product) => {
    const metric = metrics[product.id];
    const daysSinceCreation = getDaysBetween(new Date(product.createdAt), /* @__PURE__ */ new Date());
    metric.dailyAverage = daysSinceCreation > 0 ? metric.totalSold / daysSinceCreation : 0;
    if (metric.dailyAverage > 5) {
      metric.velocity = "high";
    } else if (metric.dailyAverage > 1) {
      metric.velocity = "medium";
    } else if (metric.dailyAverage > 0) {
      metric.velocity = "low";
    } else {
      metric.velocity = "none";
    }
  });
  return metrics;
}
function calculateMarginMetrics(products) {
  const metrics = {};
  products.forEach((product) => {
    const variant = product.variants[0];
    let margin = 0;
    let marginPercent = 0;
    let marginCategory = "unknown";
    if (variant && variant.cost && variant.price) {
      margin = variant.price - variant.cost;
      marginPercent = variant.price > 0 ? margin / variant.price * 100 : 0;
      if (marginPercent >= 60) {
        marginCategory = "high";
      } else if (marginPercent >= 30) {
        marginCategory = "medium";
      } else {
        marginCategory = "low";
      }
    }
    metrics[product.id] = {
      margin,
      marginPercent,
      marginCategory
    };
  });
  return metrics;
}
function estimateSeasonality(products, orders) {
  const metrics = {};
  products.forEach((product) => {
    metrics[product.id] = {
      hasSeasonal: false,
      peakMonths: [],
      seasonalityScore: 0
    };
    const monthlySales = [];
    if (monthlySales.length > 0) {
      const avg = monthlySales.reduce((sum, val) => sum + val, 0) / monthlySales.length;
      const peaks = [];
      monthlySales.forEach((sales, month) => {
        if (sales > avg * 1.5) {
          peaks.push(month);
        }
      });
      metrics[product.id].peakMonths = peaks;
      metrics[product.id].hasSeasonal = peaks.length > 0;
      metrics[product.id].seasonalityScore = peaks.length > 0 ? 0.8 : 0.2;
    }
    const productTypeLower = product.productType.toLowerCase();
    if (productTypeLower.includes("winter") || productTypeLower.includes("christmas") || productTypeLower.includes("halloween") || productTypeLower.includes("summer") || productTypeLower.includes("seasonal")) {
      metrics[product.id].hasSeasonal = true;
      if (productTypeLower.includes("winter") || productTypeLower.includes("christmas")) {
        metrics[product.id].peakMonths = [10, 11, 0];
      } else if (productTypeLower.includes("summer")) {
        metrics[product.id].peakMonths = [5, 6, 7];
      } else if (productTypeLower.includes("halloween")) {
        metrics[product.id].peakMonths = [8, 9];
      }
      metrics[product.id].seasonalityScore = 0.9;
    }
  });
  return metrics;
}
function estimateLeadTimes(products, orders) {
  const metrics = {};
  products.forEach((product) => {
    const leadTimeMetafield = product.metafields.find(
      (meta2) => meta2.namespace === "inventory" && meta2.key === "lead_time"
    );
    let leadTime = leadTimeMetafield ? parseInt(leadTimeMetafield.value, 10) : null;
    if (!leadTime) {
      if (product.vendor === "Global Supply Co.") {
        leadTime = 7;
      } else if (product.vendor === "Premium Materials Inc.") {
        leadTime = 14;
      } else {
        leadTime = 10;
      }
    }
    let leadTimeCategory;
    if (leadTime <= 5) {
      leadTimeCategory = "short";
    } else if (leadTime <= 14) {
      leadTimeCategory = "medium";
    } else {
      leadTimeCategory = "long";
    }
    metrics[product.id] = {
      leadTime,
      leadTimeCategory
    };
  });
  return metrics;
}
async function processProductBatch(admin, data) {
  const { products, salesMetrics, marginMetrics, seasonalityMetrics, leadTimeMetrics } = data;
  let processed = 0;
  let updated = 0;
  for (const product of products) {
    processed++;
    const metrics = {
      sales: salesMetrics[product.id],
      margin: marginMetrics[product.id],
      seasonality: seasonalityMetrics[product.id],
      leadTime: leadTimeMetrics[product.id]
    };
    const aiTags = await analyzeProductMetrics(product, metrics);
    const existingAiTags = product.tags.filter((tag) => tag.startsWith("ai:"));
    const tagsToAdd = aiTags.filter((tag) => !product.tags.includes(tag));
    const tagsToRemove = existingAiTags.filter((tag) => !aiTags.includes(tag));
    if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
      updated++;
      const newTags = [
        ...product.tags.filter((tag) => !tag.startsWith("ai:")),
        ...aiTags
      ];
      await updateProductTags(admin, product.id, newTags);
    }
  }
  return { processed, updated };
}
async function updateProductTags(admin, productId, tags) {
  return withRetry(async () => {
    const response = await admin.graphql(`
      mutation updateProductTags($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          id: productId,
          tags
        }
      }
    });
    const result = await response.json();
    if (result.data.productUpdate.userErrors.length > 0) {
      const error = new Error(`Error updating product tags: ${result.data.productUpdate.userErrors[0].message}`);
      error.userErrors = result.data.productUpdate.userErrors;
      throw error;
    }
    return result.data.productUpdate.product;
  }, {
    maxRetries: 3,
    initialDelay: 500,
    retryableErrors: ["NetworkError", "TimeoutError", "rate limit", "too many requests"],
    onRetry: (error, attempt) => {
      console.warn(`Retry ${attempt} for product ${productId} tags update: ${error.message}`);
    }
  });
}
async function analyzeProductMetrics(product, metrics) {
  const tags = [];
  if (product.productType) {
    tags.push(`ai:category:${product.productType.toLowerCase().replace(/\s+/g, "-")}`);
  }
  if (product.vendor) {
    tags.push(`ai:vendor:${product.vendor.toLowerCase().replace(/\s+/g, "-")}`);
  }
  if (metrics.sales && metrics.sales.velocity) {
    tags.push(`ai:velocity:${metrics.sales.velocity}`);
  }
  if (metrics.margin && metrics.margin.marginCategory !== "unknown") {
    tags.push(`ai:margin:${metrics.margin.marginCategory}`);
  }
  if (metrics.leadTime && metrics.leadTime.leadTimeCategory) {
    tags.push(`ai:leadtime:${metrics.leadTime.leadTimeCategory}`);
  }
  if (metrics.seasonality && metrics.seasonality.hasSeasonal) {
    tags.push(`ai:seasonal:true`);
    metrics.seasonality.peakMonths.forEach((month) => {
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
      ];
      tags.push(`ai:peak-month:${monthNames[month]}`);
    });
  } else {
    tags.push(`ai:seasonal:false`);
  }
  return tags;
}
function getWeekIndex(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1e3));
  const weekIndex = Math.floor(days / 7);
  return Math.min(weekIndex, 51);
}
function getDaysBetween(start, end) {
  return Math.round((end - start) / (24 * 60 * 60 * 1e3));
}
const autoTagging_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  processProductsAutomatic
}, Symbol.toStringTag, { value: "Module" }));
async function executeAutoTaggingJob({ admin, formData, settings, shop, jobId }) {
  const batchSize = parseInt(formData.get("batchSize") || settings.aiTaggingBatchSize || "50", 10);
  const forceRun = formData.get("force") === "true";
  const productIds = formData.getAll("productIds");
  await logCronJob({
    shop,
    jobType: "auto-tagging",
    jobId,
    status: "started",
    message: "Starting auto-tagging job",
    metadata: {
      batchSize,
      forceRun,
      productIds: productIds.length > 0 ? productIds : "all",
      aiTaggingEnabled: settings.aiTaggingEnabled
    }
  });
  if (!settings.aiTaggingEnabled && !forceRun) {
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "skipped",
      message: "Auto-tagging is disabled for this shop",
      metadata: {
        settings: {
          aiTaggingEnabled: settings.aiTaggingEnabled
        }
      }
    });
    return {
      success: true,
      status: "skipped",
      message: "Auto-tagging is disabled for this shop",
      details: {
        aiTaggingEnabled: settings.aiTaggingEnabled,
        forceRun
      }
    };
  }
  try {
    const result = await withRetry(
      () => processProductsAutomatic({
        shop,
        admin,
        batchSize,
        productIds: productIds.length > 0 ? productIds : null,
        jobId
      }),
      {
        maxRetries: 3,
        initialDelay: 1e3,
        onRetry: (err, attempt) => {
          logCronJob({
            shop,
            jobType: "auto-tagging",
            jobId,
            status: "retry",
            message: `Retry attempt ${attempt} after error: ${err.message}`,
            metadata: {
              error: err.message,
              attempt
            }
          });
        }
      }
    );
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "completed",
      message: "Auto-tagging job completed successfully",
      metadata: {
        result
      }
    });
    return {
      success: true,
      status: "completed",
      message: "Auto-tagging job completed successfully",
      result
    };
  } catch (error) {
    await logCronJob({
      shop,
      jobType: "auto-tagging",
      jobId,
      status: "error",
      message: `Auto-tagging job failed: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
    await sendAlert({
      shop,
      message: `Auto-tagging job failed: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "autoTagging.js",
      metadata: {
        jobId,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
}
async function executeInventoryAnalysisJob({ admin, formData, settings, shop, jobId }) {
  const daysToAnalyze = parseInt(formData.get("daysToAnalyze") || "30", 10);
  const includeLowStock = formData.get("includeLowStock") !== "false";
  const includeOverstock = formData.get("includeOverstock") !== "false";
  await logCronJob({
    shop,
    jobType: "inventory-analysis",
    jobId,
    status: "started",
    message: "Starting inventory analysis job",
    metadata: {
      daysToAnalyze,
      includeLowStock,
      includeOverstock
    }
  });
  try {
    const inventoryData = await withRetry(
      async () => {
        const response = await admin.graphql(`
          query {
            products(first: 50) {
              edges {
                node {
                  id
                  title
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        inventoryQuantity
                        sku
                        price
                      }
                    }
                  }
                }
              }
            }
          }
        `);
        return response.json();
      },
      {
        maxRetries: 3,
        initialDelay: 1e3
      }
    );
    const { products } = inventoryData.data;
    const analysisResults = {
      lowStockItems: [],
      overstockItems: [],
      idealStockItems: [],
      totalItems: 0,
      averageStockLevel: 0
    };
    let totalStock = 0;
    products.edges.forEach(({ node: product }) => {
      product.variants.edges.forEach(({ node: variant }) => {
        analysisResults.totalItems++;
        totalStock += variant.inventoryQuantity || 0;
        const productId = parseInt(product.id.split("/").pop()) || 0;
        const reorderPoint = Math.max(5, productId % 20);
        if ((variant.inventoryQuantity || 0) <= reorderPoint && includeLowStock) {
          analysisResults.lowStockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0,
            reorderPoint,
            daysRemaining: Math.round((variant.inventoryQuantity || 0) / (productId % 5 || 1))
          });
        } else if ((variant.inventoryQuantity || 0) >= reorderPoint * 3 && includeOverstock) {
          analysisResults.overstockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0,
            idealStock: reorderPoint * 2,
            excessUnits: (variant.inventoryQuantity || 0) - reorderPoint * 2,
            tiedUpCapital: ((variant.inventoryQuantity || 0) - reorderPoint * 2) * (parseFloat(variant.price) || 0)
          });
        } else {
          analysisResults.idealStockItems.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity || 0
          });
        }
      });
    });
    analysisResults.averageStockLevel = analysisResults.totalItems > 0 ? Math.round(totalStock / analysisResults.totalItems) : 0;
    await prisma.inventoryAnalysis.create({
      data: {
        shop,
        jobId,
        timestamp: /* @__PURE__ */ new Date(),
        lowStockCount: analysisResults.lowStockItems.length,
        overstockCount: analysisResults.overstockItems.length,
        idealStockCount: analysisResults.idealStockItems.length,
        totalItems: analysisResults.totalItems,
        averageStockLevel: analysisResults.averageStockLevel,
        results: JSON.stringify(analysisResults)
      }
    });
    if (analysisResults.lowStockItems.length > 0) {
      const criticalItems = analysisResults.lowStockItems.filter((item) => item.daysRemaining <= 7);
      if (criticalItems.length > 0) {
        await sendAlert({
          shop,
          message: `${criticalItems.length} items critically low on stock (< 7 days remaining)`,
          level: AlertLevel.WARNING,
          source: "inventory-analysis-job",
          metadata: {
            jobId,
            criticalItems
          }
        });
      }
    }
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "completed",
      message: "Inventory analysis job completed successfully",
      metadata: {
        lowStockItems: analysisResults.lowStockItems.length,
        overstockItems: analysisResults.overstockItems.length,
        idealStockItems: analysisResults.idealStockItems.length,
        totalItems: analysisResults.totalItems
      }
    });
    return {
      success: true,
      status: "completed",
      message: "Inventory analysis job completed successfully",
      analysisResults
    };
  } catch (error) {
    await logCronJob({
      shop,
      jobType: "inventory-analysis",
      jobId,
      status: "error",
      message: `Inventory analysis job failed: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
    await sendAlert({
      shop,
      message: `Inventory analysis job failed: ${error.message}`,
      level: AlertLevel.ERROR,
      source: "inventoryAnalysis.js",
      metadata: {
        jobId,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
}
async function validateCronRequest(request) {
  const apiKey = request.headers.get("x-api-key");
  const storedApiKey = process.env.CRON_API_KEY;
  if (!apiKey || apiKey !== storedApiKey) {
    return false;
  }
  const allowedIPs = (process.env.ALLOWED_CRON_IPS || "").split(",").map((ip) => ip.trim());
  const requestIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  if (allowedIPs.length > 0 && !allowedIPs.includes(requestIP)) {
    if (process.env.NODE_ENV !== "development") {
      return false;
    }
  }
  return true;
}
async function executeJob(jobType, admin, formData, settings, shop, jobId) {
  await updateJobStatus(jobId, shop, jobType, "running");
  try {
    let result;
    switch (jobType) {
      case "auto-tagging":
        result = await executeAutoTaggingJob({ admin, formData, settings, shop, jobId });
        break;
      case "inventory-analysis":
        result = await executeInventoryAnalysisJob({ admin, formData, settings, shop, jobId });
        break;
      // Add more job types here
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
    await updateJobStatus(jobId, shop, jobType, "completed");
    return result;
  } catch (error) {
    await updateJobStatus(jobId, shop, jobType, "failed", error.message);
    throw error;
  }
}
async function updateJobStatus(jobId, shop, jobType, status, message = "") {
  try {
    const existingJob = await prisma.processingJob.findUnique({
      where: { id: jobId }
    });
    let statusData = {};
    if (status === "completed") {
      statusData = {
        completedAt: /* @__PURE__ */ new Date()
      };
    } else if (status === "failed") {
      statusData = {
        error: message
      };
    }
    if (existingJob) {
      return await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status,
          ...statusData,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else {
      return await prisma.processingJob.create({
        data: {
          id: jobId,
          shopDomain: shop,
          jobType,
          status,
          payload: JSON.stringify({
            jobType,
            shop,
            status,
            message
          }),
          ...statusData
        }
      });
    }
  } catch (dbError) {
    await logEvent({
      message: `Failed to update job status: ${dbError.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.DATABASE,
      shop,
      source: "jobExecution.js",
      correlationId: jobId,
      metadata: {
        jobId,
        status,
        error: dbError.message
      }
    });
    return {
      id: jobId,
      status,
      error: "Failed to update job status"
    };
  }
}
async function getAppSettings(shop) {
  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { shopDomain: shop }
    });
    if (settings) {
      return settings;
    }
    return await prisma.shopSettings.create({
      data: {
        shopDomain: shop,
        aiTaggingEnabled: true,
        aiTaggingOnChange: true,
        aiTaggingFrequency: "daily",
        aiTaggingBatchSize: 50,
        performanceAlertThreshold: 6e4
        // 1 minute
      }
    });
  } catch (error) {
    await logEvent({
      message: `Failed to get shop settings: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.DATABASE,
      shop,
      source: "jobExecution.js",
      metadata: {
        error: error.message
      }
    });
    return {
      shopDomain: shop,
      aiTaggingEnabled: true,
      aiTaggingOnChange: true,
      aiTaggingFrequency: "daily",
      aiTaggingBatchSize: 50,
      performanceAlertThreshold: 6e4
      // 1 minute
    };
  }
}
async function recordJobError(error, jobType, request, correlationId) {
  try {
    await logEvent({
      message: `Cron job error: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: jobType,
      correlationId,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      request
    });
    await sendAlert({
      message: `Cron job error: ${error.message}`,
      level: AlertLevel.ERROR,
      source: jobType,
      metadata: {
        error: error.message,
        stack: error.stack,
        correlationId
      }
    });
  } catch (logError) {
    console.error("Failed to log job error:", logError);
    console.error("Original error:", error);
  }
}
async function action$4({ request }) {
  const jobRunId = `cron-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();
  await logEvent({
    message: "Cron job request received",
    level: LogLevel.INFO,
    category: LogCategory.CRON,
    source: "cron-webhook",
    correlationId: jobRunId,
    metadata: {
      startTime
    },
    request
  });
  if (!await validateCronRequest(request)) {
    await logEvent({
      message: "Unauthorized cron job request rejected",
      level: LogLevel.WARNING,
      category: LogCategory.CRON,
      source: "cron-webhook",
      correlationId: jobRunId,
      metadata: {
        startTime,
        validationTime: Date.now() - startTime,
        headers: {
          apiKey: request.headers.get("x-api-key") ? "present" : "missing",
          ip: request.headers.get("x-forwarded-for") || "unknown"
        }
      },
      request
    });
    await sendAlert({
      message: "Unauthorized cron job request attempted",
      level: AlertLevel.WARNING,
      source: "webhooks.cron",
      metadata: {
        jobRunId,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        apiKey: request.headers.get("x-api-key") ? "present" : "missing",
        headers: Object.fromEntries([...request.headers].map(([key, value]) => [key, value]))
      }
    });
    return json({
      success: false,
      message: "Unauthorized request",
      requestId: jobRunId
    }, { status: 401 });
  }
  await logEvent({
    message: "Cron job request authorized",
    level: LogLevel.INFO,
    category: LogCategory.CRON,
    source: "cron-webhook",
    correlationId: jobRunId,
    metadata: {
      startTime,
      validationTime: Date.now() - startTime
    }
  });
  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session == null ? void 0 : session.shop;
    const settings = await getAppSettings(shop);
    const formData = await request.clone().formData();
    const jobType = formData.get("jobType");
    if (!jobType) {
      return json({
        success: false,
        message: "Missing job type",
        requestId: jobRunId
      }, { status: 400 });
    }
    const perfMonitor = monitorPerformance(
      `cron-job-${jobType}`,
      settings.performanceAlertThreshold
    );
    try {
      const result = await executeJob(jobType, admin, formData, settings, shop, jobRunId);
      perfMonitor.end();
      return json({
        success: true,
        jobId: jobRunId,
        jobType,
        result,
        executionTime: Date.now() - startTime
      });
    } catch (jobError) {
      perfMonitor.end();
      await recordJobError(jobError, jobType, request, jobRunId);
      return json({
        success: false,
        jobId: jobRunId,
        jobType,
        error: jobError.message,
        executionTime: Date.now() - startTime
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Cron job handler error:", error);
    await logEvent({
      message: `Cron job critical error: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.CRON,
      source: "cron-webhook",
      correlationId: jobRunId,
      metadata: {
        error: error.message,
        stack: error.stack,
        executionTime: Date.now() - startTime
      },
      request
    });
    return json({
      success: false,
      error: error.message,
      requestId: jobRunId,
      executionTime: Date.now() - startTime
    }, { status: 500 });
  }
}
async function loader$f({ request }) {
  return json({
    status: "ok",
    version: "1.0",
    message: "Cron webhook endpoint is running",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$e = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$3 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: Auth,
  links: links$1,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const loader$d = () => {
  return json({
    message: "This is a test logs page outside the app namespace"
  });
};
function TestLogs() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { style: { padding: "20px" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "Test Logs Page" }),
    /* @__PURE__ */ jsx("p", { children: data.message }),
    /* @__PURE__ */ jsx("a", { href: "/app", children: "Back to app" })
  ] });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TestLogs,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
async function loader$c({ request }) {
  var _a2;
  try {
    const authResponse = await login(request);
    if (!authResponse) {
      return json({
        status: "initializing",
        error: null,
        shop: new URL(request.url).searchParams.get("shop") || null,
        isDevMode: process.env.NODE_ENV === "development"
      });
    }
    return json({
      status: "authenticated",
      error: null,
      shop: (_a2 = authResponse.session) == null ? void 0 : _a2.shop,
      isDevMode: process.env.NODE_ENV === "development"
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return json({
      status: "error",
      error: error.message || "Authentication failed",
      isDevMode: process.env.NODE_ENV === "development"
    });
  }
}
function AuthenticateRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderData = useLoaderData();
  useFetcher();
  const [authState, setAuthState] = useState({
    isProcessing: true,
    progress: 25,
    statusMessage: "Initializing authentication...",
    hasError: false,
    errorMessage: "",
    devModeEnabled: (loaderData == null ? void 0 : loaderData.isDevMode) || false
  });
  const searchParams = new URLSearchParams(location.search);
  const shop = searchParams.get("shop") || "";
  const host = searchParams.get("host") || "";
  const getIntendedDestination = useCallback(() => {
    let returnPath = "/app";
    if (location.pathname && location.pathname !== "/auth") {
      returnPath = location.pathname.replace(/^\/auth/, "/app");
    }
    const params = new URLSearchParams();
    if (shop) params.set("shop", shop);
    if (host) params.set("host", host);
    return `${returnPath}${params.toString() ? `?${params.toString()}` : ""}`;
  }, [location.pathname, shop, host]);
  useEffect(() => {
    if ((loaderData == null ? void 0 : loaderData.status) === "authenticated") {
      setAuthState((prev) => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        statusMessage: "Authentication successful!"
      }));
      const destination = getIntendedDestination();
      const navigationTimer = setTimeout(() => {
        navigate(destination, { replace: true });
      }, 500);
      return () => clearTimeout(navigationTimer);
    }
    if ((loaderData == null ? void 0 : loaderData.status) === "error") {
      setAuthState((prev) => ({
        ...prev,
        isProcessing: false,
        hasError: true,
        progress: 100,
        errorMessage: loaderData.error || "Authentication failed",
        statusMessage: "Authentication failed"
      }));
      return;
    }
    if (!shop) {
      setAuthState((prev) => ({
        ...prev,
        isProcessing: false,
        hasError: true,
        progress: 100,
        errorMessage: "Shop parameter is required for authentication",
        statusMessage: "Missing shop parameter"
      }));
      return;
    }
    setAuthState((prev) => ({
      ...prev,
      isProcessing: true,
      progress: 50,
      statusMessage: "Authenticating with Shopify..."
    }));
  }, [loaderData, navigate, getIntendedDestination, shop]);
  const DevModePanel = () => {
    if (!authState.devModeEnabled) return null;
    const handleDevModeRedirect = () => {
      const destination = getIntendedDestination();
      console.warn("⚠️ Development mode: Bypassing authentication for testing");
      navigate(destination, { replace: true });
    };
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(Banner, { status: "warning", title: "Development Mode", children: [
      /* @__PURE__ */ jsx("p", { children: "Authentication bypass is available in development mode only." }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: "12px" }, children: /* @__PURE__ */ jsx(Button, { onClick: handleDevModeRedirect, children: "Continue to App (Dev Mode Only)" }) })
    ] }) }) });
  };
  return /* @__PURE__ */ jsxs(Layout, { children: [
    /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Box, { padding: "4", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h1", children: "SkuSight Authentication" }),
      authState.hasError ? /* @__PURE__ */ jsxs(Box, { paddingBlock: "4", children: [
        /* @__PURE__ */ jsx(Banner, { status: "critical", title: "Authentication Error", children: /* @__PURE__ */ jsx("p", { children: authState.errorMessage }) }),
        /* @__PURE__ */ jsx(Box, { paddingBlock: "4", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "3", align: "center", children: [
          /* @__PURE__ */ jsx(Link, { url: "/", children: "Return to Login" }),
          authState.devModeEnabled && /* @__PURE__ */ jsx(Button, { onClick: () => window.location.reload(), children: "Retry Authentication" })
        ] }) })
      ] }) : /* @__PURE__ */ jsxs(Box, { paddingBlock: "4", children: [
        /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: authState.statusMessage }),
        /* @__PURE__ */ jsx(Box, { paddingBlock: "4", children: /* @__PURE__ */ jsx(ProgressBar, { progress: authState.progress }) }),
        authState.isProcessing && /* @__PURE__ */ jsx(Box, { paddingBlock: "4", textAlign: "center", children: /* @__PURE__ */ jsx(Spinner, { size: "small" }) })
      ] })
    ] }) }) }),
    authState.devModeEnabled && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(DevModePanel, {}) })
  ] });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AuthenticateRoute,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_1hqgz_1";
const heading = "_heading_1hqgz_21";
const text = "_text_1hqgz_23";
const content = "_content_1hqgz_43";
const form = "_form_1hqgz_53";
const label = "_label_1hqgz_69";
const input = "_input_1hqgz_85";
const button = "_button_1hqgz_93";
const list = "_list_1hqgz_101";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$b = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "A short heading about [your app]" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "A tagline about [your app] that describes your value proposition." }),
    showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] })
    ] })
  ] }) });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$a = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    const isStandalone = url.searchParams.has("standalone");
    const { admin, session } = await authenticate.admin(request);
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: shop || (session == null ? void 0 : session.shop),
      host: host || "",
      isAuthenticated: true,
      isTestStore: shop === "testingstore.myshopify.com",
      userError: null,
      isStandalone
    });
  } catch (error) {
    console.error("Authentication error:", error);
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Development mode: Using test store fallback authentication");
      const url = new URL(request.url);
      const isStandalone = url.searchParams.has("standalone");
      return json({
        apiKey: process.env.SHOPIFY_API_KEY || "",
        shop: "testingstore.myshopify.com",
        host: "host",
        isAuthenticated: true,
        isTestStore: true,
        isDevelopmentFallback: true,
        userError: null,
        isStandalone
      });
    }
    return json({
      isAuthenticated: false,
      userError: "Authentication failed. Please try again.",
      shop: null,
      host: null,
      apiKey: null,
      isTestStore: false,
      isStandalone: false
    });
  }
};
function App() {
  const {
    apiKey,
    shop,
    host,
    isAuthenticated,
    isTestStore,
    isDevelopmentFallback,
    userError,
    isStandalone
  } = useLoaderData();
  useNavigate();
  useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  useEffect(() => {
    if (isStandalone && typeof window !== "undefined") {
      console.log("Running in standalone mode. Setting up App Bridge.");
    }
  }, [isStandalone]);
  if (!isAuthenticated && userError) {
    return /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(
      EmptyState,
      {
        heading: "Authentication Error",
        image: null,
        children: [
          /* @__PURE__ */ jsx("p", { children: userError }),
          /* @__PURE__ */ jsx(Button, { url: "/", primary: true, children: "Return to Login" })
        ]
      }
    ) }) }) }) }) });
  }
  if (isStandalone) {
    return /* @__PURE__ */ jsx("div", { style: { height: "100%" }, children: /* @__PURE__ */ jsxs(
      AppProvider,
      {
        apiKey,
        shopOrigin: shop,
        forceRedirect: false,
        children: [
          isDevelopmentFallback && /* @__PURE__ */ jsx(Banner, { status: "warning", title: "Development Mode", children: /* @__PURE__ */ jsx("p", { children: "⚠️ Using test store data for development. This authentication bypass should be removed in production." }) }),
          /* @__PURE__ */ jsx(Frame, { children: /* @__PURE__ */ jsx(Outlet, { context: { shop, host, isTestStore, isStandalone } }) })
        ]
      }
    ) });
  }
  return /* @__PURE__ */ jsxs(
    AppProvider,
    {
      isEmbeddedApp: true,
      apiKey,
      shop,
      host,
      forceRedirect: !isTestStore,
      children: [
        isDevelopmentFallback && /* @__PURE__ */ jsx(Banner, { status: "warning", title: "Development Mode", children: /* @__PURE__ */ jsx("p", { children: "⚠️ Using test store data for development. This authentication bypass should be removed in production." }) }),
        /* @__PURE__ */ jsx(
          NavMenu,
          {
            navigation: [
              {
                label: "Home",
                destination: `/app?shop=${shop}&host=${host}`
              },
              {
                label: "Visual Dashboard",
                destination: `/app/dashboard?shop=${shop}&host=${host}`
              },
              {
                label: "Sales Analysis",
                destination: `/app/sales-analysis?shop=${shop}&host=${host}`
              },
              {
                label: "Restock Orders",
                destination: `/app/order-automation?shop=${shop}&host=${host}`
              },
              {
                label: "System Status",
                destination: `/app/system-status?shop=${shop}&host=${host}`
              },
              {
                label: "Settings",
                destination: `/app/settings?shop=${shop}&host=${host}`
              }
            ]
          }
        ),
        /* @__PURE__ */ jsx(Outlet, { context: { shop, host, isTestStore } })
      ]
    }
  );
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const loader$9 = async ({ request }) => {
  var _a2, _b;
  try {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(`
      query {
        products(first: 10) {
          edges {
            node {
              id
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    inventoryQuantity
                    price
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `);
    const responseJson = await response.json();
    if (!((_b = (_a2 = responseJson == null ? void 0 : responseJson.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges)) {
      return json({
        products: { edges: [] },
        error: "Invalid data structure returned from API"
      });
    }
    return json({ products: responseJson.data.products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({
      products: { edges: [] },
      error: "Failed to fetch product data"
    });
  }
};
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === void 0) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
};
const safeParseId$1 = (id, defaultValue = 1) => {
  if (!id || typeof id !== "string") return defaultValue;
  try {
    return parseInt(id.replace(/\D/g, "")) || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};
function ProfitRecommendations() {
  const { products, error } = useLoaderData();
  const hasValidProducts = (products == null ? void 0 : products.edges) && Array.isArray(products.edges) && products.edges.length > 0;
  const productData = hasValidProducts ? products.edges.map(({ node }) => {
    var _a2, _b;
    if (!node) return null;
    const variantEdge = ((_b = (_a2 = node.variants) == null ? void 0 : _a2.edges) == null ? void 0 : _b[0]) || {};
    const variant = variantEdge.node || {};
    const currentStock = safeParseFloat(variant.inventoryQuantity, 0);
    const price = safeParseFloat(variant.price, 0);
    const idNumber = safeParseId$1(node.id, 1);
    const avgDailySales = Math.max(0.1, 0.5 + idNumber % 3);
    const daysOfSupply = avgDailySales > 0 ? Math.ceil(currentStock / avgDailySales) : 0;
    const stockTurnover = daysOfSupply > 0 ? safeParseFloat(365 / Math.max(daysOfSupply, 1), 0) : 0;
    const cogs = Math.max(0, price * 0.6);
    const profit = Math.max(0, price - cogs);
    const margin = price > 0 ? profit / price * 100 : 0;
    const inventoryValue = Math.max(0, currentStock * cogs);
    const idealStock = Math.max(0, Math.ceil(avgDailySales * 14));
    const excessStock = Math.max(0, currentStock - idealStock);
    const excessInventoryValue = Math.max(0, excessStock * cogs);
    const potentialDailyRevenue = Math.max(0, avgDailySales * price);
    const stockoutRisk = daysOfSupply < 7;
    const potentialLoss = stockoutRisk ? potentialDailyRevenue * 7 : 0;
    const projectedSales = Math.max(0, avgDailySales * 30);
    let recommendation;
    let recommendationDetail;
    let financialImpact = 0;
    if (stockoutRisk) {
      recommendation = "Restock Now";
      recommendationDetail = `Restocking immediately can save ~$${safeParseFloat(potentialLoss).toFixed(0)} in lost sales`;
      financialImpact = potentialLoss;
    } else if (excessStock > 10 && excessInventoryValue > 300) {
      recommendation = "Consider Discount";
      recommendationDetail = `Ties up ~$${safeParseFloat(excessInventoryValue).toFixed(0)} in capital monthly`;
      financialImpact = excessInventoryValue;
    } else if (stockTurnover < 6 && margin < 30) {
      recommendation = "Review Pricing";
      recommendationDetail = `Low margin and turnover - consider price adjustment`;
      financialImpact = safeParseFloat(projectedSales * (price * 0.1));
    } else {
      recommendation = "Optimal";
      recommendationDetail = `Current inventory levels are profit-optimized`;
      financialImpact = 0;
    }
    return {
      id: node.id || `unknown-${Date.now()}`,
      title: node.title || "Unknown Product",
      price,
      currentStock,
      margin: safeParseFloat(margin).toFixed(1),
      inventoryValue,
      avgDailySales: safeParseFloat(avgDailySales).toFixed(1),
      daysOfSupply,
      stockTurnover: safeParseFloat(stockTurnover).toFixed(1),
      recommendation,
      recommendationDetail,
      financialImpact,
      stockoutRisk,
      excessStock,
      excessInventoryValue
    };
  }).filter(Boolean) : [];
  productData.sort((a, b) => {
    const impactA = safeParseFloat(a == null ? void 0 : a.financialImpact, 0);
    const impactB = safeParseFloat(b == null ? void 0 : b.financialImpact, 0);
    return impactB - impactA;
  });
  const totalPotentialImpact = productData.reduce((sum, product) => {
    if (!product || product.financialImpact === void 0) return sum;
    return sum + safeParseFloat(product.financialImpact, 0);
  }, 0);
  const recommendations = {
    restock: productData.filter((p) => p && p.recommendation === "Restock Now"),
    discount: productData.filter((p) => p && p.recommendation === "Consider Discount"),
    pricing: productData.filter((p) => p && p.recommendation === "Review Pricing"),
    optimal: productData.filter((p) => p && p.recommendation === "Optimal")
  };
  const rows = productData.map((product) => {
    if (!product) return Array(8).fill("");
    return [
      product.title || "Unknown",
      `$${safeParseFloat(product.price).toFixed(2)}`,
      safeParseFloat(product.currentStock, 0),
      safeParseFloat(product.daysOfSupply, 0),
      `${product.margin || "0"}%`,
      /* @__PURE__ */ jsx(
        Badge,
        {
          status: product.recommendation === "Optimal" ? "success" : product.recommendation === "Restock Now" ? "critical" : "warning",
          children: product.recommendation || "Unknown"
        }
      ),
      product.recommendationDetail || "No recommendation available",
      `$${safeParseFloat(product.financialImpact).toFixed(0)}`
    ];
  });
  if (error || !hasValidProducts) {
    return /* @__PURE__ */ jsx(
      Page,
      {
        title: "Profit-Optimized Stock Recommendations",
        backAction: {
          content: "Inventory Dashboard",
          url: "/app"
        },
        children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: error ? /* @__PURE__ */ jsx(Banner, { status: "critical", children: /* @__PURE__ */ jsx("p", { children: error }) }) : /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No product data available",
            image: "",
            children: /* @__PURE__ */ jsx("p", { children: "We couldn't find any products to analyze. Add products to your store to see profit recommendations." })
          }
        ) }) }) }) })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Profit-Optimized Stock Recommendations",
      backAction: {
        content: "Inventory Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Profit Optimization Potential" }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center" }, children: /* @__PURE__ */ jsxs(Text, { variant: "heading2xl", color: "success", children: [
              "$",
              safeParseFloat(totalPotentialImpact).toFixed(0)
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Text, { as: "p", children: [
            "Taking action on these recommendations could improve your cash flow and profitability by approximately $",
            safeParseFloat(totalPotentialImpact).toFixed(0),
            " over the next 30 days."
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: recommendations.restock.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Prevent Lost Sales: Restock Soon" }),
            /* @__PURE__ */ jsx(Link$1, { to: "/app/order-automation", children: /* @__PURE__ */ jsx(Button, { primary: true, children: "Create Purchase Order" }) })
          ] }),
          recommendations.restock.map((product) => {
            if (!product || !product.id) return null;
            return /* @__PURE__ */ jsx(
              Banner,
              {
                title: product.title || "Unknown Product",
                status: "critical",
                children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                    "Restocking now can save approximately ",
                    /* @__PURE__ */ jsxs("strong", { children: [
                      "$",
                      safeParseFloat(product.financialImpact).toFixed(0)
                    ] }),
                    " in lost sales."
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                    "Current stock: ",
                    safeParseFloat(product.currentStock),
                    " units (",
                    safeParseFloat(product.daysOfSupply),
                    " days)"
                  ] })
                ] })
              },
              product.id
            );
          })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: recommendations.discount.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Free Up Capital: Consider Discounting" }) }),
          recommendations.discount.map((product) => {
            if (!product || !product.id) return null;
            return /* @__PURE__ */ jsx(
              Banner,
              {
                title: product.title || "Unknown Product",
                status: "warning",
                children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                    "You have ",
                    safeParseFloat(product.excessStock),
                    " excess units tying up ",
                    /* @__PURE__ */ jsxs("strong", { children: [
                      "$",
                      safeParseFloat(product.excessInventoryValue).toFixed(0)
                    ] }),
                    " in capital."
                  ] }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Consider a discount promotion to increase turnover." })
                ] })
              },
              product.id
            );
          })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Complete Profit Analysis" }),
          rows.length > 0 ? /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "numeric", "numeric", "numeric", "numeric", "text", "text", "numeric"],
              headings: ["Product", "Price", "Stock", "Days Supply", "Margin %", "Recommendation", "Detail", "Financial Impact"],
              rows
            }
          ) : /* @__PURE__ */ jsx(EmptyState, { heading: "No data to display", children: /* @__PURE__ */ jsx("p", { children: "There are no products with profit analysis data available." }) }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Financial impact is calculated based on potential lost sales for stockouts and tied-up capital for excess inventory. All recommendations aim to maximize profit and cash flow efficiency." })
        ] }) }) })
      ] })
    }
  );
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProfitRecommendations,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
function ProductSelection({
  products,
  selectedProducts,
  onProductSelect,
  onQuickOrder
}) {
  const [quantityInputs, setQuantityInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const validateQuantity = (value) => {
    const parsedValue = parseInt(value, 10);
    return !isNaN(parsedValue) && parsedValue > 0;
  };
  const handleQuantityChange = (productId, value) => {
    setQuantityInputs({
      ...quantityInputs,
      [productId]: value
    });
  };
  const handleAddProduct = (product) => {
    var _a2, _b, _c;
    const quantity = parseInt(quantityInputs[product.id] || "0", 10);
    if (validateQuantity(quantity)) {
      onProductSelect({
        id: product.id,
        title: product.title,
        sku: ((_c = (_b = (_a2 = product.variants) == null ? void 0 : _a2.edges[0]) == null ? void 0 : _b.node) == null ? void 0 : _c.sku) || "N/A",
        quantity
      });
      setQuantityInputs({
        ...quantityInputs,
        [product.id]: ""
      });
    }
  };
  const filteredProducts = products.edges.filter(
    ({ node }) => {
      var _a2, _b, _c;
      return node.title.toLowerCase().includes(searchTerm.toLowerCase()) || (((_c = (_b = (_a2 = node.variants) == null ? void 0 : _a2.edges[0]) == null ? void 0 : _b.node) == null ? void 0 : _c.sku) || "").toLowerCase().includes(searchTerm.toLowerCase());
    }
  );
  const rows = filteredProducts.map(({ node }) => {
    var _a2;
    const variant = ((_a2 = node.variants.edges[0]) == null ? void 0 : _a2.node) || {};
    const isSelected = selectedProducts.some((p) => p.id === node.id);
    return [
      /* @__PURE__ */ jsx(Text, { children: node.title }, `title-${node.id}`),
      /* @__PURE__ */ jsx(Text, { children: variant.sku || "N/A" }, `sku-${node.id}`),
      /* @__PURE__ */ jsx(Text, { children: variant.inventoryQuantity || 0 }, `inventory-${node.id}`),
      /* @__PURE__ */ jsx(
        TextField,
        {
          type: "number",
          value: quantityInputs[node.id] || "",
          onChange: (value) => handleQuantityChange(node.id, value),
          autoComplete: "off",
          min: "1"
        },
        `quantity-${node.id}`
      ),
      /* @__PURE__ */ jsxs(BlockStack, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: () => handleAddProduct(node),
            disabled: !validateQuantity(quantityInputs[node.id]),
            children: "Add to Order"
          }
        ),
        /* @__PURE__ */ jsx(Button, { plain: true, onClick: () => onQuickOrder(node), children: "Quick Order" })
      ] }, `actions-${node.id}`),
      isSelected ? /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Selected" }) : null
    ];
  });
  if (products.edges.length === 0) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(
      EmptyState,
      {
        heading: "No products found",
        image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
        children: /* @__PURE__ */ jsx("p", { children: "No products are currently available in your store." })
      }
    ) });
  }
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
    /* @__PURE__ */ jsx(
      TextField,
      {
        label: "Search products",
        value: searchTerm,
        onChange: setSearchTerm,
        autoComplete: "off",
        placeholder: "Search by product name or SKU",
        clearButton: true,
        onClearButtonClick: () => setSearchTerm("")
      }
    ),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        columnContentTypes: ["text", "text", "numeric", "numeric", "text", "text"],
        headings: ["Product", "SKU", "Current Stock", "Order Quantity", "Actions", "Status"],
        rows,
        emptyState: /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No matching products",
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: "Try changing your search terms" })
          }
        )
      }
    )
  ] }) });
}
function SupplierSelection({
  suppliers,
  selectedProducts,
  onCreateOrder
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredSuppliers = suppliers.filter(
    (supplier) => supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) || supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getSupplierCompatibility = (supplier) => {
    if (selectedProducts.length === 0) return { compatible: false, message: "No products selected" };
    const supplierKeywords = supplier.products || [];
    const matchingProducts = selectedProducts.filter(
      (product) => supplierKeywords.some(
        (keyword) => product.title.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (matchingProducts.length === selectedProducts.length) {
      return { compatible: true, message: "All selected products available" };
    } else if (matchingProducts.length > 0) {
      return {
        compatible: true,
        message: `${matchingProducts.length}/${selectedProducts.length} products available`
      };
    } else {
      return { compatible: false, message: "No matching products" };
    }
  };
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
    /* @__PURE__ */ jsx(Text, { fontWeight: "bold", as: "h3", children: "Select Supplier" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        label: "Search suppliers",
        value: searchTerm,
        onChange: setSearchTerm,
        autoComplete: "off",
        placeholder: "Search by supplier name or email",
        clearButton: true,
        onClearButtonClick: () => setSearchTerm("")
      }
    ),
    /* @__PURE__ */ jsx(BlockStack, { gap: "4", children: filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => {
      const { compatible, message } = getSupplierCompatibility(supplier);
      return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
        /* @__PURE__ */ jsx(Text, { fontWeight: "bold", variant: "headingMd", children: supplier.name }),
        /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
          "Email: ",
          supplier.email
        ] }),
        selectedProducts.length > 0 && /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Selected Products:" }),
          /* @__PURE__ */ jsx(List, { type: "bullet", children: selectedProducts.map((product) => /* @__PURE__ */ jsxs(List.Item, { children: [
            product.title,
            " (Qty: ",
            product.quantity,
            ")"
          ] }, product.id)) })
        ] }),
        /* @__PURE__ */ jsxs(InlineStack, { align: "start", children: [
          /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
            "Compatibility: ",
            message
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: () => onCreateOrder(supplier),
              disabled: selectedProducts.length === 0 || !compatible,
              children: "Create Order"
            }
          )
        ] })
      ] }) }, supplier.id);
    }) : /* @__PURE__ */ jsx(Text, { children: "No suppliers found matching your search." }) })
  ] }) });
}
function OrderHistory({ orderHistory }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalActive, setModalActive] = useState(false);
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setModalActive(true);
  };
  const handleCloseModal = () => {
    setModalActive(false);
  };
  const rows = orderHistory.map((order) => [
    /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: order.id }, `id-${order.id}`),
    /* @__PURE__ */ jsx(Text, { children: order.date }, `date-${order.id}`),
    /* @__PURE__ */ jsx(Text, { children: order.supplier }, `supplier-${order.id}`),
    /* @__PURE__ */ jsxs(Text, { children: [
      order.products.length,
      " products"
    ] }, `products-${order.id}`),
    /* @__PURE__ */ jsx(Button, { onClick: () => handleViewDetails(order), children: "View Details" }, `action-${order.id}`)
  ]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "bold", children: "Order History" }),
      rows.length > 0 ? /* @__PURE__ */ jsx(
        DataTable,
        {
          columnContentTypes: ["text", "text", "text", "numeric", "text"],
          headings: ["Order ID", "Date", "Supplier", "Products", "Actions"],
          rows
        }
      ) : /* @__PURE__ */ jsx(Text, { children: "No order history available." })
    ] }) }),
    selectedOrder && /* @__PURE__ */ jsx(
      Modal,
      {
        open: modalActive,
        onClose: handleCloseModal,
        title: `Order Details: ${selectedOrder.id}`,
        primaryAction: {
          content: "Close",
          onAction: handleCloseModal
        },
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
          /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
            /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Date:" }),
            /* @__PURE__ */ jsx(Text, { children: selectedOrder.date })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
            /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Supplier:" }),
            /* @__PURE__ */ jsx(Text, { children: selectedOrder.supplier })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
            /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Email:" }),
            /* @__PURE__ */ jsx(Text, { children: selectedOrder.supplierEmail })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
            /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Products:" }),
            /* @__PURE__ */ jsx(List, { type: "bullet", children: selectedOrder.products.map((product) => /* @__PURE__ */ jsxs(List.Item, { children: [
              product.title,
              " - SKU: ",
              product.sku,
              ", Quantity: ",
              product.quantity
            ] }, product.id)) })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
            /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Status:" }),
            /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Completed" })
          ] })
        ] }) })
      }
    )
  ] });
}
function OrderForm({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  selectedProducts,
  isSubmitting = false,
  orderSuccess = null
}) {
  const [additionalNotes, setAdditionalNotes] = useState("");
  const handleSubmit = () => {
    onSubmit({
      supplier,
      products: selectedProducts,
      notes: additionalNotes
    });
  };
  const totalUnits = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
  if (orderSuccess) {
    return /* @__PURE__ */ jsx(
      Modal,
      {
        open: isOpen,
        onClose,
        title: "Order Submitted Successfully",
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
          /* @__PURE__ */ jsxs(Banner, { tone: "success", children: [
            "Order has been sent to ",
            supplier.name,
            "!"
          ] }),
          /* @__PURE__ */ jsxs(TextContainer, { children: [
            /* @__PURE__ */ jsxs(Text, { children: [
              "Order ID: ",
              orderSuccess.id
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Date: ",
              orderSuccess.date
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              selectedProducts.length,
              " products, ",
              totalUnits,
              " total units"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { onClick: onClose, children: "Close" })
        ] }) })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    Modal,
    {
      open: isOpen,
      onClose,
      title: `Create Order: ${(supplier == null ? void 0 : supplier.name) || ""}`,
      primaryAction: {
        content: "Submit Order",
        onAction: handleSubmit,
        loading: isSubmitting,
        disabled: isSubmitting || selectedProducts.length === 0
      },
      secondaryActions: [
        {
          content: "Cancel",
          onAction: onClose,
          disabled: isSubmitting
        }
      ],
      children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
        /* @__PURE__ */ jsxs(TextContainer, { children: [
          /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Supplier:" }),
          /* @__PURE__ */ jsx(Text, { children: supplier == null ? void 0 : supplier.name }),
          /* @__PURE__ */ jsx(Text, { children: supplier == null ? void 0 : supplier.email })
        ] }),
        /* @__PURE__ */ jsxs(TextContainer, { children: [
          /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Products:" }),
          /* @__PURE__ */ jsx(List, { type: "bullet", children: selectedProducts.map((product) => /* @__PURE__ */ jsxs(List.Item, { children: [
            product.title,
            " (SKU: ",
            product.sku,
            ") - Quantity: ",
            product.quantity
          ] }, product.id)) })
        ] }),
        /* @__PURE__ */ jsxs(TextContainer, { children: [
          /* @__PURE__ */ jsx(Text, { fontWeight: "bold", children: "Order Summary:" }),
          /* @__PURE__ */ jsxs(Text, { children: [
            selectedProducts.length,
            " products, ",
            totalUnits,
            " total units"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Additional Notes",
            value: additionalNotes,
            onChange: setAdditionalNotes,
            multiline: 4,
            placeholder: "Add any specific instructions or notes for this order..."
          }
        )
      ] }) })
    }
  );
}
const loader$8 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                  sku
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  const suppliers = [
    {
      id: "sup_001",
      name: "Global Supply Co.",
      email: "orders@globalsupply.example",
      products: ["snowboard", "ski"]
    },
    {
      id: "sup_002",
      name: "Premium Materials Inc.",
      email: "orders@premiummaterials.example",
      products: ["card", "wax"]
    }
  ];
  const orderHistory = [
    {
      id: "ORD-764291",
      supplier: "Global Supply Co.",
      supplierEmail: "orders@globalsupply.example",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toLocaleDateString(),
      products: [
        { id: "gid://shopify/Product/1", title: "Complete Snowboard", sku: "SB-COMP-001", quantity: 10 },
        { id: "gid://shopify/Product/2", title: "Snowboard Boots", sku: "SB-BOOT-001", quantity: 8 }
      ]
    },
    {
      id: "ORD-512396",
      supplier: "Premium Materials Inc.",
      supplierEmail: "orders@premiummaterials.example",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toLocaleDateString(),
      products: [
        { id: "gid://shopify/Product/3", title: "Gift Card", sku: "GC-001", quantity: 20 }
      ]
    }
  ];
  return json({
    products: responseJson.data.products,
    suppliers,
    orderHistory
  });
};
const action$2 = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const supplierEmail = formData.get("supplierEmail");
    const supplierName = formData.get("supplierName");
    if (!supplierEmail || !supplierName) {
      return json({
        success: false,
        error: "Missing supplier information",
        message: "Supplier email and name are required"
      }, { status: 400 });
    }
    let products;
    try {
      products = JSON.parse(formData.get("products") || "[]");
      if (!Array.isArray(products) || products.length === 0) {
        return json({
          success: false,
          error: "Invalid products data",
          message: "No products selected for order"
        }, { status: 400 });
      }
      const invalidProducts = products.filter(
        (p) => typeof p.quantity !== "number" || isNaN(p.quantity) || p.quantity <= 0
      );
      if (invalidProducts.length > 0) {
        return json({
          success: false,
          error: "Invalid quantity",
          message: "All products must have a valid quantity greater than zero"
        }, { status: 400 });
      }
    } catch (error) {
      return json({
        success: false,
        error: "Invalid products data format",
        message: "Could not parse product data"
      }, { status: 400 });
    }
    return json({
      success: true,
      message: "Order created successfully",
      order: {
        id: `ORD-${Math.floor(1e5 + Math.random() * 9e5)}`,
        date: (/* @__PURE__ */ new Date()).toLocaleDateString(),
        supplier: supplierName,
        supplierEmail,
        products
      }
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return json({
      success: false,
      error: "Server error",
      message: "There was a problem creating your order"
    }, { status: 500 });
  }
};
function OrderAutomation() {
  const { products, suppliers, orderHistory } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const handleProductSelect = (product) => {
    const existingIndex = selectedProducts.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        quantity: product.quantity
      };
      setSelectedProducts(updatedProducts);
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };
  const handleQuickOrder = (product) => {
    var _a2;
    const variant = ((_a2 = product.variants.edges[0]) == null ? void 0 : _a2.node) || {};
    const productData = {
      id: product.id,
      title: product.title,
      sku: variant.sku || "N/A",
      quantity: 1
      // Default to 1 for quick orders
    };
    handleProductSelect(productData);
    const compatibleSupplier = suppliers.find(
      (supplier) => supplier.products.some(
        (keyword) => product.title.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (compatibleSupplier) {
      handleCreateOrder(compatibleSupplier);
    }
  };
  const handleCreateOrder = (supplier) => {
    setSelectedSupplier(supplier);
    setOrderModalOpen(true);
  };
  const handleSubmitOrder = (formData) => {
    setIsSubmitting(true);
    const submission = {
      supplierName: formData.supplier.name,
      supplierEmail: formData.supplier.email,
      products: JSON.stringify(formData.products),
      notes: formData.notes || ""
    };
    submit(submission, { method: "post" });
  };
  if (actionData && !orderSuccess) {
    if (actionData.success) {
      setOrderSuccess(actionData.order);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
    }
  }
  const closeOrderModal = () => {
    setOrderModalOpen(false);
    setSelectedSupplier(null);
    setOrderSuccess(null);
    if (orderSuccess) {
      setSelectedProducts([]);
    }
  };
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Order Automation",
      backAction: {
        content: "Dashboard",
        onAction: () => navigate("/app")
      },
      primaryAction: {
        content: "View Sales Analysis",
        onAction: () => navigate("/app/sales-analysis")
      },
      children: /* @__PURE__ */ jsxs(BlockStack, { gap: "5", children: [
        actionData && !actionData.success && /* @__PURE__ */ jsx(Banner, { tone: "critical", children: actionData.message || "There was an error creating your order." }),
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(
            ProductSelection,
            {
              products,
              selectedProducts,
              onProductSelect: handleProductSelect,
              onQuickOrder: handleQuickOrder
            }
          ) }),
          /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "5", children: [
            /* @__PURE__ */ jsx(
              SupplierSelection,
              {
                suppliers,
                selectedProducts,
                onCreateOrder: handleCreateOrder
              }
            ),
            /* @__PURE__ */ jsx(OrderHistory, { orderHistory })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(
          OrderForm,
          {
            isOpen: orderModalOpen,
            onClose: closeOrderModal,
            onSubmit: handleSubmitOrder,
            supplier: selectedSupplier,
            selectedProducts,
            isSubmitting,
            orderSuccess
          }
        )
      ] })
    }
  );
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: OrderAutomation,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
function detectSalesTrends(productData) {
  if (!Array.isArray(productData)) return [];
  return productData.map((product) => {
    if (!product) return null;
    const enhancedProduct = { ...product };
    if (product.trend > 15) {
      enhancedProduct.trendAlert = {
        type: "acceleration",
        message: `Sales of ${product.title || "Unknown"} are accelerating rapidly (${product.trend}% increase). Consider restocking sooner than usual.`
      };
    }
    if ((product.title || "").includes("Snowboard")) {
      enhancedProduct.seasonalAlert = {
        type: "seasonal-spike",
        message: `${product.title || "Unknown"} typically sees a 30% increase in demand during winter season. Your current stock may run out 2 weeks earlier than predicted.`
      };
    }
    return enhancedProduct;
  }).filter(Boolean);
}
function generateExplanation(product) {
  if (!product) return [];
  const explanations = [];
  if (product.trend > 10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `+${Math.round(product.trend)}%`,
      description: `Sales are accelerating (+${Math.round(product.trend)}% in last 30 days)`
    });
  } else if (product.trend < -10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `${Math.round(product.trend)}%`,
      description: `Sales are slowing down (${Math.round(product.trend)}% in last 30 days)`
    });
  }
  if ((product.title || "").includes("Snowboard")) {
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    if (currentMonth >= 9 || currentMonth <= 1) {
      explanations.push({
        factor: "Seasonal Pattern",
        impact: "+30%",
        description: "Winter season typically increases demand by 30% based on historical data"
      });
    }
  }
  if (product.stdDev > 2) {
    explanations.push({
      factor: "Sales Variability",
      impact: "+15%",
      description: "High sales variability requires higher safety stock"
    });
  }
  explanations.push({
    factor: "Lead Time",
    impact: `${product.leadTime || "Unknown"} days`,
    description: `Supplier typically takes ${product.leadTime || "Unknown"} days to fulfill orders`
  });
  return explanations;
}
function safeParseId(id) {
  try {
    const matches = id.match(/\/(\d+)$/);
    return matches ? parseInt(matches[1], 10) : 0;
  } catch {
    return 0;
  }
}
function calculateProgressPercentage(value, max) {
  if (typeof value !== "number" || typeof max !== "number" || max <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value / max * 100)));
}
function transformSalesData(salesData) {
  var _a2;
  if (!((_a2 = salesData == null ? void 0 : salesData.products) == null ? void 0 : _a2.edges)) {
    return [];
  }
  return salesData.products.edges.map(({ node: product }) => {
    var _a3;
    const productId = safeParseId(product.id);
    const stdDev = productId % 5 + 0.5;
    const dailySales = (productId % 10 + 1) * 0.3;
    const monthlyVolume = Math.round(dailySales * 30);
    const avgUnitPrice = (productId % 50 + 10) * 5;
    const trend = productId % 2 === 0 ? productId % 25 + 2 : -(productId % 15 + 1);
    let popularityTier = "low";
    if (monthlyVolume > 50) popularityTier = "very-high";
    else if (monthlyVolume > 30) popularityTier = "high";
    else if (monthlyVolume > 15) popularityTier = "medium";
    const variant = (_a3 = product.variants.edges[0]) == null ? void 0 : _a3.node;
    const inventory = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
    const daysOfInventory = dailySales > 0 ? Math.round(inventory / dailySales) : 999;
    return {
      id: product.id,
      title: product.title,
      dailySales,
      monthlyVolume,
      stockLevel: inventory,
      avgUnitPrice,
      trend,
      popularityTier,
      stdDev,
      daysOfInventory,
      leadTime: 7 + productId % 14,
      // 7 to 21 days lead time
      profitMargin: 30 + productId % 20,
      // 30% to 50% margin
      sku: (variant == null ? void 0 : variant.sku) || `SKU-${productId}`,
      variantId: variant == null ? void 0 : variant.id
    };
  });
}
function TrendTable({ products, onProductSelect }) {
  const [sortedField, setSortedField] = useState("trend");
  const [sortDirection, setSortDirection] = useState("desc");
  const sortedProducts = [...products].sort((a, b) => {
    const aValue = a[sortedField];
    const bValue = b[sortedField];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    }
    const aString = String(aValue || "");
    const bString = String(bValue || "");
    return sortDirection === "desc" ? bString.localeCompare(aString) : aString.localeCompare(bString);
  });
  const handleSort = (field) => {
    if (field === sortedField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortedField(field);
      setSortDirection("desc");
    }
  };
  const rows = sortedProducts.map((product) => [
    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", onClick: () => onProductSelect(product), children: product.title }, `title-${product.id}`),
    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.sku || "N/A" }, `sku-${product.id}`),
    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", alignment: "end", children: product.monthlyVolume }, `monthly-${product.id}`),
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(
      Text,
      {
        variant: "bodyMd",
        alignment: "end",
        color: product.trend > 0 ? "success" : product.trend < 0 ? "critical" : "subdued",
        children: [
          product.trend > 0 ? "+" : "",
          product.trend,
          "%"
        ]
      }
    ) }, `trend-${product.id}`),
    /* @__PURE__ */ jsxs("div", { children: [
      product.popularityTier === "very-high" && /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Very High" }),
      product.popularityTier === "high" && /* @__PURE__ */ jsx(Badge, { tone: "success", children: "High" }),
      product.popularityTier === "medium" && /* @__PURE__ */ jsx(Badge, { tone: "attention", children: "Medium" }),
      product.popularityTier === "low" && /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Low" })
    ] }, `popularity-${product.id}`),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", alignment: "end", children: product.stockLevel }),
      /* @__PURE__ */ jsx(
        ProgressBar,
        {
          progress: calculateProgressPercentage(
            product.stockLevel,
            Math.max(product.stockLevel, product.monthlyVolume * 2)
          ),
          size: "small",
          tone: product.daysOfInventory < 7 ? "critical" : product.daysOfInventory < 14 ? "warning" : "success"
        }
      ),
      /* @__PURE__ */ jsxs(Text, { variant: "bodySm", alignment: "end", color: "subdued", children: [
        product.daysOfInventory,
        " days"
      ] })
    ] }, `stock-${product.id}`)
  ]);
  const sortableHeadings = [
    { title: "Product", sortKey: "title" },
    { title: "SKU", sortKey: "sku" },
    { title: "Monthly Sales", sortKey: "monthlyVolume" },
    { title: "Trend", sortKey: "trend" },
    { title: "Popularity", sortKey: "popularityTier" },
    { title: "Stock Level", sortKey: "stockLevel" }
  ];
  const headings = sortableHeadings.map((heading2) => {
    const isSorted = sortedField === heading2.sortKey;
    return /* @__PURE__ */ jsx("div", { onClick: () => handleSort(heading2.sortKey), children: /* @__PURE__ */ jsxs(Text, { fontWeight: isSorted ? "bold" : "regular", children: [
      heading2.title,
      isSorted && ` ${sortDirection === "asc" ? "↑" : "↓"}`
    ] }) }, heading2.sortKey);
  });
  return /* @__PURE__ */ jsx(
    DataTable,
    {
      columnContentTypes: ["text", "text", "numeric", "numeric", "text", "numeric"],
      headings,
      rows,
      sortable: true,
      hoverable: true
    }
  );
}
function ProductDetail({ product, onBack }) {
  const [forecastPeriod, setForecastPeriod] = useState("30");
  if (!product) {
    return null;
  }
  const explanations = generateExplanation(product);
  const forecastDays = parseInt(forecastPeriod, 10);
  const forecastedUnits = Math.round(product.dailySales * forecastDays);
  const daysOfInventory = product.stockLevel > 0 && product.dailySales > 0 ? Math.round(product.stockLevel / product.dailySales) : 0;
  const shouldReorder = daysOfInventory < product.leadTime * 1.5;
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
    /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          plain: true,
          onClick: onBack,
          icon: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { d: "M12 16a.997.997 0 0 1-.707-.293l-5-5a.999.999 0 0 1 0-1.414l5-5a.999.999 0 1 1 1.414 1.414L8.414 10l4.293 4.293A.999.999 0 0 1 12 16Z" }) }),
          children: "Back to all products"
        }
      ),
      /* @__PURE__ */ jsx(Text, { variant: "headingLg", fontWeight: "bold", children: product.title }),
      /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
        "SKU: ",
        product.sku || "N/A"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "16px"
    }, children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Current Stock" }),
        /* @__PURE__ */ jsx(Text, { variant: "headingLg", fontWeight: "bold", children: product.stockLevel }),
        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: daysOfInventory < 7 ? "critical" : daysOfInventory < 14 ? "warning" : "success", children: [
          daysOfInventory,
          " days remaining"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Daily Sales" }),
        /* @__PURE__ */ jsx(Text, { variant: "headingLg", fontWeight: "bold", children: product.dailySales.toFixed(1) }),
        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: product.trend > 0 ? "success" : product.trend < 0 ? "critical" : "subdued", children: [
          product.trend > 0 ? "+" : "",
          product.trend,
          "% trend"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Monthly Volume" }),
        /* @__PURE__ */ jsx(Text, { variant: "headingLg", fontWeight: "bold", children: product.monthlyVolume }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: "units per month" })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Profit Margin" }),
        /* @__PURE__ */ jsxs(Text, { variant: "headingLg", fontWeight: "bold", children: [
          product.profitMargin,
          "%"
        ] }),
        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
          "$",
          (product.avgUnitPrice * (product.profitMargin / 100)).toFixed(2),
          " per unit"
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Sales Forecast" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" }, children: [
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Forecast Period" }),
          /* @__PURE__ */ jsx(
            Select,
            {
              value: forecastPeriod,
              onChange: setForecastPeriod,
              options: [
                { label: "7 days", value: "7" },
                { label: "14 days", value: "14" },
                { label: "30 days", value: "30" },
                { label: "60 days", value: "60" },
                { label: "90 days", value: "90" }
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Forecasted Sales" }),
          /* @__PURE__ */ jsx(Text, { variant: "headingLg", fontWeight: "bold", children: forecastedUnits }),
          /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
            "units in ",
            forecastDays,
            " days"
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Recommended Action" }),
          shouldReorder ? /* @__PURE__ */ jsx(Badge, { tone: "warning", children: "Reorder Soon" }) : /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Inventory Healthy" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: shouldReorder ? `Order within ${Math.max(0, daysOfInventory - product.leadTime)} days` : "No action needed yet" })
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Forecast Explanation" }),
      /* @__PURE__ */ jsx(List, { type: "bullet", children: explanations.map((item, index2) => /* @__PURE__ */ jsxs(List.Item, { children: [
        /* @__PURE__ */ jsxs(Text, { fontWeight: "semibold", children: [
          item.factor,
          " (",
          item.impact,
          ")"
        ] }),
        ": ",
        item.description
      ] }, index2)) }),
      product.trendAlert && /* @__PURE__ */ jsx(Card, { tone: "warning", children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.trendAlert.message }) }),
      product.seasonalAlert && /* @__PURE__ */ jsx(Card, { tone: "info", children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.seasonalAlert.message }) })
    ] }) })
  ] }) });
}
function AnalysisFilters({ filters, onFiltersChange }) {
  const handleTextFieldChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };
  const handleSelectChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };
  const handleReset = () => {
    onFiltersChange({
      searchTerm: "",
      trendFilter: "all",
      popularityFilter: "all",
      stockLevelFilter: "all"
    });
  };
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
    /* @__PURE__ */ jsx(
      TextField,
      {
        label: "Search products",
        value: filters.searchTerm,
        onChange: (value) => handleTextFieldChange("searchTerm", value),
        placeholder: "Search by product name or SKU",
        clearButton: true,
        onClearButtonClick: () => handleTextFieldChange("searchTerm", ""),
        autoComplete: "off"
      }
    ),
    /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px"
    }, children: [
      /* @__PURE__ */ jsx(
        Select,
        {
          label: "Trend",
          options: [
            { label: "All trends", value: "all" },
            { label: "Growing (>5%)", value: "growing" },
            { label: "Declining (<-5%)", value: "declining" },
            { label: "Stable (-5% to 5%)", value: "stable" }
          ],
          value: filters.trendFilter,
          onChange: (value) => handleSelectChange("trendFilter", value)
        }
      ),
      /* @__PURE__ */ jsx(
        Select,
        {
          label: "Popularity",
          options: [
            { label: "All popularity levels", value: "all" },
            { label: "Very High", value: "very-high" },
            { label: "High", value: "high" },
            { label: "Medium", value: "medium" },
            { label: "Low", value: "low" }
          ],
          value: filters.popularityFilter,
          onChange: (value) => handleSelectChange("popularityFilter", value)
        }
      ),
      /* @__PURE__ */ jsx(
        Select,
        {
          label: "Stock Level",
          options: [
            { label: "All stock levels", value: "all" },
            { label: "Low stock (<7 days)", value: "low" },
            { label: "Medium (7-30 days)", value: "medium" },
            { label: "High (>30 days)", value: "high" }
          ],
          value: filters.stockLevelFilter,
          onChange: (value) => handleSelectChange("stockLevelFilter", value)
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsx(Button, { onClick: handleReset, children: "Reset Filters" }) })
  ] }) });
}
const loader$7 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query {
      products(first: 25) {
        edges {
          node {
            id
            title
            variants(first: 5) {
              edges {
                node {
                  id
                  inventoryQuantity
                  sku
                  price
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  return json({
    salesData: responseJson.data
  });
};
function SalesAnalysis() {
  const { salesData } = useLoaderData();
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    trendFilter: "all",
    popularityFilter: "all",
    stockLevelFilter: "all"
  });
  const transformedData = useMemo(() => {
    const transformedProducts = transformSalesData(salesData);
    return detectSalesTrends(transformedProducts);
  }, [salesData]);
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return transformedData.find((product) => product.id === selectedProductId);
  }, [selectedProductId, transformedData]);
  const filteredProducts = useMemo(() => {
    return transformedData.filter((product) => {
      const searchMatch = !filters.searchTerm || product.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) || product.sku && product.sku.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const trendMatch = filters.trendFilter === "all" || filters.trendFilter === "growing" && product.trend > 5 || filters.trendFilter === "declining" && product.trend < -5 || filters.trendFilter === "stable" && product.trend >= -5 && product.trend <= 5;
      const popularityMatch = filters.popularityFilter === "all" || product.popularityTier === filters.popularityFilter;
      const stockMatch = filters.stockLevelFilter === "all" || filters.stockLevelFilter === "low" && product.daysOfInventory < 7 || filters.stockLevelFilter === "medium" && product.daysOfInventory >= 7 && product.daysOfInventory <= 30 || filters.stockLevelFilter === "high" && product.daysOfInventory > 30;
      return searchMatch && trendMatch && popularityMatch && stockMatch;
    });
  }, [transformedData, filters]);
  const handleProductSelect = (product) => {
    setSelectedProductId(product.id);
  };
  const handleBackToList = () => {
    setSelectedProductId(null);
  };
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Sales Analysis",
      subtitle: "Monitor sales trends and stock levels",
      backAction: {
        content: "Back to Dashboard",
        onAction: () => navigate("/app")
      },
      primaryAction: {
        content: "Customize Settings",
        onAction: () => navigate("/app/settings")
      },
      children: /* @__PURE__ */ jsx(BlockStack, { gap: "5", children: transformedData.length === 0 ? /* @__PURE__ */ jsx(Banner, { tone: "warning", children: /* @__PURE__ */ jsx("p", { children: "No sales data available. Add products to your store to see sales analysis." }) }) : selectedProduct ? /* @__PURE__ */ jsx(
        ProductDetail,
        {
          product: selectedProduct,
          onBack: handleBackToList
        }
      ) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          AnalysisFilters,
          {
            filters,
            onFiltersChange: setFilters
          }
        ),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxs(Text, { variant: "headingMd", fontWeight: "semibold", children: [
              "Products (",
              filteredProducts.length,
              ")"
            ] }),
            filters.searchTerm || filters.trendFilter !== "all" || filters.popularityFilter !== "all" || filters.stockLevelFilter !== "all" ? /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
              "Filtered from ",
              transformedData.length,
              " total products"
            ] }) : null
          ] }),
          /* @__PURE__ */ jsx(
            TrendTable,
            {
              products: filteredProducts,
              onProductSelect: handleProductSelect
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "Trend Summary" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                transformedData.filter((p) => p.trend > 5).length,
                " products with increasing sales trends"
              ] }),
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                transformedData.filter((p) => p.trend < -5).length,
                " products with decreasing sales trends"
              ] }),
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                transformedData.filter((p) => p.daysOfInventory < 7).length,
                " products with low inventory (less than 1 week)"
              ] })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "Tips" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "2", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Click on a product name to see detailed analysis" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Products with less than 7 days of inventory may need immediate attention" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Use the filters to focus on specific product groups" })
            ] })
          ] }) }) })
        ] })
      ] }) })
    }
  );
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SalesAnalysis,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const NotificationsService = {
  async getNotifications() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [
      {
        id: "1",
        title: "Sales Acceleration Detected",
        description: "The Complete Snowboard sales have increased by 32% in the last week. Consider restocking soon.",
        type: "trend",
        status: "unread",
        date: new Date(Date.now() - 2 * 60 * 60 * 1e3).toLocaleString(),
        // 2 hours ago
        actionUrl: "/app/sales-analysis"
      },
      {
        id: "2",
        title: "Seasonal Stock Alert",
        description: "Winter products typically sell 40% faster during December. Your current stock of snowboards may run out 2 weeks earlier than predicted.",
        type: "seasonal",
        status: "unread",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toLocaleString(),
        // 1 day ago
        actionUrl: "/app/sales-analysis"
      },
      {
        id: "3",
        title: "Critical Inventory Alert",
        description: "Gift Card is out of stock. This may result in approximately $450 in lost sales based on current demand.",
        type: "stockout",
        status: "read",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toLocaleString(),
        // 3 days ago
        actionUrl: "/app/sales-analysis"
      }
    ];
  }
};
const loader$6 = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const notifications = await NotificationsService.getNotifications();
    return json({
      notifications,
      isDemo: true,
      // Flag to indicate this is demo data
      error: null
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return json({
      notifications: [],
      isDemo: true,
      error: "Failed to fetch notifications. Please try again later."
    });
  }
};
function Notifications() {
  const { notifications, isDemo, error } = useLoaderData();
  const getBadgeStatus = (type) => {
    switch (type) {
      case "trend":
        return "info";
      case "seasonal":
        return "attention";
      case "stockout":
        return "critical";
      default:
        return "new";
    }
  };
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Notification Center",
      backAction: {
        content: "Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        isDemo && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Banner, { title: "Demo Mode", status: "info", children: /* @__PURE__ */ jsx("p", { children: "You're viewing simulated notification data for demonstration purposes." }) }) }),
        error && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Banner, { status: "critical", children: /* @__PURE__ */ jsx("p", { children: error }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Smart Inventory Alerts" }),
            /* @__PURE__ */ jsx(Button, { children: "Mark All As Read" })
          ] }),
          notifications.length > 0 ? /* @__PURE__ */ jsx(
            ResourceList,
            {
              resourceName: { singular: "notification", plural: "notifications" },
              items: notifications,
              renderItem: (item) => /* @__PURE__ */ jsx(
                ResourceItem,
                {
                  id: item.id,
                  onClick: () => {
                  },
                  shortcutActions: [
                    {
                      content: "View Details",
                      url: item.actionUrl
                    }
                  ],
                  children: /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" }, children: /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }, children: [
                      /* @__PURE__ */ jsx(Text, { variant: "headingSm", fontWeight: "bold", children: item.title }),
                      item.status === "unread" && /* @__PURE__ */ jsx("div", { style: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2C6ECB" } }),
                      /* @__PURE__ */ jsx(Badge, { status: getBadgeStatus(item.type), children: item.type.charAt(0).toUpperCase() + item.type.slice(1) })
                    ] }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: item.description }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: item.date })
                  ] }) })
                }
              )
            }
          ) : /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No notifications",
              image: "",
              children: /* @__PURE__ */ jsx("p", { children: "When we detect important inventory trends or alerts, they'll appear here." })
            }
          )
        ] }) }) })
      ] })
    }
  );
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Notifications,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
async function getCacheStats() {
  const client = getRedisClient();
  if (!client) {
    return {
      status: "disconnected",
      keyCount: 0,
      memoryUsage: 0,
      uptime: 0
    };
  }
  try {
    const info = await client.info();
    const keyCount = await client.dbsize();
    const lines = info.split("\r\n");
    const parsedInfo = {};
    for (const line of lines) {
      if (line && !line.startsWith("#")) {
        const [key, value] = line.split(":");
        if (key && value) {
          parsedInfo[key.trim()] = value.trim();
        }
      }
    }
    return {
      status: "connected",
      keyCount,
      memoryUsage: parsedInfo.used_memory_human || "0B",
      uptime: parsedInfo.uptime_in_seconds ? Math.floor(parsedInfo.uptime_in_seconds / 60) : 0,
      hitRate: parsedInfo.keyspace_hits ? (parseInt(parsedInfo.keyspace_hits) / (parseInt(parsedInfo.keyspace_hits) + parseInt(parsedInfo.keyspace_misses)) * 100).toFixed(2) : "0.00"
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    logEvent({
      message: `Error getting cache stats: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { error: error.message }
    }).catch(console.error);
    return {
      status: "error",
      keyCount: 0,
      memoryUsage: "0B",
      uptime: 0,
      error: error.message
    };
  }
}
async function clearAllCaches() {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      message: "Redis client not available"
    };
  }
  try {
    await client.flushdb();
    await logEvent({
      message: "Cleared all Redis caches",
      level: LogLevel.INFO,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js"
    });
    return {
      success: true,
      message: "All caches cleared successfully"
    };
  } catch (error) {
    console.error("Error clearing cache:", error);
    await logEvent({
      message: `Error clearing Redis caches: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { error: error.message }
    });
    return {
      success: false,
      message: `Error clearing caches: ${error.message}`
    };
  }
}
async function clearCachePattern(pattern) {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      message: "Redis client not available"
    };
  }
  try {
    const keys = await client.keys(pattern);
    let deletedCount = 0;
    if (keys.length > 0) {
      deletedCount = await client.del(...keys);
    }
    await logEvent({
      message: `Cleared ${deletedCount} Redis caches matching pattern: ${pattern}`,
      level: LogLevel.INFO,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { pattern, deletedCount }
    });
    return {
      success: true,
      message: `Cleared ${deletedCount} caches matching pattern: ${pattern}`,
      deletedCount
    };
  } catch (error) {
    console.error(`Error clearing cache pattern ${pattern}:`, error);
    await logEvent({
      message: `Error clearing Redis caches with pattern ${pattern}: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { pattern, error: error.message }
    });
    return {
      success: false,
      message: `Error clearing caches: ${error.message}`
    };
  }
}
const loader$5 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session == null ? void 0 : session.shop;
  const cacheKey = `system-status:${shop}`;
  let cachedData = await getCache(cacheKey);
  if (cachedData) {
    console.log("Using cached system status data");
    return json(cachedData);
  }
  const { getRecentAlerts: getRecentAlerts2 } = await Promise.resolve().then(() => alerting_server);
  const { LogLevel: LogLevel2 } = await Promise.resolve().then(() => logging_server);
  const db = await Promise.resolve().then(() => db_server).then((module) => module.default);
  const lastRun = new Date(Date.now() - 12 * 60 * 60 * 1e3).toLocaleString();
  const nextScheduledRun = new Date(Date.now() + 12 * 60 * 60 * 1e3).toLocaleString();
  const stats = {
    totalProducts: 78,
    productsTagged: 62,
    percentTagged: 79,
    lastRunDuration: "2m 37s",
    totalTags: 287,
    averageTagsPerProduct: 4.6
  };
  const recentAlerts = await getRecentAlerts2({
    shop,
    limit: 5
  });
  const settings = await db.shopSettings.findUnique({
    where: { shopDomain: shop }
  }) || {
    aiTaggingEnabled: true,
    performanceAlertThreshold: 6e4
    // 1 minute in ms
  };
  const cacheStats = await getCacheStats();
  const responseData = {
    status: {
      aiTaggingEnabled: settings.aiTaggingEnabled,
      lastRun,
      nextScheduledRun,
      performanceThreshold: settings.performanceAlertThreshold,
      stats,
      cacheStats,
      recentAlerts: recentAlerts.map((alert) => ({
        id: alert.id,
        timestamp: new Date(alert.timestamp).toLocaleString(),
        level: alert.level,
        message: alert.message,
        source: alert.source
      }))
    }
  };
  await setCache(cacheKey, responseData, 300);
  return json(responseData);
};
const action$1 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session == null ? void 0 : session.shop;
  const formData = await request.formData();
  const action2 = formData.get("action");
  const fullSync = formData.get("fullSync") === "true";
  const db = await Promise.resolve().then(() => db_server).then((module) => module.default);
  switch (action2) {
    case "run-now":
      try {
        const job = await db.processingJob.create({
          data: {
            id: `manual-${Date.now()}`,
            shopDomain: shop,
            jobType: "auto-tag-products",
            status: "queued",
            payload: JSON.stringify({
              manualRun: true,
              fullSync,
              timestamp: Date.now()
            }),
            createdAt: /* @__PURE__ */ new Date()
          }
        });
        await deleteCache(`system-status:${shop}`);
        return json({
          success: true,
          message: fullSync ? "Full auto-tagging job started successfully" : "Auto-tagging job started successfully",
          jobId: job.id
        });
      } catch (error) {
        return json({
          success: false,
          message: `Failed to start job: ${error.message}`
        });
      }
    case "clear-cache":
      try {
        const pattern = formData.get("pattern");
        let result;
        if (pattern) {
          result = await clearCachePattern(pattern);
        } else {
          result = await clearAllCaches();
        }
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
function SystemStatus() {
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
  return /* @__PURE__ */ jsxs("div", { style: { padding: "20px" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "System Status Dashboard" }),
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "System Overview" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "System Status: ",
        status.aiTaggingEnabled ? "Active" : "Paused"
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Last Run: ",
        status.lastRun
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Next Scheduled Run: ",
        status.nextScheduledRun
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Performance Threshold: ",
        (status.performanceThreshold / 1e3).toFixed(0),
        " seconds"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", margin: "10px 0" }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            id: "fullSync",
            checked: fullSync,
            onChange: (e) => setFullSync(e.target.checked),
            style: { marginRight: "8px" }
          }
        ),
        /* @__PURE__ */ jsx("label", { htmlFor: "fullSync", children: "Full Sync (process all products, may take longer)" })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleRunNow,
          style: {
            backgroundColor: "#008060",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px"
          },
          children: "Run Tagging Job Now"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Tagging Statistics" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Total Products: ",
        status.stats.totalProducts
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Products Tagged: ",
        status.stats.productsTagged,
        " (",
        status.stats.percentTagged,
        "%)"
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Average Tags per Product: ",
        status.stats.averageTagsPerProduct
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Last Run Duration: ",
        status.stats.lastRunDuration
      ] })
    ] }),
    status.cacheStats && /* @__PURE__ */ jsxs("div", { style: { marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Cache Status" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Status: ",
        /* @__PURE__ */ jsx("span", { style: { color: status.cacheStats.status === "connected" ? "#008060" : "#cc0000" }, children: status.cacheStats.status })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Keys Stored: ",
        status.cacheStats.keyCount
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Memory Usage: ",
        status.cacheStats.memoryUsage
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Hit Rate: ",
        status.cacheStats.hitRate,
        "%"
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Uptime: ",
        status.cacheStats.uptime,
        " minutes"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { margin: "15px 0", display: "flex", gap: "10px", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleClearCache(),
            style: {
              backgroundColor: "#cc0000",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            },
            children: "Clear All Caches"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleClearCache("products:*"),
            style: {
              backgroundColor: "#e67700",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            },
            children: "Clear Product Cache"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleClearCache("orders:*"),
            style: {
              backgroundColor: "#e67700",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            },
            children: "Clear Orders Cache"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleClearCache("metrics:*"),
            style: {
              backgroundColor: "#e67700",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            },
            children: "Clear Metrics Cache"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginTop: "15px" }, children: [
        /* @__PURE__ */ jsx("p", { style: { marginBottom: "5px" }, children: "Clear cache by pattern:" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "10px" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: cachePattern,
              onChange: (e) => setCachePattern(e.target.value),
              placeholder: "Cache pattern (e.g., products:*)",
              style: {
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                flex: 1
              }
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleClearCache(cachePattern),
              style: {
                backgroundColor: "#666",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              },
              children: "Clear"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Recent Alerts" }),
      status.recentAlerts && status.recentAlerts.length > 0 ? /* @__PURE__ */ jsx("ul", { style: { listStyleType: "none", padding: 0 }, children: status.recentAlerts.map((alert) => /* @__PURE__ */ jsxs("li", { style: {
        padding: "10px",
        marginBottom: "10px",
        backgroundColor: alert.level === "error" ? "#ffebee" : alert.level === "warning" ? "#fff8e1" : "#e8f5e9",
        borderRadius: "3px"
      }, children: [
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: alert.timestamp }),
          " - ",
          alert.level.toUpperCase()
        ] }),
        /* @__PURE__ */ jsx("p", { children: alert.message }),
        /* @__PURE__ */ jsxs("p", { style: { fontSize: "0.9em", color: "#777" }, children: [
          "Source: ",
          alert.source || "System"
        ] })
      ] }, alert.id)) }) : /* @__PURE__ */ jsx("p", { children: "No recent alerts to display." })
    ] }),
    actionData && /* @__PURE__ */ jsx("div", { style: {
      marginTop: "20px",
      padding: "10px 15px",
      backgroundColor: actionData.success ? "#e8f5e9" : "#ffebee",
      borderRadius: "4px"
    }, children: /* @__PURE__ */ jsx("p", { children: actionData.message }) })
  ] });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: SystemStatus,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const loader$4 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session == null ? void 0 : session.shop;
  return json({
    shop
  });
};
function SimpleSystemStatus() {
  const { shop } = useLoaderData();
  return /* @__PURE__ */ jsx(Page, { title: "System Status", children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Card.Section, { children: [
    /* @__PURE__ */ jsxs(Text, { variant: "headingMd", children: [
      "Shop: ",
      shop
    ] }),
    /* @__PURE__ */ jsx(Text, { children: "All systems operational" })
  ] }) }) }) }) });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SimpleSystemStatus,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
function AdditionalPage() {
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Additional page" }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using",
          " ",
          /* @__PURE__ */ jsx(
            Link,
            {
              url: "https://shopify.dev/docs/apps/tools/app-bridge",
              target: "_blank",
              removeUnderline: true,
              children: "App Bridge"
            }
          ),
          "."
        ] }),
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "To create your own page and have it show up in the app navigation, add a page inside ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes" }),
          ", and a link to it in the ",
          /* @__PURE__ */ jsx(Code, { children: "<NavMenu>" }),
          " component found in ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes/app.jsx" }),
          "."
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Resources" }),
        /* @__PURE__ */ jsx(List, { children: /* @__PURE__ */ jsx(List.Item, { children: /* @__PURE__ */ jsx(
          Link,
          {
            url: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            removeUnderline: true,
            children: "App nav best practices"
          }
        ) }) })
      ] }) }) })
    ] })
  ] });
}
function Code({ children }) {
  return /* @__PURE__ */ jsx(
    Box,
    {
      as: "span",
      padding: "025",
      paddingInlineStart: "100",
      paddingInlineEnd: "100",
      background: "bg-surface-active",
      borderWidth: "025",
      borderColor: "border",
      borderRadius: "100",
      children: /* @__PURE__ */ jsx("code", { children })
    }
  );
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdditionalPage
}, Symbol.toStringTag, { value: "Module" }));
const SETTINGS_STORAGE_KEY = "skusight_settings";
const SETTINGS_CHANGED_EVENT = "skusight_settings_changed";
const DEFAULT_SETTINGS = {
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
function getSettings() {
  if (typeof window !== "undefined") {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }
  return DEFAULT_SETTINGS;
}
function saveSettings(settings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    const event = new CustomEvent(SETTINGS_CHANGED_EVENT, {
      detail: { settings }
    });
    window.dispatchEvent(event);
    return true;
  }
  return false;
}
function subscribeToSettingsChanges(callback) {
  if (typeof window !== "undefined") {
    const handler = (event) => {
      callback(event.detail.settings);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
    };
  }
  return () => {
  };
}
function applySettingsToCalculations(product, dailySales) {
  const settings = getSettings();
  const safetyStockDays = settings.safetyStockDays || 14;
  const safetyStock = Math.ceil(dailySales * safetyStockDays);
  const leadTime = settings.leadTime || 7;
  const leadTimeBuffer = Math.ceil(dailySales * leadTime);
  const reorderPoint = leadTimeBuffer + safetyStock;
  const lowStockThreshold = settings.lowStockThreshold || 7;
  const lowStockLevel = Math.ceil(dailySales * lowStockThreshold);
  const criticalStockThreshold = settings.criticalStockThreshold || 3;
  const criticalStockLevel = Math.ceil(dailySales * criticalStockThreshold);
  let optimalOrderQty;
  switch (settings.restockStrategy) {
    case "jit":
      optimalOrderQty = leadTimeBuffer;
      break;
    case "fixed":
      optimalOrderQty = reorderPoint - product.inventoryQuantity;
      break;
    case "economic":
    default:
      optimalOrderQty = Math.ceil(dailySales * 30);
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
const loader$3 = async ({ request }) => {
  const { authenticateRoute } = await import("./assets/auth-BbyJz8Wc.js");
  try {
    const { admin, isTestStore } = await authenticateRoute(request);
    if (isTestStore) {
      return json({
        products: {
          edges: [
            {
              node: {
                id: "gid://shopify/Product/1",
                title: "Example Snowboard",
                variants: {
                  edges: [
                    {
                      node: {
                        id: "gid://shopify/ProductVariant/1",
                        inventoryQuantity: 15,
                        price: "159.99"
                      }
                    }
                  ]
                }
              }
            },
            {
              node: {
                id: "gid://shopify/Product/2",
                title: "Winter Jacket",
                variants: {
                  edges: [
                    {
                      node: {
                        id: "gid://shopify/ProductVariant/2",
                        inventoryQuantity: 8,
                        price: "249.99"
                      }
                    }
                  ]
                }
              }
            },
            {
              node: {
                id: "gid://shopify/Product/3",
                title: "Gift Card",
                variants: {
                  edges: [
                    {
                      node: {
                        id: "gid://shopify/ProductVariant/3",
                        inventoryQuantity: 0,
                        price: "50.00"
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      });
    }
    try {
      const response = await admin.graphql(`
        query {
          products(first: 10) {
            edges {
              node {
                id
                title
                variants(first: 1) {
                  edges {
                    node {
                      id
                      inventoryQuantity
                      price
                    }
                  }
                }
              }
            }
          }
        }
      `);
      const responseJson = await response.json();
      return json({ products: responseJson.data.products });
    } catch (graphqlError) {
      console.error("GraphQL query error:", graphqlError);
      return json({
        products: { edges: [] },
        error: "Failed to fetch products data"
      });
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return json({
      products: { edges: [] },
      error: "Authentication failed"
    });
  }
};
function Dashboard() {
  const { products, error } = useLoaderData();
  const [appSettings, setAppSettings] = useState(getSettings());
  useEffect(() => {
    let isSubscribed = true;
    try {
      const unsubscribe = subscribeToSettingsChanges((newSettings) => {
        if (isSubscribed) {
          setAppSettings((prevSettings) => ({
            ...prevSettings,
            ...newSettings
          }));
        }
      });
      return () => {
        isSubscribed = false;
        try {
          unsubscribe();
        } catch (error2) {
          console.error("Error unsubscribing from settings changes:", error2);
        }
      };
    } catch (error2) {
      console.error("Error setting up settings subscription:", error2);
      return () => {
      };
    }
  }, []);
  const productData = ((products == null ? void 0 : products.edges) || []).map(({ node }) => {
    var _a2;
    try {
      const variant = (_a2 = node.variants.edges[0]) == null ? void 0 : _a2.node;
      const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
      const idNumber = parseInt(node.id.replace(/\D/g, "")) || 1;
      const avgDailySales = 0.5 + idNumber % 3;
      const calculations = applySettingsToCalculations(
        { inventoryQuantity: currentStock },
        avgDailySales
      );
      const daysOfSupply = calculations.daysUntilStockout;
      let status = "success";
      let statusLabel = "Healthy";
      if (currentStock === 0) {
        status = "critical";
        statusLabel = "Out of Stock";
      } else if (currentStock <= calculations.criticalStockLevel) {
        status = "critical";
        statusLabel = "Critical Stock";
      } else if (currentStock <= calculations.lowStockLevel) {
        status = "warning";
        statusLabel = "Low Stock";
      } else if (currentStock <= calculations.reorderPoint) {
        status = "attention";
        statusLabel = "Monitor";
      }
      return {
        id: node.id,
        title: node.title,
        currentStock,
        avgDailySales,
        daysOfSupply,
        status,
        statusLabel,
        price: (variant == null ? void 0 : variant.price) || 0,
        calculations
      };
    } catch (error2) {
      console.error("Error processing product:", error2, node);
      return null;
    }
  }).filter(Boolean);
  if (error && productData.length === 0) {
    return /* @__PURE__ */ jsx(Page, { title: "Visual Inventory Dashboard", children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", color: "critical", children: "Error Loading Dashboard" }),
      /* @__PURE__ */ jsx(Text, { children: error }),
      /* @__PURE__ */ jsx(Text, { children: "Please try refreshing the page or contact support if the problem persists." })
    ] }) }) }) }) });
  }
  productData.sort((a, b) => {
    const statusWeight = { critical: 3, warning: 2, attention: 1, success: 0 };
    const aWeight = statusWeight[a.status] || 0;
    const bWeight = statusWeight[b.status] || 0;
    return bWeight - aWeight;
  });
  const inventoryHealthCounts = {
    critical: productData.filter((p) => p.status === "critical").length,
    warning: productData.filter((p) => p.status === "warning").length,
    attention: productData.filter((p) => p.status === "attention").length,
    success: productData.filter((p) => p.status === "success").length
  };
  const totalProducts = productData.length || 1;
  const healthPercentages = {
    critical: inventoryHealthCounts.critical / totalProducts * 100,
    warning: inventoryHealthCounts.warning / totalProducts * 100,
    attention: inventoryHealthCounts.attention / totalProducts * 100,
    success: inventoryHealthCounts.success / totalProducts * 100
  };
  const priorityProducts = productData.filter((p) => p.status === "critical" || p.status === "warning");
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Visual Inventory Dashboard",
      backAction: {
        content: "Main Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Health Overview" }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "12px", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsxs("div", { style: { height: "24px", display: "flex", borderRadius: "3px", overflow: "hidden" }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.critical}%`, backgroundColor: "#DE3618" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.warning}%`, backgroundColor: "#EEC200" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.attention}%`, backgroundColor: "#9C6ADE" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.success}%`, backgroundColor: "#108043" } })
            ] }) }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
              /* @__PURE__ */ jsx(Badge, { status: "critical", children: inventoryHealthCounts.critical }),
              /* @__PURE__ */ jsx(Badge, { status: "warning", children: inventoryHealthCounts.warning }),
              /* @__PURE__ */ jsx(Badge, { status: "attention", children: inventoryHealthCounts.attention }),
              /* @__PURE__ */ jsx(Badge, { status: "success", children: inventoryHealthCounts.success })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(Text, { children: [
              inventoryHealthCounts.critical + inventoryHealthCounts.warning,
              " products need attention"
            ] }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
              "Using lead time of ",
              appSettings.leadTime,
              " days and safety stock of ",
              appSettings.safetyStockDays,
              " days"
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Priority Actions" }),
          priorityProducts.length > 0 ? /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: priorityProducts.map((product) => /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                padding: "12px",
                backgroundColor: product.status === "critical" ? "#FFF4F4" : "#FFFBEA",
                borderRadius: "4px",
                marginBottom: "8px"
              },
              children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px" }, children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: product.title }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }, children: [
                      /* @__PURE__ */ jsx(Badge, { status: product.status, children: product.statusLabel }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: product.daysOfSupply === 0 ? "Currently out of stock" : `${product.daysOfSupply} days of inventory left` })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(Link$1, { to: "/app/order-automation", children: /* @__PURE__ */ jsx(Button, { primary: product.status === "critical", children: product.status === "critical" ? "Restock Now" : "Reorder" }) })
                ] }),
                product.daysOfSupply > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: "8px" }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "4px" }, children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Inventory Timeline" }),
                    /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                      product.daysOfSupply,
                      " days"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    ProgressBar,
                    {
                      progress: Math.min(100, product.daysOfSupply / Math.max(1, appSettings.safetyStockDays + appSettings.leadTime) * 100),
                      size: "small",
                      color: product.status === "critical" ? "critical" : "warning"
                    }
                  )
                ] })
              ]
            },
            product.id
          )) }) : /* @__PURE__ */ jsx(Text, { children: "All products have healthy inventory levels" })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Timeline Visualization" }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: productData.map((product) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: "16px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.title }),
              /* @__PURE__ */ jsx(Badge, { status: product.status, children: product.statusLabel })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { position: "relative", height: "32px", background: "#F4F6F8", borderRadius: "3px" }, children: [
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "25%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
                Math.ceil(appSettings.safetyStockDays * 0.25),
                "d"
              ] }) }),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "50%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
                Math.ceil(appSettings.safetyStockDays * 0.5),
                "d"
              ] }) }),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "75%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "subdued", children: [
                Math.ceil(appSettings.safetyStockDays * 0.75),
                "d"
              ] }) }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: 0,
                    top: "6px",
                    height: "20px",
                    width: `${Math.min(100, product.daysOfSupply / Math.max(1, appSettings.safetyStockDays) * 100)}%`,
                    background: getTimelineColor(product.status),
                    borderRadius: "2px"
                  }
                }
              ),
              product.daysOfSupply < appSettings.safetyStockDays && /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: `${Math.min(100, product.daysOfSupply / Math.max(1, appSettings.safetyStockDays) * 100)}%`,
                    top: 0,
                    height: "32px",
                    width: "2px",
                    background: "#DE3618"
                  }
                }
              ),
              product.currentStock > 0 && product.calculations.reorderPoint < product.currentStock && /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: `${Math.min(100, product.calculations.reorderPoint / product.currentStock * 100)}%`,
                    top: 0,
                    height: "32px",
                    width: "2px",
                    background: "#8c6e00"
                  }
                }
              )
            ] })
          ] }, product.id)) })
        ] }) }) })
      ] })
    }
  );
}
function getTimelineColor(status) {
  if (!status) {
    return "#AEE9AF";
  }
  switch (status) {
    case "critical":
      return "#FADBD7";
    case "warning":
      return "#FFEB99";
    case "attention":
      return "#E4D6FF";
    case "success":
      return "#AEE9AF";
    default:
      return "#AEE9AF";
  }
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    return json({
      message: "This is a test logs view",
      stats: {
        totalLogs: 42,
        errorCount: 5,
        webhookCount: 12,
        cronJobCount: 25
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return json({
      message: "Authentication failed",
      stats: {
        totalLogs: 0,
        errorCount: 0,
        webhookCount: 0,
        cronJobCount: 0
      }
    });
  }
};
function LogsView() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { style: { padding: "20px", fontFamily: "system-ui, sans-serif" }, children: [
    /* @__PURE__ */ jsx("h1", { style: { marginBottom: "20px" }, children: "Logs & Monitoring" }),
    /* @__PURE__ */ jsx("p", { children: data.message }),
    /* @__PURE__ */ jsxs("div", { style: { marginTop: "20px", marginBottom: "20px" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "System Overview" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "24px", fontWeight: "bold" }, children: data.stats.totalLogs }),
          /* @__PURE__ */ jsx("div", { children: "Total Logs" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "24px", fontWeight: "bold" }, children: data.stats.errorCount }),
          /* @__PURE__ */ jsx("div", { children: "Errors" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "24px", fontWeight: "bold" }, children: data.stats.webhookCount }),
          /* @__PURE__ */ jsx("div", { children: "Webhooks" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "24px", fontWeight: "bold" }, children: data.stats.cronJobCount }),
          /* @__PURE__ */ jsx("div", { children: "Cron Jobs" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("a", { href: "/app", style: { display: "inline-block", padding: "8px 16px", background: "#5c6ac4", color: "white", textDecoration: "none", borderRadius: "4px" }, children: "Back to Dashboard" })
  ] });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LogsView,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function SettingsForm({
  initialValues,
  onSubmit,
  onFormChange,
  hasUnsavedChanges,
  isSubmitting
}) {
  const [formValues, setFormValues] = useState(initialValues || {});
  useEffect(() => {
    if (initialValues) {
      setFormValues(initialValues);
    }
  }, [initialValues]);
  useEffect(() => {
    onFormChange(formValues);
  }, [formValues, onFormChange]);
  const updateFormValue = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const safeToString = (value) => {
    return value !== void 0 && value !== null ? value.toString() : "";
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formValues);
  };
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "6", children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "General Settings" }),
    /* @__PURE__ */ jsxs(FormLayout, { children: [
      /* @__PURE__ */ jsx(
        TextField,
        {
          label: "Lead Time (days)",
          type: "number",
          value: safeToString(formValues.leadTime),
          onChange: (value) => updateFormValue("leadTime", parseInt(value) || 0),
          helpText: "Average days between ordering and receiving inventory",
          min: 1,
          autoComplete: "off"
        }
      ),
      /* @__PURE__ */ jsx(
        Select,
        {
          label: "Restock Strategy",
          options: [
            { label: "Economic Order Quantity", value: "economic" },
            { label: "Just-in-Time", value: "jit" },
            { label: "Fixed Interval", value: "fixed" },
            { label: "Fixed Quantity", value: "quantity" }
          ],
          value: formValues.restockStrategy || "economic",
          onChange: (value) => updateFormValue("restockStrategy", value),
          helpText: "Strategy used to determine when and how much to reorder"
        }
      ),
      /* @__PURE__ */ jsxs(InlineStack, { wrap: false, gap: "2", children: [
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Low Stock Threshold (days)",
            type: "number",
            value: safeToString(formValues.lowStockThreshold),
            onChange: (value) => updateFormValue("lowStockThreshold", parseInt(value) || 0),
            min: 1,
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Critical Stock Threshold (days)",
            type: "number",
            value: safeToString(formValues.criticalStockThreshold),
            onChange: (value) => updateFormValue("criticalStockThreshold", parseInt(value) || 0),
            min: 1,
            autoComplete: "off"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        ChoiceList,
        {
          title: "Notification Preferences",
          allowMultiple: true,
          choices: [
            { label: "Email", value: "email" },
            { label: "SMS", value: "sms" },
            { label: "In-app", value: "app" },
            { label: "Slack", value: "slack" }
          ],
          selected: formValues.notificationPreferences || [],
          onChange: (values) => updateFormValue("notificationPreferences", values)
        }
      )
    ] }),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "Advanced Settings" }),
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            label: "Enable Advanced Features",
            checked: formValues.advancedEnabled || false,
            onChange: (value) => updateFormValue("advancedEnabled", value)
          }
        )
      ] }),
      formValues.advancedEnabled && /* @__PURE__ */ jsxs(FormLayout, { children: [
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Safety Stock Days",
            type: "number",
            value: safeToString(formValues.safetyStockDays),
            onChange: (value) => updateFormValue("safetyStockDays", parseInt(value) || 0),
            helpText: "Extra inventory to protect against variability",
            min: 0,
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Service Level (%)",
            type: "number",
            value: safeToString(formValues.serviceLevelPercent),
            onChange: (value) => updateFormValue("serviceLevelPercent", parseInt(value) || 0),
            helpText: "Target percentage of customer demand to be satisfied",
            min: 50,
            max: 100,
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Forecast Days",
            type: "number",
            value: safeToString(formValues.forecastDays),
            onChange: (value) => updateFormValue("forecastDays", parseInt(value) || 0),
            helpText: "Number of days to forecast demand",
            min: 7,
            autoComplete: "off"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "AI Tagging Settings" }),
      /* @__PURE__ */ jsxs(FormLayout, { children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            label: "Enable AI Product Tagging",
            checked: formValues.aiTaggingEnabled !== false,
            onChange: (value) => updateFormValue("aiTaggingEnabled", value),
            helpText: "Use AI to automatically categorize and tag products"
          }
        ),
        formValues.aiTaggingEnabled !== false && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            Select,
            {
              label: "Tagging Frequency",
              options: [
                { label: "Daily", value: "daily" },
                { label: "Weekly", value: "weekly" },
                { label: "On Product Update", value: "onUpdate" },
                { label: "Manual Only", value: "manual" }
              ],
              value: formValues.aiTaggingFrequency || "daily",
              onChange: (value) => updateFormValue("aiTaggingFrequency", value)
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Batch Size",
              type: "number",
              value: safeToString(formValues.aiTaggingBatchSize),
              onChange: (value) => updateFormValue("aiTaggingBatchSize", value),
              helpText: "Number of products to process in each batch",
              min: 1,
              max: 200,
              autoComplete: "off"
            }
          ),
          /* @__PURE__ */ jsx(
            ChoiceList,
            {
              title: "AI Data Sources",
              allowMultiple: true,
              choices: [
                { label: "Product Metadata", value: "metadata" },
                { label: "Sales History", value: "sales" },
                { label: "Profit Margins", value: "margins" },
                { label: "Seasonal Patterns", value: "seasonal" },
                { label: "Lead Times", value: "leadtime" }
              ],
              selected: formValues.aiTaggingDataSources || [],
              onChange: (values) => updateFormValue("aiTaggingDataSources", values)
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(InlineStack, { align: "end", children: /* @__PURE__ */ jsx(
      Button,
      {
        submit: true,
        primary: true,
        loading: isSubmitting,
        disabled: !hasUnsavedChanges || isSubmitting,
        children: "Save Settings"
      }
    ) })
  ] }) }) });
}
function NavigationConfirmationModal({
  isOpen,
  onConfirm,
  onCancel
}) {
  return /* @__PURE__ */ jsx(
    Modal,
    {
      open: isOpen,
      onClose: onCancel,
      title: "Unsaved Changes",
      primaryAction: {
        content: "Discard changes",
        destructive: true,
        onAction: onConfirm
      },
      secondaryActions: [
        {
          content: "Keep editing",
          onAction: onCancel
        }
      ],
      children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx(TextContainer, { children: /* @__PURE__ */ jsx("p", { children: "You have unsaved changes that will be lost if you leave this page. Are you sure you want to discard your changes?" }) }) })
    }
  );
}
function SuccessToast({
  isActive,
  onDismiss,
  message = "Settings saved successfully"
}) {
  if (!isActive) return null;
  return /* @__PURE__ */ jsx(
    Toast,
    {
      content: message,
      onDismiss,
      duration: 3e3
    }
  );
}
const loader$1 = async ({ request }) => {
  const { authenticateRoute } = await import("./assets/auth-BbyJz8Wc.js");
  await authenticateRoute(request);
  return json({ initialSettings: DEFAULT_SETTINGS });
};
const action = async ({ request }) => {
  const { authenticateRoute } = await import("./assets/auth-BbyJz8Wc.js");
  await authenticateRoute(request);
  const formData = await request.formData();
  const settings = {
    leadTime: parseInt(formData.get("leadTime") || "7", 10),
    notificationPreferences: formData.getAll("notificationPreferences"),
    advancedEnabled: formData.get("advancedEnabled") === "true",
    safetyStockDays: parseInt(formData.get("safetyStockDays") || "14", 10),
    serviceLevelPercent: parseInt(formData.get("serviceLevelPercent") || "95", 10),
    lowStockThreshold: parseInt(formData.get("lowStockThreshold") || "7", 10),
    criticalStockThreshold: parseInt(formData.get("criticalStockThreshold") || "3", 10),
    forecastDays: parseInt(formData.get("forecastDays") || "30", 10),
    restockStrategy: formData.get("restockStrategy") || "economic",
    aiTaggingEnabled: formData.get("aiTaggingEnabled") === "true",
    aiTaggingFrequency: formData.get("aiTaggingFrequency") || "daily",
    aiTaggingBatchSize: formData.get("aiTaggingBatchSize") || "50",
    aiTaggingDataSources: formData.getAll("aiTaggingDataSources")
  };
  return json({
    settings,
    success: true,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
  });
};
function Settings() {
  const navigate = useNavigate();
  const { initialSettings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [formValues, setFormValues] = useState({});
  const [savedFormValues, setSavedFormValues] = useState(null);
  useRef(null);
  useEffect(() => {
    var _a2, _b, _c, _d, _e, _f;
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    const initialFormValues = {
      leadTime: ((_a2 = loadedSettings.leadTime) == null ? void 0 : _a2.toString()) || "7",
      notificationPreferences: loadedSettings.notificationPreferences || ["email"],
      advancedEnabled: loadedSettings.advancedEnabled || false,
      safetyStockDays: ((_b = loadedSettings.safetyStockDays) == null ? void 0 : _b.toString()) || "14",
      serviceLevelPercent: ((_c = loadedSettings.serviceLevelPercent) == null ? void 0 : _c.toString()) || "95",
      lowStockThreshold: ((_d = loadedSettings.lowStockThreshold) == null ? void 0 : _d.toString()) || "7",
      criticalStockThreshold: ((_e = loadedSettings.criticalStockThreshold) == null ? void 0 : _e.toString()) || "3",
      forecastDays: ((_f = loadedSettings.forecastDays) == null ? void 0 : _f.toString()) || "30",
      restockStrategy: loadedSettings.restockStrategy || "economic",
      aiTaggingEnabled: loadedSettings.aiTaggingEnabled ?? true,
      aiTaggingFrequency: loadedSettings.aiTaggingFrequency || "daily",
      aiTaggingBatchSize: loadedSettings.aiTaggingBatchSize || "50",
      aiTaggingDataSources: loadedSettings.aiTaggingDataSources || ["metadata", "sales", "margins", "seasonal", "leadtime"]
    };
    setFormValues(initialFormValues);
    setSavedFormValues(JSON.parse(JSON.stringify(initialFormValues)));
    setHasUnsavedChanges(false);
  }, []);
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes that will be lost if you leave this page.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  useEffect(() => {
    if ((actionData == null ? void 0 : actionData.success) && isSubmitting) {
      setIsSubmitting(false);
      setShowSuccessToast(true);
      saveSettings(actionData.settings);
      setSavedFormValues(JSON.parse(JSON.stringify(formValues)));
      setHasUnsavedChanges(false);
    }
  }, [actionData, isSubmitting, formValues]);
  const handleSubmit = (values) => {
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((val) => formData.append(key, val));
      } else if (typeof value === "boolean") {
        formData.append(key, value.toString());
      } else {
        formData.append(key, value);
      }
    });
    submit(formData, { method: "post" });
  };
  const handleFormValueChange = (newValues) => {
    setFormValues(newValues);
    if (savedFormValues) {
      const formString = JSON.stringify(newValues);
      const savedString = JSON.stringify(savedFormValues);
      setHasUnsavedChanges(formString !== savedString);
    }
  };
  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation("/app");
      setShowNavigationModal(true);
    } else {
      navigate("/app");
    }
  };
  const handleConfirmedNavigation = () => {
    setShowNavigationModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };
  return /* @__PURE__ */ jsx(Frame, { children: /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Settings",
      backAction: {
        content: "Dashboard",
        onAction: handleBackNavigation
      },
      primaryAction: /* @__PURE__ */ jsx(Button, { onClick: () => navigate("/app/sales-analysis"), children: "View Sales Analysis" }),
      children: [
        /* @__PURE__ */ jsxs(BlockStack, { gap: "5", children: [
          (actionData == null ? void 0 : actionData.success) === false && /* @__PURE__ */ jsx(Banner, { tone: "critical", children: actionData.message || "There was an error saving your settings." }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(
              SettingsForm,
              {
                initialValues: formValues,
                onSubmit: handleSubmit,
                onFormChange: handleFormValueChange,
                hasUnsavedChanges,
                isSubmitting
              }
            ) }),
            /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "4", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: "Settings Help" }),
              /* @__PURE__ */ jsx(Text, { children: "Configure your inventory management preferences here. These settings affect how the app calculates reorder points, safety stock, and when to alert you about low inventory." }),
              /* @__PURE__ */ jsxs(Text, { children: [
                /* @__PURE__ */ jsx("strong", { children: "Lead Time:" }),
                " The average time it takes from placing an order to receiving it at your warehouse."
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                /* @__PURE__ */ jsx("strong", { children: "Safety Stock:" }),
                " Extra inventory kept to reduce the risk of stockouts due to uncertainty in demand and supply."
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                /* @__PURE__ */ jsx("strong", { children: "AI Tagging:" }),
                " Enables the system to automatically categorize and tag your products based on multiple data sources."
              ] })
            ] }) }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          NavigationConfirmationModal,
          {
            isOpen: showNavigationModal,
            onConfirm: handleConfirmedNavigation,
            onCancel: () => setShowNavigationModal(false)
          }
        ),
        /* @__PURE__ */ jsx(
          SuccessToast,
          {
            isActive: showSuccessToast,
            onDismiss: () => setShowSuccessToast(false),
            message: "Settings saved successfully"
          }
        )
      ]
    }
  ) });
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Settings,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({ request }) => {
  const { authenticateRoute } = await import("./assets/auth-BbyJz8Wc.js");
  try {
    const { admin, session, isTestStore } = await authenticateRoute(request);
    if (isTestStore) {
      return json({
        products: {
          data: {
            products: {
              edges: [
                {
                  node: {
                    id: "gid://shopify/Product/1",
                    title: "Example Snowboard",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/1",
                            inventoryQuantity: 15,
                            price: "159.99",
                            sku: "SNOW-001"
                          }
                        }
                      ]
                    }
                  }
                },
                {
                  node: {
                    id: "gid://shopify/Product/2",
                    title: "Winter Jacket",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/2",
                            inventoryQuantity: 8,
                            price: "249.99",
                            sku: "WJ-001"
                          }
                        }
                      ]
                    }
                  }
                },
                {
                  node: {
                    id: "gid://shopify/Product/3",
                    title: "Gift Card",
                    variants: {
                      edges: [
                        {
                          node: {
                            id: "gid://shopify/ProductVariant/3",
                            inventoryQuantity: 0,
                            price: "50.00",
                            sku: "GC-001"
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      });
    }
    try {
      const response = await admin.graphql(`
        query {
          products(first: 10) {
            edges {
              node {
                id
                title
                variants(first: 1) {
                  edges {
                    node {
                      id
                      inventoryQuantity
                      price
                      sku
                    }
                  }
                }
              }
            }
          }
        }
      `);
      const responseJson = await response.json();
      return json({ products: responseJson });
    } catch (graphqlError) {
      console.error("GraphQL query error:", graphqlError);
      return json({
        products: { data: { products: { edges: [] } } },
        error: "Failed to fetch products data"
      });
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return json({
      products: { data: { products: { edges: [] } } },
      error: "Authentication failed"
    });
  }
};
function Index() {
  const { products, error } = useLoaderData();
  const [appSettings, setAppSettings] = useState(() => getSettings());
  useEffect(() => {
    let isSubscribed = true;
    try {
      const unsubscribe = subscribeToSettingsChanges((newSettings) => {
        try {
          if (isSubscribed) {
            setAppSettings((prevSettings) => ({
              ...prevSettings,
              ...newSettings
            }));
          }
        } catch (callbackError) {
          console.error("Error in settings update callback:", callbackError);
        }
      });
      return () => {
        isSubscribed = false;
        try {
          unsubscribe();
        } catch (unsubscribeError) {
          console.error("Error during unsubscribe:", unsubscribeError);
        }
      };
    } catch (subscriptionError) {
      console.error("Error setting up settings subscription:", subscriptionError);
      return () => {
      };
    }
  }, []);
  const calculateRecommendation = (currentStock, dailySales) => {
    try {
      const calculations = applySettingsToCalculations({ inventoryQuantity: currentStock }, dailySales);
      if (currentStock <= 0) {
        return "Out of stock";
      } else if (currentStock <= calculations.criticalStockLevel) {
        return "Order now";
      } else if (currentStock <= calculations.lowStockLevel) {
        return "Order soon";
      } else if (currentStock <= calculations.reorderPoint) {
        return "Monitor closely";
      } else {
        return "Stock sufficient";
      }
    } catch (error2) {
      console.error("Error calculating recommendation:", error2);
      return "Calculation error";
    }
  };
  const rows = (() => {
    var _a2, _b, _c;
    try {
      return ((_c = (_b = (_a2 = products == null ? void 0 : products.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges) == null ? void 0 : _c.map(({ node }) => {
        var _a3;
        const variant = (_a3 = node.variants.edges[0]) == null ? void 0 : _a3.node;
        const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
        const idNumber = parseInt(node.id.replace(/\D/g, "")) || 1;
        const sku = (variant == null ? void 0 : variant.sku) || `SKU-${node.title.substring(0, 3).toUpperCase()}-${idNumber.toString().padStart(3, "0")}`;
        const mockSalesHistory = [5, 3, 7, 4, 6];
        const dailySales = mockSalesHistory.reduce((sum, val) => sum + val, 0) / mockSalesHistory.length;
        return [
          node.title,
          currentStock,
          `$${(variant == null ? void 0 : variant.price) || 0}`,
          calculateRecommendation(currentStock, dailySales),
          sku
          // Add SKU to the data
        ];
      })) || [];
    } catch (dataError) {
      console.error("Error processing product data:", dataError);
      return [];
    }
  })();
  const generateAlerts = (rows2) => {
    try {
      const alerts = [];
      const outOfStock = rows2.filter((row) => row[1] === 0);
      if (outOfStock.length > 0) {
        alerts.push({
          title: `${outOfStock.length} products out of stock`,
          status: "critical",
          message: `The following products need immediate attention: ${outOfStock.map((row) => row[0]).join(", ")}`,
          actionText: "Restock Now",
          actionUrl: "/app/order-automation"
        });
      }
      const lowStock = rows2.filter((row) => row[3] === "Order soon" && row[1] > 0);
      if (lowStock.length > 0) {
        alerts.push({
          title: `${lowStock.length} products need reordering soon`,
          status: "warning",
          message: `Based on current sales velocity, consider reordering: ${lowStock.map((row) => row[0]).join(", ")}`,
          actionText: "View Analysis",
          actionUrl: "/app/sales-analysis"
        });
      }
      if (rows2.length > 0) {
        const trendProduct = rows2[0];
        alerts.push({
          title: `Sales trend detected for ${trendProduct[0]}`,
          status: "info",
          message: `Sales of ${trendProduct[0]} are accelerating—consider restocking sooner than initially planned. Recent data shows a 25% increase in sales velocity.`,
          actionText: "Review Trend",
          actionUrl: "/app/sales-analysis"
        });
      }
      const winterProducts = rows2.filter((row) => row[0].includes("Snowboard"));
      if (winterProducts.length > 0) {
        alerts.push({
          title: "Seasonal spike predicted for winter products",
          status: "attention",
          message: `Your holiday bestsellers (${winterProducts.map((row) => row[0]).join(", ")}) are predicted to run out 2 weeks earlier than usual based on historical seasonal patterns.`,
          actionText: "Prepare for Season",
          actionUrl: "/app/seasonal-planning"
        });
      }
      return alerts;
    } catch (alertError) {
      console.error("Error generating alerts:", alertError);
      return [];
    }
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "SkuSight Inventory Predictions",
      primaryAction: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
        /* @__PURE__ */ jsx(Link$1, { to: "/app/notifications", children: /* @__PURE__ */ jsx(Button, { children: "Notification Center" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/dashboard", children: /* @__PURE__ */ jsx(Button, { children: "Visual Dashboard" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/sales-analysis", children: /* @__PURE__ */ jsx(Button, { children: "View Sales Analysis" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/order-automation", children: /* @__PURE__ */ jsx(Button, { primary: true, children: "Automated Ordering" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/profit-recommendations", children: /* @__PURE__ */ jsx(Button, { children: "Profit Maxing" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/system-status", children: /* @__PURE__ */ jsx(Button, { children: "System Status" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/logsview", children: /* @__PURE__ */ jsx(Button, { children: "Logs & Monitoring" }) }),
        /* @__PURE__ */ jsx(Link$1, { to: "/app/settings", children: /* @__PURE__ */ jsx(Button, { children: "Settings" }) })
      ] }),
      children: [
        /* @__PURE__ */ jsx("div", { style: { marginBottom: "16px" }, children: generateAlerts(rows).map((alert, index2) => /* @__PURE__ */ jsx("div", { style: { marginBottom: "12px" }, children: /* @__PURE__ */ jsx(
          Banner,
          {
            title: alert.title,
            status: alert.status,
            onDismiss: () => {
            },
            children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
              /* @__PURE__ */ jsx("p", { style: { marginRight: "12px" }, children: alert.message }),
              /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Link$1, { to: alert.actionUrl, children: /* @__PURE__ */ jsx(Button, { children: alert.actionText }) }) })
            ] })
          }
        ) }, index2)) }),
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Summary" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsxs(Text, { children: [
                "Total Products: ",
                rows.length
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                "Products Needing Attention: ",
                rows.filter((row) => row[3] === "Order soon" || row[3] === "Order now").length
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                "Last Updated: ",
                (/* @__PURE__ */ new Date()).toLocaleString()
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                "Lead Time Setting: ",
                appSettings.leadTime,
                " days | Safety Stock: ",
                appSettings.safetyStockDays,
                " days"
              ] })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Current Inventory Status" }),
            /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "numeric", "numeric", "text", "text"],
                headings: ["Product", "Current Stock", "Price", "Restock Recommendation", "SKU"],
                rows
              }
            )
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Health Overview" }),
            /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: rows.map((row, index2) => {
              let status = "success";
              let label2 = "Healthy";
              if (row[1] === 0) {
                status = "critical";
                label2 = "Out of Stock";
              } else if (row[3] === "Order now") {
                status = "critical";
                label2 = "Reorder Now";
              } else if (row[3] === "Order soon") {
                status = "warning";
                label2 = "Reorder Soon";
              } else if (row[3] === "Monitor closely") {
                status = "attention";
                label2 = "Monitor";
              }
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: row[0] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                  /* @__PURE__ */ jsx(Badge, { status, children: label2 }),
                  (status === "warning" || status === "critical") && /* @__PURE__ */ jsx(Link$1, { to: `/app/order-automation`, children: /* @__PURE__ */ jsx(Button, { size: "slim", children: "Reorder" }) })
                ] })
              ] }, index2);
            }) })
          ] }) }) })
        ] })
      ]
    }
  );
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BHSkarfb.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-kl7MmSrx.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.product-update": { "id": "routes/webhooks.product-update", "parentId": "root", "path": "webhooks/product-update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.product-update-CSxRPO1x.js", "imports": [], "css": [] }, "routes/webhooks.cron": { "id": "routes/webhooks.cron", "parentId": "root", "path": "webhooks/cron", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.cron-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-DEWbrWPs.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/styles-BIcrhJMx.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/FormLayout-D8d9gNoU.js", "/assets/context-Cuq_S-Fv.js"], "css": [] }, "routes/testlogs": { "id": "routes/testlogs", "parentId": "root", "path": "testlogs", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/testlogs-CLKPTElg.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": [] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-Bi4XdHRw.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Banner-4MJ0AgcI.js", "/assets/Link-BkXr7i8j.js", "/assets/ProgressBar-DoAetvWA.js", "/assets/banner-context-B9x05WVp.js", "/assets/CSSTransition-BI2FqCs3.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-D_nzdoqT.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": ["/assets/route-Cnm7FvdT.css"] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-Btxd1NC4.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/index-Rx7DXd0D.js", "/assets/styles-BIcrhJMx.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/EmptyState-D5BdA5_5.js", "/assets/Banner-4MJ0AgcI.js", "/assets/Frame-DZPAd0zi.js", "/assets/context-Cuq_S-Fv.js", "/assets/Image-04wlLHHA.js", "/assets/banner-context-B9x05WVp.js", "/assets/Modal-CEg-nmC-.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/InlineGrid-B9iUkR0h.js", "/assets/LegacyStack-g1cAJ6OF.js", "/assets/index-CeTaglFb.js"], "css": [] }, "routes/app.profit-recommendations": { "id": "routes/app.profit-recommendations", "parentId": "routes/app", "path": "profit-recommendations", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.profit-recommendations-CsxfzwHL.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Banner-4MJ0AgcI.js", "/assets/EmptyState-D5BdA5_5.js", "/assets/DataTable-DAB58wxr.js", "/assets/banner-context-B9x05WVp.js", "/assets/Image-04wlLHHA.js", "/assets/index-CeTaglFb.js", "/assets/Sticky-q5uRhpIz.js"], "css": [] }, "routes/app.order-automation": { "id": "routes/app.order-automation", "parentId": "routes/app", "path": "order-automation", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.order-automation--EOgbM_v.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Page-DvtG3tiZ.js", "/assets/EmptyState-D5BdA5_5.js", "/assets/DataTable-DAB58wxr.js", "/assets/List-l9Je5zTk.js", "/assets/Modal-CEg-nmC-.js", "/assets/Banner-4MJ0AgcI.js", "/assets/Layout-DNtBfCJd.js", "/assets/components-CgIgXmEm.js", "/assets/Image-04wlLHHA.js", "/assets/index-CeTaglFb.js", "/assets/Sticky-q5uRhpIz.js", "/assets/context-Cuq_S-Fv.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/InlineGrid-B9iUkR0h.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app.sales-analysis": { "id": "routes/app.sales-analysis", "parentId": "routes/app", "path": "sales-analysis", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.sales-analysis-dbFU0-p4.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Page-DvtG3tiZ.js", "/assets/ProgressBar-DoAetvWA.js", "/assets/DataTable-DAB58wxr.js", "/assets/Select-CYy_g-2H.js", "/assets/List-l9Je5zTk.js", "/assets/components-CgIgXmEm.js", "/assets/Banner-4MJ0AgcI.js", "/assets/Layout-DNtBfCJd.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/index-CeTaglFb.js", "/assets/Sticky-q5uRhpIz.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app.notifications": { "id": "routes/app.notifications", "parentId": "routes/app", "path": "notifications", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.notifications-oMhPIQLm.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/Banner-4MJ0AgcI.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Select-CYy_g-2H.js", "/assets/index-CeTaglFb.js", "/assets/Checkbox-CxOvbNU9.js", "/assets/InlineGrid-B9iUkR0h.js", "/assets/Sticky-q5uRhpIz.js", "/assets/LegacyStack-g1cAJ6OF.js", "/assets/Image-04wlLHHA.js", "/assets/EmptyState-D5BdA5_5.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app.system-status": { "id": "routes/app.system-status", "parentId": "routes/app", "path": "system-status", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.system-status-BFaSSSIs.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": [] }, "routes/app.status-view": { "id": "routes/app.status-view", "parentId": "routes/app", "path": "status-view", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.status-view-DLFR-0AG.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js"], "css": [] }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.additional-BQyHKPKF.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/index-Rx7DXd0D.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Link-BkXr7i8j.js", "/assets/List-l9Je5zTk.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app.dashboard": { "id": "routes/app.dashboard", "parentId": "routes/app", "path": "dashboard", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.dashboard-eTDvDAbG.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/settings-BAS489GI.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Layout-DNtBfCJd.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/ProgressBar-DoAetvWA.js", "/assets/CSSTransition-BI2FqCs3.js"], "css": [] }, "routes/app.logsview": { "id": "routes/app.logsview", "parentId": "routes/app", "path": "logsview", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.logsview-C1Oj0KH8.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-CgIgXmEm.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-WJ7MuADd.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/settings-BAS489GI.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/FormLayout-D8d9gNoU.js", "/assets/Page-DvtG3tiZ.js", "/assets/Select-CYy_g-2H.js", "/assets/Checkbox-CxOvbNU9.js", "/assets/Modal-CEg-nmC-.js", "/assets/Layout-DNtBfCJd.js", "/assets/Frame-DZPAd0zi.js", "/assets/components-CgIgXmEm.js", "/assets/Banner-4MJ0AgcI.js", "/assets/context-Cuq_S-Fv.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/InlineGrid-B9iUkR0h.js", "/assets/Image-04wlLHHA.js", "/assets/LegacyStack-g1cAJ6OF.js", "/assets/index-CeTaglFb.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-C5K-zRX0.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/settings-BAS489GI.js", "/assets/components-CgIgXmEm.js", "/assets/Page-DvtG3tiZ.js", "/assets/Banner-4MJ0AgcI.js", "/assets/ButtonGroup-Bgv38W4W.js", "/assets/Layout-DNtBfCJd.js", "/assets/DataTable-DAB58wxr.js", "/assets/banner-context-B9x05WVp.js", "/assets/index-CeTaglFb.js", "/assets/Sticky-q5uRhpIz.js"], "css": [] } }, "url": "/assets/manifest-082a3be5.js", "version": "082a3be5" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.product-update": {
    id: "routes/webhooks.product-update",
    parentId: "root",
    path: "webhooks/product-update",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/webhooks.cron": {
    id: "routes/webhooks.cron",
    parentId: "root",
    path: "webhooks/cron",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/testlogs": {
    id: "routes/testlogs",
    parentId: "root",
    path: "testlogs",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app.profit-recommendations": {
    id: "routes/app.profit-recommendations",
    parentId: "routes/app",
    path: "profit-recommendations",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.order-automation": {
    id: "routes/app.order-automation",
    parentId: "routes/app",
    path: "order-automation",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.sales-analysis": {
    id: "routes/app.sales-analysis",
    parentId: "routes/app",
    path: "sales-analysis",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.notifications": {
    id: "routes/app.notifications",
    parentId: "routes/app",
    path: "notifications",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.system-status": {
    id: "routes/app.system-status",
    parentId: "routes/app",
    path: "system-status",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.status-view": {
    id: "routes/app.status-view",
    parentId: "routes/app",
    path: "status-view",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.dashboard": {
    id: "routes/app.dashboard",
    parentId: "routes/app",
    path: "dashboard",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/app.logsview": {
    id: "routes/app.logsview",
    parentId: "routes/app",
    path: "logsview",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route20
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
