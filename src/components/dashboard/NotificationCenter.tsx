import React, { useState, useEffect } from 'react';
import { Bell, Clock, Star, FileText, Users, X, Settings, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  type: 'bill_update' | 'vote' | 'tracking' | 'representative' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    billId?: string;
    representativeId?: string;
    url?: string;
  };
}

export const NotificationCenter: React.FC = () => {
  const { authState } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  useEffect(() => {
    if (authState.user) {
      loadNotifications();
    }
  }, [authState.user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const userNotifications = await notificationService.getUserNotifications();
      setNotifications(userNotifications);
      
      // Count unread notifications
      const unread = userNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count if needed
      const wasUnread = notifications.find(n => n.id === id)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bill_update':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'vote':
        return <Users className="w-5 h-5 text-green-500" />;
      case 'tracking':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'representative':
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-gray-900 font-medium mb-1">No notifications</h4>
                <p className="text-gray-500 text-sm">
                  You'll receive notifications about bill updates and activity here.
                </p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                asChild
              >
                <a href="/settings/notifications">
                  <Settings className="w-3 h-3 mr-1" />
                  Notification Settings
                </a>
              </Button>
              
              <span className="text-xs text-gray-500 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Updated just now
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};