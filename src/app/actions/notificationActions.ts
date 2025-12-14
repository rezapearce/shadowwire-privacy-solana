'use server';

import { db } from '@/lib/supabase-server';

export interface Notification {
  id: string;
  user_id: string;
  screening_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface GetNotificationsResult {
  success: boolean;
  data?: Notification[];
  error?: string;
}

export interface MarkNotificationReadResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Get notifications for a user
 * Fetches the last 5 notifications ordered by created_at DESC
 * 
 * @param userId - UUID of the user
 * @returns Result object with notifications array or error message
 */
export async function getNotifications(userId: string): Promise<GetNotificationsResult> {
  // Log at the VERY TOP - before any validation or processing
  console.log('🚨 [notifications] ====== getNotifications SERVER ACTION CALLED ======');
  console.log('[notifications] getNotifications called with userId:', userId);
  console.log('[notifications] userId type:', typeof userId);
  console.log('[notifications] timestamp:', new Date().toISOString());
  
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[notifications] invalid user ID:', userId);
      return {
        success: false,
        error: 'Invalid user ID',
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('[notifications] invalid UUID format:', userId);
      return {
        success: false,
        error: 'Invalid user ID format',
      };
    }

    console.log('[notifications] querying database for user_id:', userId);
    const { data, error } = await db
      .from('notifications')
      .select('id, user_id, screening_id, title, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[notifications] database error:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error: `Failed to fetch notifications: ${error.message}`,
      };
    }

    console.log('[notifications] query successful, found', data?.length || 0, 'notifications');
    console.log('[notifications] notification data:', JSON.stringify(data, null, 2));

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('[notifications] unexpected error:', error);
    console.error('[notifications] error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Server Action: Mark a notification as read
 * Updates is_read to true for the given notification ID
 * 
 * @param notificationId - UUID of the notification
 * @returns Result object with success status or error message
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<MarkNotificationReadResult> {
  try {
    if (!notificationId || typeof notificationId !== 'string' || notificationId.trim() === '') {
      return {
        success: false,
        error: 'Invalid notification ID',
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notificationId)) {
      return {
        success: false,
        error: 'Invalid notification ID format',
      };
    }

    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: `Failed to mark notification as read: ${error.message}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in markNotificationAsRead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

