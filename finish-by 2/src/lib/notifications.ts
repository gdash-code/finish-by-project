import { Book, startOfDay } from './readingPlan';

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // "20:00"
  lastPromptedDate?: string; // YYYY-MM-DD
  lastNotifiedDate?: string; // YYYY-MM-DD
}

const SETTINGS_KEY = 'finishby-notification-settings';

export const defaultSettings: NotificationSettings = {
  enabled: false,
  reminderTime: '20:00', // Default 8:00 PM
};

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to parse notification settings', e);
  }
  return defaultSettings;
}

export function saveStoredNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings', e);
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function getUnreadBooksForToday(books: Book[]): { unreadBooks: Book[]; totalTargetPages: number; readTodayCount: number } {
  const todayDate = startOfDay(new Date()).getTime();
  const todayKey = getTodayKey();

  const activeBooks = books.filter(b => b.status === 'active');
  const unreadBooks: Book[] = [];
  let totalTargetPages = 0;
  let readTodayCount = 0;

  for (const book of activeBooks) {
    const readToday = book.lastProgressUpdate === todayKey ? book.pagesReadToday : 0;
    if (readToday > 0) {
      readTodayCount++;
    } else {
      unreadBooks.push(book);
      const todaysTarget = book.dailyPlan.find(d => startOfDay(d.date).getTime() === todayDate)?.pagesTarget || 0;
      totalTargetPages += todaysTarget;
    }
  }

  return { unreadBooks, totalTargetPages, readTodayCount };
}

export async function sendBrowserNotification(title: string, body: string, icon = '/favicon.ico'): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser.');
    return false;
  }

  let permission: NotificationPermission | 'unsupported' = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    console.warn('Notification permission denied by user.');
    return false;
  }

  try {
    // Try service worker notification first (better on mobile/iOS standalone PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: 'finish-by-reminder',
        });
        return true;
      }
    }

    // Fallback to standard Notification constructor
    const notification = new Notification(title, {
      body,
      icon,
      tag: 'finish-by-reminder',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Error delivering notification:', err);
    return false;
  }
}

export async function triggerDailyReminder(books: Book[], isTest = false): Promise<{ sent: boolean; title: string; body: string; message: string }> {
  const { unreadBooks, totalTargetPages } = getUnreadBooksForToday(books);
  
  let title = 'Finish By Reading Reminder 📖';
  let body = '';

  if (unreadBooks.length === 0) {
    if (books.filter(b => b.status === 'active').length === 0) {
      body = 'Take some time to read a couple pages today and start a new book!';
    } else {
      body = "Awesome job! You've already logged your reading for today. Keep up the momentum!";
    }
  } else if (unreadBooks.length === 1) {
    const book = unreadBooks[0];
    const target = totalTargetPages > 0 ? totalTargetPages : 'a few';
    body = `Hey! Read ${target} pages of "${book.title}" today to stay on track.`;
  } else {
    const target = totalTargetPages > 0 ? `${totalTargetPages} pages total` : 'your daily targets';
    body = `Hey! You have ${unreadBooks.length} volumes waiting today (${target}). Take a moment to read!`;
  }

  if (isTest) {
    title = '🔔 Finish By Test Reminder';
  }

  const success = await sendBrowserNotification(title, body);

  if (success && !isTest) {
    const settings = getStoredNotificationSettings();
    settings.lastNotifiedDate = getTodayKey();
    saveStoredNotificationSettings(settings);
  }

  return {
    sent: success,
    title,
    body,
    message: success 
      ? 'Notification sent successfully!' 
      : (getNotificationPermissionStatus() === 'denied' 
        ? 'Notification permission is blocked in browser settings.' 
        : 'Could not send notification. Please check browser permissions.')
  };
}
