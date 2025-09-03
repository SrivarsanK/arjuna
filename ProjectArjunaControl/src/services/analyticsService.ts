import { Mission, MissionLog, MissionTracking } from '../types';
import { supabase } from './supabaseClient';

export interface MissionAnalytics {
  totalMissions: number;
  completedMissions: number;
  failedMissions: number;
  successRate: number;
  averageCompletionTime: number; // in minutes
  averageDeliveryDistance: number; // in km
  mostRequestedSupplyType: string;
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  weeklyTrends: Array<{
    week: string;
    missions: number;
    successRate: number;
  }>;
  topPerformingRoutes: Array<{
    routeId: string;
    successRate: number;
    averageTime: number;
  }>;
}

export interface TeamAnalytics {
  teamId: string;
  teamName?: string;
  totalMissions: number;
  completedMissions: number;
  successRate: number;
  averageResponseTime: number; // in minutes
  activeMissions: number;
  lastMissionDate: string;
}

export interface RealTimeMetrics {
  activeMissions: number;
  dronesInFlight: number;
  emergencyMissions: number;
  averageFlightTime: number;
  batteryLevels: Array<{
    missionId: string;
    batteryLevel: number;
  }>;
  systemStatus: 'operational' | 'warning' | 'critical';
}

export class AnalyticsService {
  // Get comprehensive mission analytics
  static async getMissionAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<MissionAnalytics> {
    try {
      let query = supabase
        .from('missions')
        .select('*');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: missions, error } = await query;

      if (error) throw error;
      if (!missions) throw new Error('No mission data found');

      return this.calculateMissionAnalytics(missions);
    } catch (error) {
      console.error('Error fetching mission analytics:', error);
      throw error;
    }
  }

  // Calculate analytics from mission data
  private static calculateMissionAnalytics(missions: Mission[]): MissionAnalytics {
    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'completed').length;
    const failedMissions = missions.filter(m => m.status === 'failed').length;
    const successRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

    // Calculate priority distribution
    const priorityDistribution = missions.reduce((acc, mission) => {
      acc[mission.priority] = (acc[mission.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate status distribution
    const statusDistribution = missions.reduce((acc, mission) => {
      acc[mission.status] = (acc[mission.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most requested supply type
    const supplyTypeCount = missions.reduce((acc, mission) => {
      acc[mission.supply_type] = (acc[mission.supply_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostRequestedSupplyType = Object.entries(supplyTypeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Calculate weekly trends (last 8 weeks)
    const weeklyTrends = this.calculateWeeklyTrends(missions);

    return {
      totalMissions,
      completedMissions,
      failedMissions,
      successRate: Math.round(successRate * 100) / 100,
      averageCompletionTime: this.calculateAverageCompletionTime(missions),
      averageDeliveryDistance: this.calculateAverageDeliveryDistance(missions),
      mostRequestedSupplyType,
      priorityDistribution,
      statusDistribution,
      weeklyTrends,
      topPerformingRoutes: [], // TODO: Implement route tracking
    };
  }

  // Calculate weekly trends
  private static calculateWeeklyTrends(missions: Mission[]) {
    const weeks: Record<string, { missions: number; completed: number }> = {};
    const now = new Date();

    // Group missions by week
    missions.forEach(mission => {
      const missionDate = new Date(mission.created_at);
      const weekStart = new Date(missionDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { missions: 0, completed: 0 };
      }

      weeks[weekKey].missions++;
      if (mission.status === 'completed') {
        weeks[weekKey].completed++;
      }
    });

    // Convert to array and calculate success rates
    return Object.entries(weeks)
      .map(([week, data]) => ({
        week,
        missions: data.missions,
        successRate: data.missions > 0 ? (data.completed / data.missions) * 100 : 0,
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-8); // Last 8 weeks
  }

  // Calculate average completion time
  private static calculateAverageCompletionTime(missions: Mission[]): number {
    const completedMissions = missions.filter(m => m.status === 'completed');
    
    if (completedMissions.length === 0) return 0;

    const totalTime = completedMissions.reduce((acc, mission) => {
      const created = new Date(mission.created_at);
      const updated = new Date(mission.updated_at);
      const diffMinutes = (updated.getTime() - created.getTime()) / (1000 * 60);
      return acc + diffMinutes;
    }, 0);

    return Math.round((totalTime / completedMissions.length) * 100) / 100;
  }

  // Calculate average delivery distance (mock implementation)
  private static calculateAverageDeliveryDistance(missions: Mission[]): number {
    // TODO: Implement actual distance calculation using GPS coordinates
    // For now, return a mock value based on mission count
    const completedMissions = missions.filter(m => m.status === 'completed');
    if (completedMissions.length === 0) return 0;
    
    // Mock calculation: average distance between 2-15 km
    return Math.round((Math.random() * 13 + 2) * 100) / 100;
  }

  // Get team analytics
  static async getTeamAnalytics(): Promise<TeamAnalytics[]> {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .not('rescue_team_id', 'is', null);

      if (profileError) throw profileError;

      const teamAnalytics: Record<string, TeamAnalytics> = {};

      // Group profiles by team
      profiles?.forEach(profile => {
        if (profile.rescue_team_id && !teamAnalytics[profile.rescue_team_id]) {
          teamAnalytics[profile.rescue_team_id] = {
            teamId: profile.rescue_team_id,
            teamName: `Team ${profile.rescue_team_id}`,
            totalMissions: 0,
            completedMissions: 0,
            successRate: 0,
            averageResponseTime: 0,
            activeMissions: 0,
            lastMissionDate: '',
          };
        }
      });

      // Get mission data for each team
      for (const teamId of Object.keys(teamAnalytics)) {
        const { data: teamMissions } = await supabase
          .from('missions')
          .select('*')
          .in('created_by', profiles?.filter(p => p.rescue_team_id === teamId).map(p => p.id) || []);

        if (teamMissions) {
          const analytics = teamAnalytics[teamId];
          analytics.totalMissions = teamMissions.length;
          analytics.completedMissions = teamMissions.filter(m => m.status === 'completed').length;
          analytics.successRate = analytics.totalMissions > 0 
            ? (analytics.completedMissions / analytics.totalMissions) * 100 
            : 0;
          analytics.activeMissions = teamMissions.filter(m => m.status === 'active').length;
          analytics.lastMissionDate = teamMissions.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]?.created_at || '';
          analytics.averageResponseTime = this.calculateAverageCompletionTime(teamMissions);
        }
      }

      return Object.values(teamAnalytics);
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      throw error;
    }
  }

  // Get real-time metrics
  static async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      // Get active missions
      const { data: activeMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('status', 'active');

      if (missionsError) throw missionsError;

      // Get latest tracking data for battery levels
      const { data: trackingData, error: trackingError } = await supabase
        .from('mission_tracking')
        .select('*')
        .in('mission_id', activeMissions?.map(m => m.id) || [])
        .order('timestamp', { ascending: false });

      if (trackingError) throw trackingError;

      // Group tracking data by mission and get latest for each
      const latestTracking: Record<string, MissionTracking> = {};
      trackingData?.forEach(track => {
        if (!latestTracking[track.mission_id] || 
            new Date(track.timestamp) > new Date(latestTracking[track.mission_id].timestamp)) {
          latestTracking[track.mission_id] = track;
        }
      });

      const batteryLevels = Object.values(latestTracking).map(track => ({
        missionId: track.mission_id,
        batteryLevel: track.battery_level,
      }));

      // Calculate system status
      const emergencyMissions = activeMissions?.filter(m => m.priority === 'emergency').length || 0;
      const lowBatteryCount = batteryLevels.filter(b => b.batteryLevel < 20).length;
      
      let systemStatus: 'operational' | 'warning' | 'critical' = 'operational';
      if (emergencyMissions > 0 || lowBatteryCount > 0) {
        systemStatus = 'warning';
      }
      if (emergencyMissions > 2 || lowBatteryCount > 3) {
        systemStatus = 'critical';
      }

      return {
        activeMissions: activeMissions?.length || 0,
        dronesInFlight: Object.keys(latestTracking).length,
        emergencyMissions,
        averageFlightTime: this.calculateAverageFlightTime(Object.values(latestTracking)),
        batteryLevels,
        systemStatus,
      };
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  // Calculate average flight time for active missions
  private static calculateAverageFlightTime(trackingData: MissionTracking[]): number {
    if (trackingData.length === 0) return 0;

    const totalMinutes = trackingData.reduce((acc, track) => {
      const flightTime = (new Date().getTime() - new Date(track.timestamp).getTime()) / (1000 * 60);
      return acc + flightTime;
    }, 0);

    return Math.round((totalMinutes / trackingData.length) * 100) / 100;
  }

  // Export analytics data to CSV format
  static exportAnalyticsToCSV(analytics: MissionAnalytics): string {
    const csvRows = [
      'Metric,Value',
      `Total Missions,${analytics.totalMissions}`,
      `Completed Missions,${analytics.completedMissions}`,
      `Failed Missions,${analytics.failedMissions}`,
      `Success Rate,${analytics.successRate}%`,
      `Average Completion Time,${analytics.averageCompletionTime} minutes`,
      `Average Delivery Distance,${analytics.averageDeliveryDistance} km`,
      `Most Requested Supply,${analytics.mostRequestedSupplyType}`,
      '',
      'Priority Distribution',
      ...Object.entries(analytics.priorityDistribution).map(([priority, count]) => 
        `${priority},${count}`
      ),
      '',
      'Status Distribution',
      ...Object.entries(analytics.statusDistribution).map(([status, count]) => 
        `${status},${count}`
      ),
    ];

    return csvRows.join('\n');
  }
}
