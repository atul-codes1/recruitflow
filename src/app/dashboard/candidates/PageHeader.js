'use client';

import { useState } from 'react';

export default function PageHeader() {


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
    </div>
  );
}
