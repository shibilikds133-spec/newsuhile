import React from 'react';

export default function Card({ label, value, accent = 'green', icon: Icon, className = '' }) {
  const accentStyles = {
    green: { border: 'border-l-primary', text: 'text-primary', bg: 'bg-green-50' },
    red: { border: 'border-l-danger', text: 'text-danger', bg: 'bg-red-50' },
    blue: { border: 'border-l-info', text: 'text-info', bg: 'bg-blue-50' },
    amber: { border: 'border-l-warning', text: 'text-warning', bg: 'bg-amber-50' },
  };

  const currentAccent = accentStyles[accent] || accentStyles.green;

  return (
    <div className={`bg-white rounded-lg border border-border shadow-sm p-5 border-l-4 ${currentAccent.border} ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-text truncate">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-2 rounded-full ${currentAccent.bg} ${currentAccent.text}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
