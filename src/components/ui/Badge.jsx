import React from 'react';

export default function Badge({ type }) {
  const styles = {
    income: 'bg-primary-light text-primary-dark border-primary/20',
    expense: 'bg-red-50 text-danger border-danger/20',
    refreshment: 'bg-amber-50 text-warning border-warning/20',
  };

  const style = styles[type?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
    </span>
  );
}
