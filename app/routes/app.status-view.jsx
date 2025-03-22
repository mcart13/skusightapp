import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
// Import Polaris as a whole package
import polarisPackage from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  
  return json({
    shop
  });
};

export default function SimpleSystemStatus() {
  const { shop } = useLoaderData();
  
  // Get all component names from Polaris
  const polarisComponentNames = Object.keys(polarisPackage).filter(key => 
    typeof polarisPackage[key] === 'function' || 
    (typeof polarisPackage[key] === 'object' && polarisPackage[key] !== null)
  );
  
  // Extract Page and Text components safely
  const Page = polarisPackage.Page;
  const Text = polarisPackage.Text;
  
  return (
    <div style={{ padding: "20px" }}>
      <h1>System Status (Simplified)</h1>
      <p>Shop: {shop || "Not available"}</p>
      
      <div style={{ marginTop: "30px" }}>
        <h2>Available Polaris Components:</h2>
        <ul>
          {polarisComponentNames.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 