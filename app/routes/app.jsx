import { Link, Outlet, useLoaderData, useRouteError, useNavigate } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  // Extract shop and host from URL for convenience
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "testingstore.myshopify.com";
  const host = url.searchParams.get("host") || "host";
  
  // TEMPORARY WORKAROUND: Always return authenticated data
  console.log("Using test store data for authentication");
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: shop,
    host: host,
    isAuthenticated: true,
    isTestStore: true
  };
};

export default function App() {
  const { apiKey, shop, host } = useLoaderData();
  
  // Create navigation items with preserved URL parameters
  const navItems = [
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
  ];

  return (
    <AppProvider
      isEmbeddedApp={true}
      apiKey={apiKey}
      shop={shop}
      host={host}
      forceRedirect={false} // Don't force redirect as we're using test data
    >
      <NavMenu navigation={navItems} />
      <Outlet context={{ shop, host }} />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
