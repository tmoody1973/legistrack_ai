import { supabase, handleSupabaseError } from '../lib/supabase'

export class AnalyticsService {
  static async getUserEngagementStats(userId: string) {
    try {
      console.log('📊 Fetching user engagement stats for:', userId)
      
      // Add error handling for missing userId
      if (!userId) {
        console.warn('⚠️ No userId provided for engagement stats')
        return {
          billsViewed: 0,
          billsTracked: 0,
          representativesContacted: 0,
          timeOnPlatform: 0
        }
      }

      // Use Promise.allSettled to handle partial failures gracefully
      const [billsResult, activitiesResult, recentActivitiesResult] = await Promise.allSettled([
        supabase
          .from('user_tracked_bills')
          .select('count')
          .eq('user_id', userId)
          .single(),
        
        supabase
          .from('user_activities')
          .select('count')
          .eq('user_id', userId)
          .single(),
        
        supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Extract results with fallbacks
      const billsTracked = billsResult.status === 'fulfilled' && !billsResult.value.error 
        ? billsResult.value.data?.count || 0 
        : 0

      const totalActivities = activitiesResult.status === 'fulfilled' && !activitiesResult.value.error
        ? activitiesResult.value.data?.count || 0
        : 0

      const recentActivities = recentActivitiesResult.status === 'fulfilled' && !recentActivitiesResult.value.error
        ? recentActivitiesResult.value.data || []
        : []

      // Log any errors but don't fail completely
      if (billsResult.status === 'rejected') {
        console.warn('⚠️ Failed to fetch tracked bills count:', billsResult.reason)
      }
      if (activitiesResult.status === 'rejected') {
        console.warn('⚠️ Failed to fetch activities count:', activitiesResult.reason)
      }
      if (recentActivitiesResult.status === 'rejected') {
        console.warn('⚠️ Failed to fetch recent activities:', recentActivitiesResult.reason)
      }

      // Get view count from tracked bills
      let billsViewed = 0;
      try {
        const { data: trackedBills, error: trackedError } = await supabase
          .from('user_tracked_bills')
          .select('view_count')
          .eq('user_id', userId);
          
        if (!trackedError && trackedBills) {
          billsViewed = trackedBills.reduce((sum, bill) => sum + (bill.view_count || 0), 0);
        }
      } catch (error) {
        console.warn('⚠️ Failed to calculate bills viewed:', error);
      }

      // Get actual tracked bills count
      let actualBillsTracked = 0;
      try {
        const { data: trackedBillsCount, error: countError } = await supabase
          .from('user_tracked_bills')
          .select('bill_id')
          .eq('user_id', userId);
          
        if (!countError && trackedBillsCount) {
          actualBillsTracked = trackedBillsCount.length;
        }
      } catch (error) {
        console.warn('⚠️ Failed to get actual tracked bills count:', error);
      }

      // Calculate time on platform (default to 30 minutes if not available)
      // In a real app, this would be calculated from session data
      const timeOnPlatform = 30; // Default to 30 minutes for demonstration

      const stats = {
        billsViewed,
        billsTracked: actualBillsTracked,
        representativesContacted: Math.min(3, Math.floor(totalActivities / 5)), // Estimate based on activities
        timeOnPlatform
      }

      console.log('✅ User engagement stats fetched successfully:', stats)
      return stats

    } catch (error) {
      console.error('❌ Error fetching user engagement stats:', error)
      const enhancedError = handleSupabaseError(error, 'getUserEngagementStats')
      
      // Return default values instead of throwing
      return {
        billsViewed: 0,
        billsTracked: 0,
        representativesContacted: 0,
        timeOnPlatform: 0,
        error: enhancedError.userMessage
      }
    }
  }

  static async trackUserActivity(userId: string, activityType: string, targetId?: string, targetType?: string, details?: any) {
    try {
      console.log('📝 Tracking user activity:', { userId, activityType, targetId, targetType })
      
      if (!userId) {
        console.warn('⚠️ No userId provided for activity tracking')
        return null
      }

      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          target_id: targetId,
          target_type: targetType,
          details: details || {},
          session_id: crypto.randomUUID()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error tracking user activity:', error)
        handleSupabaseError(error, 'trackUserActivity')
        return null
      }

      console.log('✅ User activity tracked successfully:', data)
      return data

    } catch (error) {
      console.error('❌ Error in trackUserActivity:', error)
      handleSupabaseError(error, 'trackUserActivity')
      return null
    }
  }

  static async getUserActivityHistory(userId: string, limit = 50) {
    try {
      console.log('📚 Fetching user activity history for:', userId)
      
      if (!userId) {
        console.warn('⚠️ No userId provided for activity history')
        return []
      }

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Error fetching user activity history:', error)
        handleSupabaseError(error, 'getUserActivityHistory')
        return []
      }

      console.log('✅ User activity history fetched successfully:', data?.length, 'activities')
      return data || []

    } catch (error) {
      console.error('❌ Error in getUserActivityHistory:', error)
      handleSupabaseError(error, 'getUserActivityHistory')
      return []
    }
  }

  static async getSystemStats() {
    try {
      console.log('📈 Fetching system statistics...')

      const [usersResult, billsResult, activitiesResult] = await Promise.allSettled([
        supabase.from('users').select('count').single(),
        supabase.from('bills').select('count').single(),
        supabase.from('user_activities').select('count').single()
      ])

      const totalUsers = usersResult.status === 'fulfilled' && !usersResult.value.error
        ? usersResult.value.data?.count || 0
        : 0

      const totalBills = billsResult.status === 'fulfilled' && !billsResult.value.error
        ? billsResult.value.data?.count || 0
        : 0

      const totalActivities = activitiesResult.status === 'fulfilled' && !activitiesResult.value.error
        ? activitiesResult.value.data?.count || 0
        : 0

      const stats = {
        totalUsers,
        totalBills,
        totalActivities,
        lastUpdated: new Date().toISOString()
      }

      console.log('✅ System statistics fetched successfully:', stats)
      return stats

    } catch (error) {
      console.error('❌ Error fetching system stats:', error)
      handleSupabaseError(error, 'getSystemStats')
      
      return {
        totalUsers: 0,
        totalBills: 0,
        totalActivities: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch system statistics'
      }
    }
  }

  // Helper method to record bill views
  static async recordBillView(userId: string, billId: string) {
    try {
      return await this.trackUserActivity(userId, 'view_bill', billId, 'bill');
    } catch (error) {
      console.warn('Error recording bill view:', error);
      return null;
    }
  }
}

// Export an instance of the AnalyticsService class
export const analyticsService = new AnalyticsService();