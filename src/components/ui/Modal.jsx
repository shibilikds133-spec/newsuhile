import React from 'react';
import Button from './Button';

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  confirmVariant = 'primary' 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-muted">{message}</p>
        </div>
        <div className="px-6 py-4 bg-bg flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
