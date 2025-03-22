import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
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

export default function LogsView() {
  const data = useLoaderData();
  
  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "20px" }}>Logs & Monitoring</h1>
      <p>{data.message}</p>
      
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h2>System Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          <div style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data.stats.totalLogs}</div>
            <div>Total Logs</div>
          </div>
          <div style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data.stats.errorCount}</div>
            <div>Errors</div>
          </div>
          <div style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data.stats.webhookCount}</div>
            <div>Webhooks</div>
          </div>
          <div style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data.stats.cronJobCount}</div>
            <div>Cron Jobs</div>
          </div>
        </div>
      </div>
      
      <a href="/app" style={{ display: "inline-block", padding: "8px 16px", background: "#5c6ac4", color: "white", textDecoration: "none", borderRadius: "4px" }}>
        Back to Dashboard
      </a>
    </div>
  );
} 