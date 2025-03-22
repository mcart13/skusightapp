import { useState, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  Banner,
  Badge,
  ProgressBar,
  List,
  DataTable,
  ButtonGroup,
  EmptyState,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Fetch system status information
  // In a real app, this would come from a database
  const lastRun = new Date(Date.now() - 12 * 60 * 60 * 1000).toLocaleString(); // 12 hours ago
  const nextScheduledRun = new Date(Date.now() + 12 * 60 * 60 * 1000).toLocaleString(); // 12 hours from now
  
  // Stats would be real in a production app
  const stats = {
    totalProducts: 78,
    productsTagged: 62,
    percentTagged: 79,
    lastRunDuration: "2m 37s",
    totalTags: 287,
    averageTagsPerProduct: 4.6,
    seasonalProducts: 18,
    highVelocityProducts: 14,
    lowMarginProducts: 21
  };
  
  // Recent activity would be fetched from a log in production
  const recentActivity = [
    {
      id: "act-001",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toLocaleString(),
      type: "auto-tagging",
      status: "success",
      details: "Tagged 62 products successfully"
    },
    {
      id: "act-002",
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString(),
      type: "auto-tagging",
      status: "success",
      details: "Tagged 58 products successfully"
    },
    {
      id: "act-003",
      timestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toLocaleString(),
      type: "auto-tagging",
      status: "warning",
      details: "Tagged 48 products, 3 products failed due to API limits"
    }
  ];
  
  return json({ 
    status: {
      aiTaggingEnabled: true,
      scheduledFrequency: "daily",
      lastRun,
      nextScheduledRun, 
      isRunning: false,
      stats,
      recentActivity
    } 
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  
  switch (action) {
    case "run-now":
      // In a real app, this would trigger a background job
      // For this demo, we'll simulate a successful response after a delay
      return json({
        success: true,
        message: "Auto-tagging job started successfully",
        jobId: "job-" + Math.floor(Math.random() * 1000000)
      });
      
    case "pause-auto-tagging":
      // In a real app, this would update a setting in the database
      return json({
        success: true,
        message: "Automatic tagging has been paused",
        newStatus: false
      });
      
    case "resume-auto-tagging":
      // In a real app, this would update a setting in the database
      return json({
        success: true,
        message: "Automatic tagging has been resumed",
        newStatus: true
      });
      
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
  
  // Group related state together to prevent sync issues
  const [jobState, setJobState] = useState({
    isRunning: false,
    progress: 0,
    jobId: null
  });
  
  const [aiEnabled, setAiEnabled] = useState(status.aiTaggingEnabled);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  
  // Use a ref to track component mount status for cleanup safety
  const isMounted = useRef(true);
  
  // Cleanup on component unmount
  useEffect(() => {
    // Set mount status when component mounts
    isMounted.current = true;
    
    // Cleanup when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Simulate a running job if user started one
  useEffect(() => {
    // Store the interval ID outside the setInterval for proper cleanup
    let intervalId = null;
    
    if (actionData?.success && actionData?.jobId) {
      // Update state atomically to prevent race conditions
      setJobState({
        isRunning: true,
        progress: 0,
        jobId: actionData.jobId
      });
      
      intervalId = setInterval(() => {
        // Only update state if component is still mounted
        if (isMounted.current) {
          setJobState(currentState => {
            const newProgress = currentState.progress + Math.random() * 15;
            
            if (newProgress >= 100) {
              // Clear interval inside setState to avoid race conditions
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              
              // Use setTimeout only if component is still mounted
              if (isMounted.current) {
                setTimeout(() => {
                  if (isMounted.current) {
                    setJobState(finishedState => ({
                      ...finishedState,
                      isRunning: false
                    }));
                  }
                }, 500);
              }
              
              return {
                ...currentState,
                progress: 100
              };
            }
            
            return {
              ...currentState,
              progress: newProgress
            };
          });
        }
      }, 800);
    }
    
    // Clear interval when component unmounts or dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [actionData]);
  
  // Update enabled status if the action changed it
  useEffect(() => {
    if (actionData?.success && actionData?.newStatus !== undefined) {
      setAiEnabled(actionData.newStatus);
    }
  }, [actionData]);
  
  const handleRunNow = () => {
    // Prevent multiple job runs
    if (jobState.isRunning) return;
    
    const formData = new FormData();
    formData.append("action", "run-now");
    submit(formData, { method: "post" });
  };
  
  const handleConfirmAction = () => {
    const formData = new FormData();
    formData.append("action", confirmAction);
    submit(formData, { method: "post" });
    setConfirmModalOpen(false);
  };
  
  const openConfirmModal = (action) => {
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };
  
  // Format activity rows for the data table
  const activityRows = status.recentActivity.map(activity => [
    activity.timestamp,
    activity.type === "auto-tagging" ? "AI Tagging" : activity.type,
    <Badge status={activity.status === "success" ? "success" : "warning"}>
      {activity.status}
    </Badge>,
    activity.details
  ]);
  
  return (
    <Page
      title="System Status"
      subtitle="Monitor automated tagging and system processes"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h2" variant="headingMd">
                  Automatic AI Tagging System
                </Text>
                <div>
                  <Badge status={aiEnabled ? "success" : "critical"}>
                    {aiEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
              
              {jobState.isRunning ? (
                <Banner title="AI tagging system is active" status="info">
                  <p>The system is currently analyzing and tagging your products.</p>
                  <div style={{ marginTop: '16px' }}>
                    <ProgressBar progress={jobState.progress} size="small" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <Text variant="bodySm">Analyzing products...</Text>
                      <Text variant="bodySm">{Math.round(jobState.progress)}%</Text>
                    </div>
                  </div>
                </Banner>
              ) : (
                <div>
                  <Text variant="bodyMd">
                    Next scheduled run: <strong>{status.nextScheduledRun}</strong>
                  </Text>
                  <Text variant="bodyMd">
                    Last run: <strong>{status.lastRun}</strong>
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <ButtonGroup>
                      <Button 
                        primary 
                        onClick={handleRunNow}
                        disabled={jobState.isRunning} // Prevent multiple clicks
                      >
                        Run Now
                      </Button>
                      {aiEnabled ? (
                        <Button 
                          onClick={() => openConfirmModal("pause-auto-tagging")}
                          disabled={jobState.isRunning} // Disable during job execution
                        >
                          Pause Automatic Tagging
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => openConfirmModal("resume-auto-tagging")}
                          disabled={jobState.isRunning} // Disable during job execution
                        >
                          Resume Automatic Tagging
                        </Button>
                      )}
                    </ButtonGroup>
                  </div>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Tagging Stats
              </Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Text variant="headingXl">{status.stats.productsTagged}</Text>
                  <Text variant="bodySm">Products Tagged</Text>
                </div>
                <div>
                  <Text variant="headingXl">{status.stats.totalTags}</Text>
                  <Text variant="bodySm">Total Tags Applied</Text>
                </div>
                <div>
                  <Text variant="headingXl">{status.stats.averageTagsPerProduct}</Text>
                  <Text variant="bodySm">Avg Tags per Product</Text>
                </div>
                <div>
                  <Text variant="headingXl">{status.stats.percentTagged}%</Text>
                  <Text variant="bodySm">Coverage</Text>
                </div>
              </div>
              
              <Text variant="headingSm">Identified Product Categories:</Text>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <Badge status="info">Seasonal: {status.stats.seasonalProducts}</Badge>
                <Badge status="success">High Velocity: {status.stats.highVelocityProducts}</Badge>
                <Badge status="warning">Low Margin: {status.stats.lowMarginProducts}</Badge>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How It Works
              </Text>
              
              <Text variant="bodyMd">
                The AI tagging system automatically:
              </Text>
              
              <List type="number">
                <List.Item>
                  Analyzes your product catalog and order history
                </List.Item>
                <List.Item>
                  Detects patterns like seasonality and sales velocity
                </List.Item>
                <List.Item>
                  Applies appropriate tags to your products
                </List.Item>
                <List.Item>
                  Updates forecasts and inventory recommendations accordingly
                </List.Item>
              </List>
              
              <Text variant="bodyMd">
                These tags are then used to optimize inventory forecasting, reordering suggestions, and sales predictions.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recent Activity
              </Text>
              
              {status.recentActivity.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Time", "Activity", "Status", "Details"]}
                  rows={activityRows}
                />
              ) : (
                <EmptyState
                  heading="No recent activity"
                  image=""
                >
                  <p>The system has not run any automatic tagging jobs yet.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={aiEnabled ? "Pause Automatic Tagging?" : "Resume Automatic Tagging?"}
        primaryAction={{
          content: "Confirm",
          onAction: handleConfirmAction
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setConfirmModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              {aiEnabled 
                ? "Pausing automatic tagging will stop the system from analyzing and tagging your products. You can still run it manually."
                : "Resuming automatic tagging will allow the system to regularly analyze and tag your products without manual intervention."}
            </p>
            <p>
              Are you sure you want to {aiEnabled ? "pause" : "resume"} automatic tagging?
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
} 