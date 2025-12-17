import React from 'react';

interface InputGroupProps {
  label: string;
  id: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select inputs
  rows?: number; // For textarea
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  options,
  rows,
  className = ""
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          className="px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 transition-shadow"
          required={required}
        >
          <option value="" disabled>Seleccionar opción</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : rows ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          className="px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 transition-shadow resize-none"
          required={required}
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 transition-shadow"
          required={required}
        />
      )}
    </div>
  );
};