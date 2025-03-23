import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Initialize a policy for Trusted Types to allow scripts to run
if (typeof window !== "undefined" && window.trustedTypes && window.trustedTypes.createPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: string => string,
    createScriptURL: string => string,
    createScript: string => string
  });
}

// When running in the Shopify Admin iframe
const isEmbedded = new URLSearchParams(window.location.search).has("embedded");

startTransition(() => {
  if (isEmbedded) {
    // In embedded mode, we need to initialize for the iframe context
    window.__SHOPIFY_DEV_TOOLS_HOOK__ = window.__SHOPIFY_DEV_TOOLS_HOOK__ || {};
    window.__SHOPIFY_APP_BRIDGE_TOOLS__ = window.__SHOPIFY_APP_BRIDGE_TOOLS__ || {};
  }

  // Always use standard hydration - no special handling needed
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
}); 