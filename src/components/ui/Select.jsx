import React from 'react';

export default function Select({ label, name, options = [], error, required, className = '', value, onChange, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-text">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm ${
          error ? 'border-danger text-danger focus:ring-danger focus:border-danger' : 'border-border text-text'
        }`}
        {...props}
      >
        <option value="" disabled hidden>Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
