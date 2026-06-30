import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  children
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
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
          {message && <p className="text-sm text-muted mb-4">{message}</p>}
          {children}
        </div>
        {(onConfirm || onCancel) && (
          <div className="px-6 py-4 bg-bg flex justify-end gap-3">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button variant={confirmVariant} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
