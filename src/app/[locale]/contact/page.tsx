'use client';

import React, { useState } from 'react';
import { Mail, User, MessageSquare, Send, CheckCircle, AlertTriangle, Clock, Globe, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Mock form submission
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Mail size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            Contact <span className="text-orange-400">Us</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Have a question, feature request, or feedback? Drop us a line!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form Column */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="glass-panel border border-emerald-500/20 bg-emerald-500/5 rounded-3xl p-8 text-center space-y-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-xl font-bold text-text-primary font-display">Message Sent Successfully!</h2>
              <p className="text-xs text-text-secondary max-w-md leading-relaxed">
                Thank you for reaching out to Aniworld. Our team has received your message and will review it. We typically respond within 24–48 hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setSubject('');
                  setMessage('');
                }}
                className="mt-4 px-6 py-2.5 bg-surface-3 border border-border-default hover:bg-surface-4 text-text-primary rounded-xl text-xs font-bold transition duration-200"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <div className="glass-panel border border-border-default rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              {/* Background Glows */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary font-display">Send a Message</h2>
                <p className="text-xs text-text-muted">Fields marked with * are required.</p>
              </div>

              {error && (
                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Your Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm text-text-primary"
                      />
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm text-text-primary"
                      />
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Subject *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What is your request about?"
                      className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm text-text-primary"
                    />
                    <MessageSquare size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Message *
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your request in detail..."
                    rows={6}
                    className="w-full bg-surface-2 border border-border-subtle rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm text-text-primary resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition duration-300 shadow-lg shadow-orange-500/10 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Support Sidebar Info Column */}
        <div className="space-y-6">
          {/* Card 1: Support Channels */}
          <div className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
              <Globe size={16} className="text-orange-400" />
              Community & Support
            </h3>
            <div className="space-y-3.5">
              <div className="text-xs space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Discord Server</span>
                <a 
                  href="https://discord.gg/aniworld" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-orange-400 hover:underline font-semibold block"
                >
                  discord.gg/aniworld
                </a>
              </div>
              
              <div className="text-xs space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Email Address</span>
                <a 
                  href="mailto:support@aniworld.to" 
                  className="text-text-secondary hover:text-orange-400 font-semibold block transition-colors"
                >
                  support@aniworld.to
                </a>
              </div>
            </div>
          </div>

          {/* Card 2: Operating Hours */}
          <div className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              Response Times
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              We monitor requests constantly. General support questions are answered within <strong>24–48 hours</strong>.
            </p>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 text-xs text-text-muted flex gap-2">
              <HelpCircle size={16} className="text-orange-400/80 flex-shrink-0 mt-0.5" />
              <span>For account sync issues, please specify your MyAnimeList or AniList username in the message body.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
