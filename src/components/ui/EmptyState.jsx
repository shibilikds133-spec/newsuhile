import React from 'react';
import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-border py-12">
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg mb-4">
          <Icon className="h-6 w-6 text-muted" aria-hidden="true" />
        </div>
      )}
      <h3 className="mt-2 text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
