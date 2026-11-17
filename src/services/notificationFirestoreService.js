// Stores cloud notifications and reports and updates notification read status.
/**
 * Notification & Operations Firestore Service
 * Connects notifications, read status, and user reports to Cloud Firestore.
 */

import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';

export const NOTIFICATIONS_COLLECTION = 'notifications';
export const REPORTS_COLLECTION = 'reports';

/**
 * Persist notification to Firestore.
 */
export async function saveNotificationToFirestore(notification, userId) {
  if (!isFirebaseConfigured || !db) return;
  if (!notification || !notification.id) return;

  const payload = {
    ...notification,
    userId: userId || auth?.currentUser?.uid || 'demo-user',
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.id), payload, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Failed to save notification ${notification.id}:`, err.message);
  }
}

/**
 * Mark notification as read in Firestore.
 */
export async function markNotificationReadInFirestore(notificationId) {
  if (!isFirebaseConfigured || !db) return;
  if (!notificationId) return;

  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[Firebase] Failed to mark notification ${notificationId} as read:`, err.message);
  }
}

/**
 * Real-time listener for user notifications.
 */
export function subscribeToCloudNotifications(userId, onNotificationsChanged, onError) {
  if (!isFirebaseConfigured || !db || !userId) {
    return () => {};
  }

  const notifCol = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(notifCol, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const notices = [];
      snapshot.forEach((docSnap) => {
        notices.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });
      onNotificationsChanged(notices);
    },
    (err) => {
      console.warn('[Firebase] Firestore notifications listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Save user report to Firestore.
 */
export async function saveReportToFirestore(report) {
  if (!isFirebaseConfigured || !db) return;
  if (!report || !report.id) return;

  const payload = {
    ...report,
    submittedBy: auth?.currentUser?.uid || 'demo-user',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, REPORTS_COLLECTION, report.id), payload, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Failed to save report ${report.id}:`, err.message);
  }
}
