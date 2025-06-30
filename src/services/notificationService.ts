import { supabase } from '../lib/supabase';

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

class NotificationService {
  /**
   * Get notifications for the current user
   * @param limit Maximum number of notifications to return
   * @returns Array of notifications
   */
  async getUserNotifications(limit = 20): Promise<Notification[]> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to get notifications');
      }

      // In a real app, this would fetch from a notifications table
      // For this demo, we'll generate mock notifications
      return this.getMockNotifications(limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * @param id Notification ID
   */
  async markAsRead(id: string): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to mark notifications as read');
      }

      // In a real app, this would update the notification in the database
      console.log(`Marked notification ${id} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to mark all notifications as read');
      }

      // In a real app, this would update all notifications in the database
      console.log('Marked all notifications as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param id Notification ID
   */
  async deleteNotification(id: string): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to delete notifications');
      }

      // In a real app, this would delete the notification from the database
      console.log(`Deleted notification ${id}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   * @param notification Notification to create
   */
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to create notifications');
      }

      // In a real app, this would create a new notification in the database
      console.log('Created new notification:', notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @returns Notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to get notification preferences');
      }

      // Get user preferences from database
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return data?.preferences?.notifications || {
        frequency: 'daily',
        email: true,
        push: false
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        frequency: 'daily',
        email: true,
        push: false
      };
    }
  }

  /**
   * Update user notification preferences
   * @param preferences New notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to update notification preferences');
      }

      // Get current user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      
      // Update preferences
      const updatedPreferences = {
        ...userData.preferences,
        notifications: preferences
      };
      
      // Save to database
      const { error } = await supabase
        .from('users')
        .update({ 
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Generate mock notifications for demo purposes
   * @param limit Maximum number of notifications to generate
   * @returns Array of mock notifications
   */
  private getMockNotifications(limit = 20): Notification[] {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'bill_update',
        title: 'Bill Status Update',
        message: 'HR 1234: Healthcare Access Act has moved to committee review.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        read: false,
        data: {
          billId: '118-HR-1234'
        }
      },
      {
        id: '2',
        type: 'vote',
        title: 'Upcoming Vote',
        message: 'S 567: Environmental Protection Bill is scheduled for a vote tomorrow.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        read: false,
        data: {
          billId: '118-S-567'
        }
      },
      {
        id: '3',
        type: 'tracking',
        title: 'Bill Tracking',
        message: 'You are now tracking HR 789: Education Funding Act.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        read: true,
        data: {
          billId: '118-HR-789'
        }
      },
      {
        id: '4',
        type: 'representative',
        title: 'Representative Update',
        message: 'Your representative John Smith has cosponsored a new bill.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        read: true,
        data: {
          representativeId: 'R000123'
        }
      },
      {
        id: '5',
        type: 'system',
        title: 'Welcome to LegisTrack AI',
        message: 'Thank you for joining! Complete your profile to get personalized recommendations.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        read: true
      }
    ];
    
    return mockNotifications.slice(0, limit);
  }
}

export const notificationService = new NotificationService();