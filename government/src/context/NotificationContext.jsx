import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LIVE_EVENTS } from '../data/mockData';

const NotificationContext = createContext(null);

const EXTRA_EVENTS = [
  { type: 'arrival', message: 'Vijayawada Central crossed 80 arrivals today', icon: '📊' },
  { type: 'payment', message: '₹4.2L disbursed to 18 farmers at Rajahmundry', icon: '💰' },
  { type: 'alert', message: 'Taraori queue stabilized — back to normal', icon: '🟢' },
  { type: 'milestone', message: 'Monthly procurement target 68% achieved', icon: '🎯' },
  { type: 'grievance', message: 'Grievance GRV-003 resolved — staff counseled', icon: '✅' },
  { type: 'alert', message: 'Kakinada storage dropped below 50%', icon: '📦' },
  { type: 'offline', message: 'Guntakal Mandi back online after 5h outage', icon: '🟢' },
  { type: 'congestion', message: 'Gharaunda congestion easing — queue now 38', icon: '🟡' },
];

export function NotificationProvider({ children }) {
  const [events, setEvents] = useState(LIVE_EVENTS);
  const [unreadCount, setUnreadCount] = useState(LIVE_EVENTS.length);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      const ev = EXTRA_EVENTS[idx % EXTRA_EVENTS.length];
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      const newEvent = {
        id: `EV-LIVE-${Date.now()}`,
        time: timeStr,
        ...ev,
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
      idx++;
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const markRead = useCallback(() => setUnreadCount(0), []);

  return (
    <NotificationContext.Provider value={{ events, unreadCount, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
