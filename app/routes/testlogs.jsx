import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json({ 
    message: "This is a test logs page outside the app namespace" 
  });
};

export default function TestLogs() {
  const data = useLoaderData();
  
  return (
    <div style={{ padding: "20px" }}>
      <h1>Test Logs Page</h1>
      <p>{data.message}</p>
      <a href="/app">Back to app</a>
    </div>
  );
} 