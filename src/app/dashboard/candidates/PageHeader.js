'use client';

import { useState } from 'react';

export default function PageHeader() {


  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await fetch('/api/cron/process-queue', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.processed === 0) {
          alert("The AI Queue is currently empty. No resumes need processing.");
        } else {
          alert(`Successfully processed ${data.processed} queued resumes!`);
        }
        window.location.reload();
      } else {
        alert("Queue processing error: " + (data.error || data.message));
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setIsProcessingQueue(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', margin: 0 }}>
        Candidates Pipeline
      </h1>
      <button 
        onClick={handleProcessQueue} 
        disabled={isProcessingQueue}
        className="btn-primary"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1.5rem', 
          fontSize: '1rem', 
          fontWeight: 600, 
          boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
          opacity: isProcessingQueue ? 0.7 : 1
        }}
      >
        {isProcessingQueue ? '⚙️ Processing...' : '⚡ Process AI Queue'}
      </button>
    </div>
  );
}
