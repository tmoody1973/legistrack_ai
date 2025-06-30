import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
  autoComplete
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      id={id}
      name={name}
      autoComplete={autoComplete}
      className={`
        w-full px-4 py-2.5 border border-gray-300 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
        disabled:bg-gray-50 disabled:cursor-not-allowed
        placeholder-gray-400 text-gray-900
        transition-all duration-200
        ${className}
      `}
    />
  );
};