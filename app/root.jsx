import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

// Only include meta tags that are essential and won't cause issues in the iframe
export const meta = () => {
  return [
    { title: "SkuSight" },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    // Add cache-related meta tags to address the warning
    { httpEquiv: "Cache-Control", content: "no-cache, no-store, must-revalidate" },
    { httpEquiv: "Pragma", content: "no-cache" },
    { httpEquiv: "Expires", content: "0" }
  ];
};

export function links() {
  return [
    { rel: "stylesheet", href: "/styles/global.css" },
    { rel: "stylesheet", href: "/styles/shopify-performance.css" },
    { rel: "stylesheet", href: "/styles/shopify-iframe-reset.css" },
    { rel: "preconnect", href: "https://cdn.shopify.com" }
  ];
}

// Handle security headers
export function headers() {
  return {
    // Fix content-security-policy issue
    "Content-Security-Policy": "frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com;",
    // Remove unneeded headers
    "X-Frame-Options": null,
    // Set cache headers
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
}

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
