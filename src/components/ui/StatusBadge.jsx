import React from 'react';

export default function StatusBadge({ status }) {
  const isPaid = status === 'Paid' || status === 'Received';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      isPaid 
        ? 'bg-primary-light text-primary-dark border-primary/20' 
        : 'bg-red-50 text-danger border-danger/20'
    }`}>
      {status || 'Unknown'}
    </span>
  );
}
