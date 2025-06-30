import { supabase } from '../lib/supabase';
import { billService } from './billService';
import { AnalyticsService } from './analyticsService';
import type { Bill } from '../types';

interface TrackedBillWithSettings extends Bill {
  tracking: {
    tracked_at: string;
    notification_settings: {
      statusChanges: boolean;
      votingUpdates: boolean;
      aiInsights: boolean;
      majorMilestones: boolean;
    };
    user_notes?: string;
    user_tags: string[];
    view_count: number;
    last_viewed?: string;
  };
}

class TrackingService {
  // Enhanced track bill with auto-database storage
  async trackBill(billId: string, options: {
    notification_settings?: any;
    user_notes?: string;
    user_tags?: string[];
  } = {}): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to track bills');
      }

      console.log('🔄 Tracking bill:', billId, 'for user:', user.id);

      // CRITICAL: Ensure bill exists in database before tracking
      console.log('📥 Ensuring bill exists in database before tracking...');
      const bill = await billService.ensureBillInDatabase(billId);
      
      if (!bill) {
        throw new Error('Could not find or fetch bill data. Please try again.');
      }

      console.log('✅ Bill confirmed in database, proceeding with tracking...');

      const trackingData = {
        user_id: user.id,
        bill_id: billId,
        notification_settings: options.notification_settings || {
          statusChanges: true,
          votingUpdates: true,
          aiInsights: false,
          majorMilestones: true,
        },
        user_notes: options.user_notes,
        user_tags: options.user_tags || [],
        tracked_at: new Date().toISOString(),
        last_viewed: new Date().toISOString(),
        view_count: 1,
      };

      const { error } = await supabase
        .from('user_tracked_bills')
        .upsert(trackingData, { onConflict: 'user_id,bill_id' });

      if (error) {
        console.error('❌ Error tracking bill:', error);
        throw error;
      }

      console.log('✅ Bill tracked successfully:', billId);
    } catch (error) {
      console.error('❌ Error tracking bill:', error);
      throw error;
    }
  }

  // Untrack a bill
  async untrackBill(billId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      console.log('🔄 Untracking bill:', billId, 'for user:', user.id);

      const { error } = await supabase
        .from('user_tracked_bills')
        .delete()
        .eq('user_id', user.id)
        .eq('bill_id', billId);

      if (error) {
        console.error('❌ Error untracking bill:', error);
        throw error;
      }

      console.log('✅ Bill untracked successfully:', billId);
    } catch (error) {
      console.error('❌ Error untracking bill:', error);
      throw error;
    }
  }

  // Get all tracked bills for the current user
  async getTrackedBills(): Promise<TrackedBillWithSettings[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No authenticated user for getTrackedBills');
        return [];
      }

      console.log('🔍 Getting tracked bills for user:', user.id);

      const { data, error } = await supabase
        .from('user_tracked_bills')
        .select(`
          *,
          bills (*)
        `)
        .eq('user_id', user.id)
        .order('tracked_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching tracked bills:', error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} tracked bills`);

      // Transform the data to match our interface
      const trackedBills = (data || [])
        .filter(item => item.bills) // Only include items where the bill still exists
        .map(item => ({
          ...item.bills,
          tracking: {
            tracked_at: item.tracked_at,
            notification_settings: item.notification_settings,
            user_notes: item.user_notes,
            user_tags: item.user_tags || [],
            view_count: item.view_count || 1,
            last_viewed: item.last_viewed,
          }
        }));

      return trackedBills;
    } catch (error) {
      console.error('❌ Error fetching tracked bills:', error);
      return [];
    }
  }

  // Check if a bill is tracked by the current user
  async isBillTracked(billId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_tracked_bills')
        .select('bill_id')
        .eq('user_id', user.id)
        .eq('bill_id', billId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking if bill is tracked:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error checking if bill is tracked:', error);
      return false;
    }
  }

  // Update notification settings for a tracked bill
  async updateNotificationSettings(billId: string, settings: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('user_tracked_bills')
        .update({ 
          notification_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('bill_id', billId);

      if (error) {
        throw error;
      }

      console.log('✅ Notification settings updated for bill:', billId);
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      throw error;
    }
  }

  // Update user notes and tags for a tracked bill
  async updateBillNotes(billId: string, notes: string, tags: string[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('user_tracked_bills')
        .update({ 
          user_notes: notes,
          user_tags: tags,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('bill_id', billId);

      if (error) {
        throw error;
      }

      console.log('✅ Bill notes updated:', billId);
    } catch (error) {
      console.error('❌ Error updating bill notes:', error);
      throw error;
    }
  }

  // Enhanced record bill view with auto-database storage
  async recordBillView(billId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return; // Don't track views for unauthenticated users
      }

      // Ensure bill exists in database when viewed
      await billService.ensureBillInDatabase(billId);

      // Check if bill is tracked, and if so, update view count
      const { data: trackedBill } = await supabase
        .from('user_tracked_bills')
        .select('view_count')
        .eq('user_id', user.id)
        .eq('bill_id', billId)
        .maybeSingle();

      if (trackedBill) {
        // Update view count and last viewed time for tracked bills
        const { error: updateError } = await supabase
          .from('user_tracked_bills')
          .update({ 
            view_count: (trackedBill.view_count || 0) + 1,
            last_viewed: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('bill_id', billId);

        if (updateError) {
          console.warn('Could not update view count:', updateError);
        }
      }

      // Also log the activity for analytics using static method
      await AnalyticsService.recordBillView(user.id, billId);
    } catch (error) {
      console.warn('Error recording bill view:', error);
      // Don't throw - this is just analytics
    }
  }

  // Get tracking statistics for dashboard
  async getTrackingStats(): Promise<{
    totalTracked: number;
    totalViews: number;
    recentActivity: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { totalTracked: 0, totalViews: 0, recentActivity: 0 };
      }

      const trackedBills = await this.getTrackedBills();
      const totalTracked = trackedBills.length;
      const totalViews = trackedBills.reduce((sum, bill) => sum + (bill.tracking?.view_count || 0), 0);
      
      // Count recent activity (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const recentActivity = trackedBills.filter(bill => 
        new Date(bill.tracking.tracked_at) > weekAgo
      ).length;

      return {
        totalTracked,
        totalViews,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      return { totalTracked: 0, totalViews: 0, recentActivity: 0 };
    }
  }
}

export const trackingService = new TrackingService();