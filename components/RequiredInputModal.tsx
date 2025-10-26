import React, { useState } from 'react';
import type { RequiredInput } from '../types';

interface RequiredInputModalProps {
  inputs: RequiredInput[];
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export const RequiredInputModal: React.FC<RequiredInputModalProps> = ({ inputs, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    inputs.reduce((acc, input) => ({ ...acc, [input.name]: '' }), {})
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-primary-dark bg-opacity-80 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-secondary-dark rounded-lg shadow-xl p-6 md:p-8 border border-tertiary-dark max-w-lg w-full transform transition-all">
        <h2 className="text-2xl font-bold text-text-dark mb-2">Additional Information Required</h2>
        <p className="text-text-secondary-dark mb-6">The AI has determined the following details are needed to build your bot correctly.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {inputs.map((input) => (
            <div key={input.name}>
              <label htmlFor={input.name} className="block text-sm font-medium text-text-secondary-dark">
                {input.label} {input.required === false && <span className="text-gray-500">(optional)</span>}
              </label>
              <input
                type={input.type}
                name={input.name}
                id={input.name}
                value={formData[input.name] || ''}
                onChange={handleChange}
                required={input.required !== false}
                className="mt-1 block w-full bg-tertiary-dark border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-text-dark p-3"
              />
              <p className="mt-2 text-xs text-gray-500">{input.description}</p>
            </div>
          ))}

          <div className="pt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 border border-tertiary-dark rounded-md shadow-sm text-sm font-medium text-text-dark bg-tertiary-dark hover:bg-gray-700"
            >
              Cancel Build
            </button>
            <button
              type="submit"
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
            >
              Submit and Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};