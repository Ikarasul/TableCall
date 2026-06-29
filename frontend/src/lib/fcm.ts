/**
 * lib/fcm.ts
 * ===================================================
 * Firebase Cloud Messaging integration สำหรับ Capacitor
 *
 * ใช้ @capacitor-firebase/messaging plugin
 * - ขอ permission แจ้งเตือน (Android 13+)
 * - ดึง FCM token แล้วส่งไปบันทึกที่ Backend
 * - รับ Push Notification ขณะแอปอยู่ Background / ปิดอยู่
 *
 * หมายเหตุ: ถ้ารันบน browser (ไม่ใช่ Capacitor) จะ skip ทั้งหมด
 */

import { Capacitor } from '@capacitor/core';
import type { FirebaseMessaging } from '@capacitor-firebase/messaging';

// Lazy import — โหลดเฉพาะเมื่อรันบน Capacitor เท่านั้น
let messaging: typeof FirebaseMessaging | null = null;

const isNative = () => Capacitor.isNativePlatform();

async function getMessaging(): Promise<typeof FirebaseMessaging | null> {
  if (!isNative()) return null;
  if (!messaging) {
    const mod = await import('@capacitor-firebase/messaging');
    messaging = mod.FirebaseMessaging;
  }
  return messaging;
}

// ===================================================
// 1. ขอ Permission แจ้งเตือน
// ===================================================
export async function requestNotificationPermission(): Promise<boolean> {
  const fcm = await getMessaging();
  if (!fcm) return false; // browser — skip

  const result = await fcm.requestPermissions();
  return result.receive === 'granted';
}

// ===================================================
// 2. ดึง FCM Token แล้วส่งไป Backend
// ===================================================
export async function registerFCMToken(authToken: string): Promise<void> {
  const fcm = await getMessaging();
  if (!fcm) return; // browser — skip

  try {
    const { token } = await fcm.getToken();
    if (!token) return;

    // ส่ง token ไปบันทึกที่ backend
    const { default: api } = await import('./api');
    await api.post('/v1/staff/device-token/', { fcm_token: token });
    console.log('[FCM] Token registered:', token.substring(0, 20) + '...');
  } catch (err) {
    console.error('[FCM] Failed to register token:', err);
  }
}

// ===================================================
// 3. ตั้ง Listener รับ Push Notification (Foreground)
// ===================================================
export async function setupFCMListeners(
  onNotification: (data: Record<string, string>) => void
): Promise<() => void> {
  const fcm = await getMessaging();
  if (!fcm) return () => {}; // browser — return empty cleanup

  // Foreground notification (แอปเปิดอยู่)
  const foregroundSub = await fcm.addListener(
    'notificationReceived',
    (event) => {
      const data = event.notification.data ?? {};
      console.log('[FCM] Foreground notification:', data);
      onNotification(data as Record<string, string>);
    }
  );

  // Notification tap — ผู้ใช้แตะที่แจ้งเตือน (แอปปิดหรือ background)
  const tapSub = await fcm.addListener(
    'notificationActionPerformed',
    (event) => {
      const data = event.notification.data ?? {};
      console.log('[FCM] Notification tapped:', data);
      // navigate ไปหน้า notifications อัตโนมัติ
      window.location.href = '/staff/notifications';
    }
  );

  // Return cleanup function
  return () => {
    foregroundSub.remove();
    tapSub.remove();
  };
}

// ===================================================
// 4. Full Setup — เรียกครั้งเดียวตอน Login สำเร็จ
// ===================================================
export async function initFCM(
  authToken: string,
  onPush: (data: Record<string, string>) => void
): Promise<() => void> {
  if (!isNative()) return () => {};

  const granted = await requestNotificationPermission();
  if (!granted) {
    console.warn('[FCM] Notification permission denied');
    return () => {};
  }

  const fcm = await getMessaging();
  if (fcm) {
    try {
      await fcm.createChannel({
        id: 'tablecall_alerts',
        name: 'TableCall Alerts',
        description: 'แจ้งเตือนเรียกพนักงานและเช็คบิล',
        importance: 5,
        visibility: 1,
        sound: 'default'
      });
      console.log('[FCM] Android Notification Channel created');
    } catch (e) {
      console.error('[FCM] Error creating channel:', e);
    }
  }

  await registerFCMToken(authToken);
  const cleanup = await setupFCMListeners(onPush);
  return cleanup;
}
