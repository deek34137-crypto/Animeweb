'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Send, Check, Settings } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabledOnServer, setIsEnabledOnServer] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    notifyEpisodeRelease: true,
    notifyAnnouncements: true,
    notifyReplies: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = async () => {
      const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(pushSupported);

      if (!pushSupported) {
        setLoading(false);
        return;
      }

      try {
        // Fetch webpush configuration from server
        const res = await fetch('/api/webpush');
        if (res.ok) {
          const config = await res.json();
          setIsEnabledOnServer(config.enabled);
          setVapidPublicKey(config.publicKey);

          if (config.enabled) {
            // Get active SW registration
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);

            // If subscribed, load local preferences (or we could fetch from server, but defaults are true)
            if (sub) {
              const prefRes = await fetch('/api/user/preferences'); // fallback mock or just local defaults
              if (prefRes.ok) {
                const data = await prefRes.json();
                if (data.preferences) {
                  setPreferences({
                    notifyEpisodeRelease: data.preferences.notifyEpisodeRelease ?? true,
                    notifyAnnouncements: data.preferences.notifyAnnouncements ?? true,
                    notifyReplies: data.preferences.notifyReplies ?? true,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[Web Push] Failed to fetch subscription details:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSupport();
  }, []);

  const subscribeToPush = async () => {
    if (!vapidPublicKey) return;
    setActionLoading(true);

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission was denied. Please enable notifications in your browser settings.');
        setActionLoading(false);
        return;
      }

      // 2. Get ready registration
      const registration = await navigator.serviceWorker.ready;
      
      // 3. Subscribe
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Send subscription to server
      const res = await fetch('/api/webpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          preferences,
        }),
      });

      if (res.ok) {
        setSubscription(sub);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save subscription.');
      }
    } catch (err: any) {
      console.error('[Web Push] Failed to subscribe:', err);
      alert(err.message || 'Failed to enable notifications.');
    } finally {
      setActionLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    setActionLoading(true);

    try {
      // 1. Unsubscribe locally
      await subscription.unsubscribe();

      // 2. Remove from server database
      await fetch('/api/webpush', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      setSubscription(null);
    } catch (err) {
      console.error('[Web Push] Failed to unsubscribe:', err);
      alert('Failed to disable notifications.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof typeof preferences, value: boolean) => {
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);

    if (subscription) {
      try {
        // Send updated preferences to server
        await fetch('/api/webpush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            preferences: updatedPrefs,
          }),
        });
      } catch (err) {
        console.error('[Web Push] Failed to save preferences:', err);
      }
    }
  };

  const sendTestPush = async () => {
    if (!subscription || actionLoading) return;
    setActionLoading(true);
    setTestSent(false);

    try {
      const res = await fetch('/api/webpush', { method: 'PUT' });
      if (res.ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch test notification.');
      }
    } catch (err) {
      console.error('[Web Push] Failed to trigger test notification:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-muted">
        Push notifications are not supported in this browser. Please ensure you are using a modern browser (Chrome, Firefox, Safari iOS 16.4+).
      </div>
    );
  }

  if (!isEnabledOnServer) {
    return (
      <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-muted">
        Push notification server is currently disabled. Please contact the administrator.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-accent-glow animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl bg-bg-secondary border border-border-subtle">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
            {subscription ? (
              <Bell className="w-5 h-5 text-accent-glow" />
            ) : (
              <BellOff className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-text-primary">Push Notifications</h4>
            <p className="text-xs text-text-secondary">Get notified when new episodes, announcements, and replies are published.</p>
          </div>
        </div>

        <button
          onClick={subscription ? unsubscribeFromPush : subscribeToPush}
          disabled={actionLoading}
          className="px-4 py-2 text-xs font-semibold rounded-lg shadow-md border transition duration-200 flex items-center gap-1.5 shrink-0"
          style={{
            background: subscription ? 'transparent' : 'var(--gradient-accent)',
            color: subscription ? 'var(--text-primary)' : 'white',
            borderColor: subscription ? 'var(--border-subtle)' : 'transparent',
          }}
        >
          {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {!actionLoading && subscription && 'Disable'}
          {!actionLoading && !subscription && 'Enable'}
        </button>
      </div>

      {subscription && (
        <div className="border-t border-border-subtle pt-6 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-text-primary uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5 text-accent-secondary" />
            Notification Preferences
          </div>

          <div className="flex flex-col gap-3">
            {/* Preference: Episode Releases */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated/40 border border-border-subtle cursor-pointer hover:bg-bg-elevated/80 transition">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-text-primary">New Episode Releases</span>
                <span className="text-[10px] text-text-secondary">Get alerted immediately when followed anime publish new episodes.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifyEpisodeRelease}
                onChange={(e) => handlePreferenceChange('notifyEpisodeRelease', e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
              />
            </label>

            {/* Preference: Announcements */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated/40 border border-border-subtle cursor-pointer hover:bg-bg-elevated/80 transition">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-text-primary">Site Announcements</span>
                <span className="text-[10px] text-text-secondary">Receive important updates, events, and seasonal platform launches.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifyAnnouncements}
                onChange={(e) => handlePreferenceChange('notifyAnnouncements', e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
              />
            </label>

            {/* Preference: Comment Replies */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated/40 border border-border-subtle cursor-pointer hover:bg-bg-elevated/80 transition">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-text-primary">Comment & Forum Replies</span>
                <span className="text-[10px] text-text-secondary">Receive alerts when someone replies to your review or comments.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifyReplies}
                onChange={(e) => handlePreferenceChange('notifyReplies', e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
              />
            </label>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={sendTestPush}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-semibold hover:bg-bg-elevated/80 transition text-text-secondary hover:text-text-primary"
            >
              {testSent ? (
                <>
                  <Check className="w-3.5 h-3.5 text-status-completed" />
                  Test Sent!
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Test Notification
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
