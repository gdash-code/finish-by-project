import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, Check, X, Smartphone, Clock, Sparkles, AlertCircle, Send, Play } from 'lucide-react';
import { Book } from '../lib/readingPlan';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
  triggerDailyReminder,
  getUnreadBooksForToday,
  isNotificationSupported,
} from '../lib/notifications';

interface NotificationModalProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (enabled: boolean) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  books,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settings, setSettings] = useState(getStoredNotificationSettings());
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const targetEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());
    const current = getStoredNotificationSettings();
    setSettings(current);
  }, [isOpen]);

  const { unreadBooks, totalTargetPages } = getUnreadBooksForToday(books);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveStoredNotificationSettings(updated);
      if (onStatusChange) onStatusChange(true);
      setTestStatus('Permission granted! You can now send a test notification below.');
    } else if (res === 'denied') {
      setTestStatus('Notification permission was denied. Please allow notifications in browser/system settings.');
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    const updated = { ...settings, enabled };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
    if (onStatusChange) onStatusChange(enabled);
  };

  const handleTimeChange = (time: string) => {
    const updated = { ...settings, reminderTime: time };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
  };

  const handleSendTestNow = async () => {
    /*
    setIsSendingTest(true);
    setTestStatus(null);

    if (permission !== 'granted') {
      const newPerm = await requestNotificationPermission();
      setPermission(newPerm);
      if (newPerm !== 'granted') {
        setTestStatus('Permission required to send notifications.');
        setIsSendingTest(false);
        return;
      }
    }

    const result = await triggerDailyReminder(books, true);
    setIsSendingTest(false);
    setTestStatus(result.message);
    */
  };

  const handleStartTimerTest = async () => {
    /*
    if (permission !== 'granted') {
      const newPerm = await requestNotificationPermission();
      setPermission(newPerm);
      if (newPerm !== 'granted') {
        setTestStatus('Permission required for scheduled check.');
        return;
      }
    }

    targetEndTimeRef.current = Date.now() + 10000;
    setCountdown(10);
    setTestStatus('Timer started (10 seconds). Note: Browser JS pauses when phone screen locks.');
    */
  };

  useEffect(() => {
    if (countdown === null || !targetEndTimeRef.current) return;

    const checkAndTick = () => {
      const now = Date.now();
      const remaining = Math.ceil((targetEndTimeRef.current! - now) / 1000);

      if (remaining <= 0) {
        // Time expired! Trigger notification instantly
        targetEndTimeRef.current = null;
        setCountdown(null);
        triggerDailyReminder(books, true).then((res) => {
          setTestStatus(`⏰ Reminder triggered! ${res.message}`);
        });
      } else {
        setCountdown(remaining);
      }
    };

    const interval = setInterval(checkAndTick, 250);
    const handleVisibility = () => checkAndTick();

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [countdown, books]);

  if (!isOpen) return null;

  const previewMessage = (() => {
    if (unreadBooks.length === 0) {
      if (books.filter((b) => b.status === 'active').length === 0) {
        return 'Take some time to read a couple pages today and start a new book!';
      }
      return "Awesome job! You've already logged your reading for today. Keep up the momentum!";
    } else if (unreadBooks.length === 1) {
      const target = totalTargetPages > 0 ? totalTargetPages : 'a few';
      return `Hey! Read ${target} pages of "${unreadBooks[0].title}" today to stay on track.`;
    } else {
      const target = totalTargetPages > 0 ? `${totalTargetPages} pages total` : 'your daily targets';
      return `Hey! You have ${unreadBooks.length} volumes waiting today (${target}). Take a moment to read!`;
    }
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-[#FBF9F4] border border-[#E5E3DF] rounded-[36px] sm:rounded-[48px] p-6 sm:p-10 w-full max-w-xl shadow-[0_40px_120px_rgba(0,0,0,0.2)] relative max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-[#0F172A] text-white rounded-xl">
                  <Bell size={18} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A]">
                  Daily Reading Reminders
                </h2>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0F172A]/40 font-bold">
                Browser Notification API
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-[#0F172A]/5 rounded-full transition-all text-[#0F172A]/30 hover:text-[#0F172A]"
            >
              <X size={20} />
            </button>
          </div>

          {!isNotificationSupported() ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 text-sm mb-6 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold mb-1">Notifications standard not supported</p>
                <p className="text-xs text-amber-800">
                  Your browser does not support standard web notifications. If you are on iPhone, please update to iOS 16.4+ or add this app to your Home Screen using Safari Share menu.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Permission Banner */}
              <div
                className={`p-6 rounded-[28px] border transition-all ${
                  permission === 'granted'
                    ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                    : permission === 'denied'
                    ? 'bg-rose-50/60 border-rose-200/80 text-rose-950'
                    : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        permission === 'granted'
                          ? 'bg-emerald-500 animate-pulse'
                          : permission === 'denied'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.15em]">
                      Status: {permission.toUpperCase()}
                    </span>
                  </div>
                  {permission === 'granted' && (
                    <span className="text-[10px] font-mono bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                {permission === 'default' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs leading-relaxed text-amber-900/80">
                      Grant browser permission so Finish By can remind you to complete your daily reading goal if you haven't logged pages today.
                    </p>
                    <button
                      onClick={handleRequestPermission}
                      className="w-full py-3.5 bg-amber-900 text-white rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.2em] hover:bg-amber-950 transition-all shadow-md"
                    >
                      Enable Browser Notifications
                    </button>
                  </div>
                )}

                {permission === 'denied' && (
                  <div className="mt-3 text-xs leading-relaxed text-rose-900/80">
                    <p className="font-semibold mb-1">Notifications blocked by browser</p>
                    <p>To enable: Tap the lock/settings icon in your browser address bar or iPhone Safari Settings, allow Notifications, and reload this page.</p>
                  </div>
                )}

                {permission === 'granted' && (
                  <p className="text-xs text-emerald-900/80 mt-1">
                    Notifications are enabled and authorized for this device.
                  </p>
                )}
              </div>

              {/* iOS iPhone Tip Card */}
              <div className="p-5 bg-white border border-[#E5E3DF] rounded-[24px] flex items-start gap-3 shadow-sm">
                <Smartphone size={20} className="text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#0F172A] font-serif">iPhone / iOS Users:</p>
                  <p className="text-[#0F172A]/70 leading-relaxed">
                    On iOS 16.4+, web notifications work directly in Safari! For full background support, tap the <span className="font-semibold text-[#0F172A]">Share</span> button in Safari and choose <span className="font-semibold text-[#0F172A]">"Add to Home Screen"</span>.
                  </p>
                </div>
              </div>

              {/* Main Actions: Instant Test & Timed Test (Hidden for MVP) */}
              {/*
              <div className="bg-white border border-[#E5E3DF] p-6 rounded-[28px] space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-[#D97706]" />
                  <h3 className="text-sm font-bold text-[#0F172A] uppercase font-mono tracking-wider">
                    Test Notifications
                  </h3>
                </div>
                <p className="text-xs text-[#0F172A]/60 leading-relaxed">
                  Fire an instant reminder or set a 10-second timer to test how the alert appears on your phone or desktop screen.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSendTestNow}
                    disabled={isSendingTest}
                    className="flex items-center justify-center gap-2 bg-[#0F172A] text-white px-4 py-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.15em] hover:bg-[#1E293B] transition-all disabled:opacity-50 shadow-md"
                  >
                    <Send size={14} />
                    {isSendingTest ? 'Sending...' : 'Test Instantly'}
                  </button>

                  <button
                    onClick={handleStartTimerTest}
                    disabled={countdown !== null}
                    className="flex items-center justify-center gap-2 bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F172A] px-4 py-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.15em] hover:bg-[#E5E3DF] transition-all disabled:opacity-50"
                  >
                    <Play size={14} className="text-[#D97706]" />
                    {countdown !== null ? `Testing in ${countdown}s...` : '10s Timer Test'}
                  </button>
                </div>

                {countdown !== null && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-xs font-mono font-semibold text-amber-900 animate-pulse">
                      ⏳ Countdown active: {countdown} seconds remaining!
                    </p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      You can lock or switch apps on iPhone now to test background arrival.
                    </p>
                  </div>
                )}

                {testStatus && (
                  <div className="p-3 bg-[#F9F8F6] border border-[#E5E3DF] rounded-xl text-xs font-mono text-[#0F172A]/80 leading-relaxed">
                    {testStatus}
                  </div>
                )}
              </div>
              */}

              {/* Message Preview */}
              <div className="bg-white border border-[#E5E3DF] p-6 rounded-[28px] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#0F172A]/40">
                    Today's Live Reminder Payload
                  </span>
                  <span className="text-[9px] font-mono text-[#D97706] font-bold uppercase">
                    Auto-Calculated
                  </span>
                </div>
                <div className="p-4 bg-[#F9F8F6] border border-[#E5E3DF] rounded-2xl font-serif italic text-sm text-[#0F172A] leading-relaxed">
                  "{previewMessage}"
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="bg-white border border-[#E5E3DF] p-6 rounded-[28px] space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] font-serif">Daily Check Schedule</h4>
                    <p className="text-[10px] font-mono text-[#0F172A]/40 uppercase tracking-wider">Automated Daily Prompt</p>
                  </div>
                  <button
                    onClick={() => handleToggleEnabled(!settings.enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.enabled ? 'bg-[#0F172A]' : 'bg-[#E5E3DF]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F1F0ED]">
                  <div className="flex items-center gap-2 text-xs text-[#0F172A]/70 font-mono">
                    <Clock size={16} className="text-[#D97706]" />
                    <span>Reminder Preferred Time</span>
                  </div>
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="bg-[#F9F8F6] border border-[#E5E3DF] rounded-xl px-3 py-1.5 font-mono text-xs font-bold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#D97706]/20"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[#0F172A]/10 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#0F172A] text-white px-8 py-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.2em] hover:bg-[#1E293B] transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
