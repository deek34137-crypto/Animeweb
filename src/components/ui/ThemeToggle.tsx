'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const shouldReduceMotion = useReducedMotion();

  // Ensure client-only rendering after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.min(prev + 1, toggleOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.max(prev - 1, 0));
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
        ref={triggerRef}
        onClick={() => { setIsOpen(!isOpen); setFocusedIdx(-1); }}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-[rgba(255,255,255,0.06)] hover:border-[#7c3aed]/50 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all duration-200 shadow-sm"
        aria-label={`Theme: ${mounted ? theme : 'system'}. Change theme`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <ActiveIcon />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            aria-label="Theme selection"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.12, ease: [0.23, 1, 0.32, 1] }}
            style={{
              transformOrigin: 'top right',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }}
            className="absolute right-0 mt-2 w-36 rounded-2xl glass-panel border border-border-subtle bg-bg-secondary/95 p-1.5 shadow-2xl overflow-hidden focus:outline-none list-none"
          >
            {toggleOptions.map((opt, idx) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.value;
              const isFocused = focusedIdx === idx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTheme(opt.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  className={`cursor-pointer w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all duration-150 ${
                    isSelected
                      ? 'bg-accent-violet/10 text-[#7c3aed]'
                      : isFocused
                      ? 'bg-bg-elevated text-text-primary'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={isSelected ? 'text-[#7c3aed]' : 'text-text-muted'} aria-hidden="true" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={11} className="text-[#7c3aed]" aria-hidden="true" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
