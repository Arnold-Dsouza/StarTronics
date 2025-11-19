import React from 'react';
import clsx from 'clsx';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export const FormField: React.FC<Props> = ({ label, name, className, ...rest }) => {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <input name={name} className={clsx('input', className)} {...rest} />
    </label>
  );
};
