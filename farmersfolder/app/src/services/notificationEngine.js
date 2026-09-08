/**
 * Phase 9 — Centralized Notification Engine
 * 
 * Provides:
 * 1. Event-driven architecture: Business modules dispatch domain events without direct SMS calls
 * 2. Multi-channel broadcast: IN_APP, PUSH, SMS, IVR
 * 3. Idempotency duplicate prevention
 * 4. Multilingual template rendering
 * 5. Delivery status tracking and retry policy
 */

import { NOTIFICATION_TEMPLATES } from './notificationTemplates.js';
import { mockSmsService } from './mockSmsService.js';

class NotificationEngine {
  constructor() {
    this.sentEventRegistry = new Set(); // Idempotency keys
    this.notifications = [];
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(notification) {
    this.listeners.forEach((cb) => cb(notification, this.notifications));
  }

  /**
   * Dispatch a business event across all registered channels
   */
  async dispatchEvent({
    event,
    payload = {},
    farmerId = 'FARM-91234567',
    farmerMobile = '+91 81254 21544',
    language = 'en',
    channels = ['sms', 'in_app', 'push', 'ivr'],
    idempotencyKey = null,
  }) {
    // Generate idempotency key if not provided
    const key = idempotencyKey || `${event}:${payload.token || payload.id || 'gen'}:${payload.stage || '0'}`;

    // Duplicate check
    if (this.sentEventRegistry.has(key)) {
      return { duplicate: true, message: 'Notification already dispatched for this event.' };
    }
    this.sentEventRegistry.add(key);

    const template = NOTIFICATION_TEMPLATES[event] || NOTIFICATION_TEMPLATES.BOOKING_CONFIRMED;
    const renderFn = template[language] || template.en;
    const messageText = typeof renderFn === 'function' ? renderFn(payload) : String(renderFn);

    const createdTime = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const createdRecords = [];

    // Dispatch across requested channels
    for (const channel of channels) {
      let status = 'DELIVERED';
      let failureReason = null;
      let sentTime = new Date().toISOString();

      if (channel === 'sms') {
        const smsResult = await mockSmsService.sendSms({
          toMobile: farmerMobile,
          messageText,
        });
        status = smsResult.status;
        failureReason = smsResult.failureReason;
        sentTime = smsResult.sentTime;
      }

      const notifRecord = {
        notificationId: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        farmerId,
        event,
        message: messageText,
        language,
        channel, // 'sms' | 'in_app' | 'push' | 'ivr'
        status,  // 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
        createdTime,
        sentTime,
        formattedTime,
        failureReason,
        idempotencyKey: key,
        payload,
      };

      this.notifications.unshift(notifRecord);
      createdRecords.push(notifRecord);
      this.broadcast(notifRecord);
    }

    return {
      duplicate: false,
      records: createdRecords,
    };
  }

  /**
   * Retry a failed notification
   */
  async retryNotification(notificationId) {
    const notif = this.notifications.find((n) => n.notificationId === notificationId);
    if (!notif || notif.status !== 'FAILED') return false;

    notif.status = 'DELIVERED';
    notif.failureReason = null;
    notif.sentTime = new Date().toISOString();
    this.broadcast(notif);
    return true;
  }

  getNotifications(filterChannel = 'ALL') {
    if (filterChannel === 'ALL') return this.notifications;
    return this.notifications.filter((n) => n.channel.toUpperCase() === filterChannel.toUpperCase());
  }
}

export const notificationEngine = new NotificationEngine();
