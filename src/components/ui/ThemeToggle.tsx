'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure client-only rendering after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Laptop },
  ];

  const ActiveIcon = () => {
    // Render a placeholder until client mount to match server output
    if (!mounted) {
      return <Laptop size={15} className="text-text-secondary" />;
    }
    switch (theme) {
      case 'light':
        return <Sun size={15} className="text-amber-500 animate-pulse-slow" />;
      case 'dark':
        return <Moon size={15} className="text-violet-400" />;
      default:
        return <Laptop size={15} className="text-text-secondary" />;
    }
  };

  return (
    <div ref={dropdownRef} className="relative z-[60]">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-[rgba(255,255,255,0.06)] hover:border-[#7c3aed]/50 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all duration-200 shadow-sm"
        aria-label="Toggle Theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <ActiveIcon />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-36 rounded-2xl glass-panel border border-border-subtle bg-bg-secondary/95 p-1.5 shadow-2xl overflow-hidden focus:outline-none"
          style={{
            animation: 'fadeIn 0.12s ease-out',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          }}
          role="menu"
        >
          {toggleOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-accent-violet/10 text-[#7c3aed]'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className={isSelected ? 'text-[#7c3aed]' : 'text-text-muted'} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={11} className="text-[#7c3aed]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
