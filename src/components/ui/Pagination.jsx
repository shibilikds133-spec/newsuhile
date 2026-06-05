import React from 'react';
import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1 && total === 0) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center text-sm text-muted">
        Showing {start}–{end} of {total} records
      </div>
      <div className="flex items-center gap-4">
        <select 
          className="text-sm border border-border rounded-md px-2 py-1 text-text"
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
        
        <div className="flex items-center gap-1 border border-border rounded-md">
          <button 
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1 hover:bg-bg disabled:opacity-50"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 text-sm font-medium border-x border-border">
            {page} / {totalPages}
          </div>
          <button 
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1 hover:bg-bg disabled:opacity-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
