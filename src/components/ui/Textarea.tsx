import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={`w-full bg-surface-3 border ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
            : 'border-border-subtle focus:border-accent-violet focus:ring-accent-violet/30'
        } focus:outline-none focus:ring-2 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
