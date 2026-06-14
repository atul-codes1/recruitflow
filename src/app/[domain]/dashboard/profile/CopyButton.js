'use client';

import { useState } from 'react';

export default function CopyButton({ textToCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      style={{ 
        background: copied ? '#10b981' : '#6366f1', 
        color: 'white', 
        border: 'none', 
        padding: '0 1.5rem', 
        borderRadius: '8px', 
        fontSize: '0.9rem', 
        fontWeight: 600, 
        cursor: 'pointer', 
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy ID
        </>
      )}
    </button>
  );
}
