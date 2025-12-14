'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotifications, markNotificationAsRead, type Notification } from '@/app/actions/notificationActions';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  userId: string | undefined;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  // 🔔 AGGRESSIVE DEBUG - TOP OF NotificationBell
  console.log('🔔🔔🔔 NotificationBell COMPONENT MOUNTED 🔔🔔🔔', {
    userId: userId,
    userIdType: typeof userId,
    hasUserId: !!userId,
    timestamp: new Date().toISOString()
  });
  
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug: Log when component renders
  useEffect(() => {
    console.log('🔔 NotificationBell useEffect - rendered with userId:', userId);
  }, [userId]);

  // Fetch notifications on mount and when userId changes
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const result = await getNotifications(userId);
        if (result.success && result.data) {
          setNotifications(result.data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        const result = await markNotificationAsRead(notification.id);
        if (result.success) {
          // Update local state optimistically
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
          );
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to screening report if screening_id exists
    if (notification.screening_id) {
      router.push(`/clinic/report/${notification.screening_id}`);
    }

    // Close dropdown
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Always render the bell if userId is provided (even if there are no notifications)
  if (!userId) {
    console.warn('NotificationBell: userId is missing', { userId });
    // Return a visible placeholder for debugging
    return (
      <div 
        className="relative inline-flex flex-shrink-0 border border-red-500 bg-red-100 p-2"
        data-debug="notification-bell-no-userid"
        style={{ minWidth: '40px', minHeight: '40px' }}
      >
        <span className="text-xs">No ID</span>
      </div>
    );
  }

  return (
    <div 
      className="relative inline-flex flex-shrink-0" 
      ref={dropdownRef} 
      data-testid="notification-bell"
      style={{ minWidth: '40px', minHeight: '40px' }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          console.log('NotificationBell clicked, opening dropdown');
          setIsOpen(!isOpen);
        }}
        className="relative h-10 w-10 border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        type="button"
        style={{ 
          minWidth: '40px', 
          minHeight: '40px',
          display: 'inline-flex',
          visibility: 'visible',
          opacity: 1
        }}
      >
        <Bell className="h-5 w-5 text-foreground flex-shrink-0" style={{ display: 'block' }} />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 h-5 w-5 min-w-[1.25rem] rounded-full bg-red-500 flex items-center justify-center text-xs text-white font-bold border-2 border-background z-10 pointer-events-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-accent transition-colors',
                    notification.is_read ? 'bg-muted/50' : 'bg-background'
                  )}
                >
                  <div className="font-semibold text-sm mb-1">{notification.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

