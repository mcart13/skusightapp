import React from 'react';

function LogsStats({ stats }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <p>Total Logs: {stats.totalLogs}</p>
      <p>Errors: {stats.errorCount}</p>
      <p>Webhooks: {stats.webhookCount}</p>
      <p>Cron Jobs: {stats.cronJobCount}</p>
    </div>
  );
}

export default LogsStats; 