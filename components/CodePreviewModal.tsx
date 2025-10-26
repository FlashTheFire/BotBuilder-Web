import React, { useEffect } from 'react';
import type { GeneratedFile } from '../types';

declare const Prism: any;

interface CodePreviewModalProps {
  file: GeneratedFile | null;
  onClose: () => void;
}

export const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ file, onClose }) => {
  useEffect(() => {
    if (file && typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop();
    switch (extension) {
      case 'py': return 'python';
      case 'txt': return 'text';
      case 'Dockerfile': return 'docker';
      default: return 'markup';
    }
  };

  return (
    <div className="fixed inset-0 bg-primary-dark bg-opacity-80 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-secondary-dark rounded-lg shadow-xl border border-tertiary-dark max-w-4xl w-full h-3/4 flex flex-col transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-tertiary-dark">
            <h3 className="text-lg font-semibold text-text-dark">{file.name}</h3>
            <button onClick={onClose} className="text-text-secondary-dark hover:text-text-dark">&times;</button>
        </div>
        <div className="flex-1 p-2 overflow-auto">
             <pre className="h-full"><code className={`language-${getLanguage(file.name)}`}>{file.code}</code></pre>
        </div>
        <div className="p-4 border-t border-tertiary-dark text-right">
             <button onClick={onClose} className="py-2 px-4 border border-tertiary-dark rounded-md shadow-sm text-sm font-medium text-text-dark bg-tertiary-dark hover:bg-gray-700">
                Close
             </button>
        </div>
      </div>
    </div>
  );
};
