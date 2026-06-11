'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  value: number; // 0 - 10
  max?: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  showValue?: boolean;
  className?: string;
}

const starCount = 5;

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
};

export default function Rating({
  value,
  max = 10,
  onChange,
  size = 'md',
  readOnly = false,
  showValue = false,
  className = '',
}: RatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  // Normalize to 5-star system
  const normalized = (value / max) * starCount;
  const display = hovered !== null ? hovered : normalized;

  const starSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {Array.from({ length: starCount }).map((_, i) => {
        const fill = display >= i + 1 ? 1 : display > i ? display - i : 0;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (!readOnly && onChange) {
                // Convert back to 0-10 scale
                onChange(((i + 1) / starCount) * max);
              }
            }}
            onMouseEnter={() => !readOnly && setHovered(i + 1)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            className={`relative flex-shrink-0 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
            aria-label={`Rate ${i + 1} out of ${starCount}`}
          >
            {/* Background (empty) star */}
            <Star
              size={starSize}
              className="text-surface-3"
              fill="currentColor"
            />
            {/* Overlay filled portion */}
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  size={starSize}
                  className="text-accent-gold"
                  fill="currentColor"
                />
              </span>
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1.5 text-sm font-semibold text-accent-gold tabular-nums">
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}
