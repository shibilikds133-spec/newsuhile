import React, { useState, useEffect } from 'react';

const PAGE_SIZE = 15;

export default function Table({ columns, data, className = '' }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever data/filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [data]);

  const visibleData = data.slice(0, visibleCount);
  const hasMore = visibleCount < data.length;
  const remaining = data.length - visibleCount;

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-white ${className}`}>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-[#f8fafc] sticky top-0">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {visibleData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`px-6 py-4 whitespace-nowrap text-sm text-text ${col.tdClassName || ''}`}>
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Activity List View */}
      <div className="md:hidden space-y-3 p-4 bg-bg">
        {visibleData.map((row, rowIndex) => (
          <div key={rowIndex} className="p-4 bg-white rounded-2xl shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${row.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                {row.type === 'income' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 17 10-10"/><path d="M7 7h10v10"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 7 10 10"/><path d="M17 7v10H7"/></svg>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-gray-900 text-sm uppercase tracking-tight truncate">
                  {row.category || row.item || 'Transaction'}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
              <span className={`font-bold text-base ${row.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {row.type === 'income' ? '+' : '-'}{typeof row.amount === 'number' ? `₹${row.amount.toLocaleString('en-IN')}` : row.amount}
              </span>
              {columns.find(c => c.key === 'actions') && (
                <div className="flex gap-2 shrink-0">
                  {columns.find(c => c.key === 'actions').render(row, rowIndex)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      {data.length > 0 && (
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex flex-col items-center gap-2">
          <span className="text-xs text-muted">
            Showing{' '}
            <span className="font-semibold text-text">{visibleData.length}</span>
            {' '}of{' '}
            <span className="font-semibold text-text">{data.length}</span>
            {' '}records
          </span>
          <div className="flex gap-2">
            {hasMore && (
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="px-6 py-2 text-xs font-semibold rounded-full bg-white border border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                Load {Math.min(remaining, PAGE_SIZE)} more ↓
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                onClick={() => setVisibleCount(PAGE_SIZE)}
                className="px-6 py-2 text-xs font-semibold rounded-full bg-white border border-border text-muted hover:bg-gray-100 transition-all shadow-sm"
              >
                Collapse ↑
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
