import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../constants';
import { AnalyticsService, MissionAnalytics, TeamAnalytics, RealTimeMetrics } from '../services/analyticsService';
import { OfflineDataManager } from '../services/offlineDataManager';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color = Colors.primary, trend }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    {trend && (
      <Text style={[styles.trendIndicator, { 
        color: trend === 'up' ? Colors.success : trend === 'down' ? Colors.danger : Colors.textSecondary 
      }]}>
        {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
      </Text>
    )}
  </View>
);

interface ChartBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}

const ChartBar: React.FC<ChartBarProps> = ({ label, value, maxValue, color = Colors.primary }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <View style={styles.chartBarContainer}>
      <Text style={styles.chartBarLabel}>{label}</Text>
      <View style={styles.chartBarTrack}>
        <View 
          style={[
            styles.chartBarFill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: color 
            }
          ]} 
        />
      </View>
      <Text style={styles.chartBarValue}>{value}</Text>
    </View>
  );
};

export const AnalyticsScreen: React.FC = () => {
  const [analytics, setAnalytics] = useState<MissionAnalytics | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    
    // Set up real-time metrics refresh
    const interval = setInterval(() => {
      loadRealTimeMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Check if online
      const isOnline = await OfflineDataManager.syncIfOnline();
      setIsOffline(!isOnline);

      if (isOnline) {
        await loadOnlineAnalytics();
      } else {
        await loadOfflineAnalytics();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineAnalytics = async () => {
    const endDate = new Date().toISOString();
    const startDate = getStartDateForRange(selectedTimeRange);

    const [analyticsData, teamData, realTimeData] = await Promise.all([
      AnalyticsService.getMissionAnalytics(startDate, endDate),
      AnalyticsService.getTeamAnalytics(),
      AnalyticsService.getRealTimeMetrics(),
    ]);

    setAnalytics(analyticsData);
    setTeamAnalytics(teamData);
    setRealTimeMetrics(realTimeData);
  };

  const loadOfflineAnalytics = async () => {
    const cachedMissions = await OfflineDataManager.getCachedMissions();
    
    if (cachedMissions.length > 0) {
      // Calculate basic analytics from cached data
      const filteredMissions = filterMissionsByTimeRange(cachedMissions, selectedTimeRange);
      const basicAnalytics = calculateBasicAnalytics(filteredMissions);
      setAnalytics(basicAnalytics);
    }
  };

  const loadRealTimeMetrics = async () => {
    try {
      const isOnline = await OfflineDataManager.syncIfOnline();
      if (isOnline) {
        const realTimeData = await AnalyticsService.getRealTimeMetrics();
        setRealTimeMetrics(realTimeData);
      }
    } catch (error) {
      console.error('Error loading real-time metrics:', error);
    }
  };

  const getStartDateForRange = (range: 'week' | 'month' | 'quarter'): string => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
    }
    
    return start.toISOString();
  };

  const filterMissionsByTimeRange = (missions: any[], range: 'week' | 'month' | 'quarter') => {
    const startDate = getStartDateForRange(range);
    return missions.filter(mission => mission.created_at >= startDate);
  };

  const calculateBasicAnalytics = (missions: any[]): MissionAnalytics => {
    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'completed').length;
    const failedMissions = missions.filter(m => m.status === 'failed').length;
    const successRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

    const priorityDistribution = missions.reduce((acc, mission) => {
      acc[mission.priority] = (acc[mission.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = missions.reduce((acc, mission) => {
      acc[mission.status] = (acc[mission.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const supplyTypeCount = missions.reduce((acc, mission) => {
      acc[mission.supply_type] = (acc[mission.supply_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostRequestedSupplyType = Object.entries(supplyTypeCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

    return {
      totalMissions,
      completedMissions,
      failedMissions,
      successRate: Math.round(successRate * 100) / 100,
      averageCompletionTime: 0, // Would need additional data to calculate
      averageDeliveryDistance: 0, // Would need GPS data to calculate
      mostRequestedSupplyType,
      priorityDistribution,
      statusDistribution,
      weeklyTrends: [],
      topPerformingRoutes: [],
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const csvData = AnalyticsService.exportAnalyticsToCSV(analytics);
    
    Alert.alert(
      'Export Analytics',
      'Analytics data has been prepared for export.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Share', 
          onPress: () => {
            // TODO: Implement share functionality
            console.log('CSV Data:', csvData);
          }
        }
      ]
    );
  };

  const getSystemStatusColor = (status?: string) => {
    switch (status) {
      case 'operational': return Colors.success;
      case 'warning': return Colors.warning;
      case 'critical': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mission Analytics</Text>
        {isOffline && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['week', 'month', 'quarter'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              selectedTimeRange === range && styles.timeRangeButtonTextActive
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Real-Time Status */}
        {realTimeMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Status</Text>
            <View style={styles.statusContainer}>
              <MetricCard
                title="System Status"
                value={realTimeMetrics.systemStatus.toUpperCase()}
                color={getSystemStatusColor(realTimeMetrics.systemStatus)}
              />
              <MetricCard
                title="Active Missions"
                value={realTimeMetrics.activeMissions}
                color={Colors.accent}
              />
              <MetricCard
                title="Drones in Flight"
                value={realTimeMetrics.dronesInFlight}
                color={Colors.secondary}
              />
              <MetricCard
                title="Emergency Missions"
                value={realTimeMetrics.emergencyMissions}
                color={Colors.danger}
              />
            </View>
          </View>
        )}

        {/* Mission Overview */}
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mission Overview</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Missions"
                value={analytics.totalMissions}
                color={Colors.primary}
              />
              <MetricCard
                title="Completed"
                value={analytics.completedMissions}
                subtitle={`${analytics.successRate}% success rate`}
                color={Colors.success}
                trend="up"
              />
              <MetricCard
                title="Failed"
                value={analytics.failedMissions}
                color={Colors.danger}
              />
              <MetricCard
                title="Avg. Completion"
                value={`${analytics.averageCompletionTime}m`}
                color={Colors.accent}
              />
            </View>
          </View>
        )}

        {/* Priority Distribution */}
        {analytics && Object.keys(analytics.priorityDistribution).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority Distribution</Text>
            <View style={styles.chartContainer}>
              {Object.entries(analytics.priorityDistribution).map(([priority, count]) => {
                const maxCount = Math.max(...Object.values(analytics.priorityDistribution));
                const priorityColors = {
                  low: Colors.success,
                  medium: Colors.warning,
                  high: Colors.accent,
                  emergency: Colors.danger,
                };
                
                return (
                  <ChartBar
                    key={priority}
                    label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                    value={count}
                    maxValue={maxCount}
                    color={priorityColors[priority as keyof typeof priorityColors] || Colors.primary}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Supply Type Analysis */}
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supply Analysis</Text>
            <MetricCard
              title="Most Requested Supply"
              value={analytics.mostRequestedSupplyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              color={Colors.secondary}
            />
          </View>
        )}

        {/* Team Performance */}
        {teamAnalytics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Performance</Text>
            {teamAnalytics.slice(0, 3).map((team) => (
              <View key={team.teamId} style={styles.teamCard}>
                <Text style={styles.teamName}>{team.teamName}</Text>
                <View style={styles.teamMetrics}>
                  <Text style={styles.teamMetric}>
                    Missions: {team.totalMissions}
                  </Text>
                  <Text style={styles.teamMetric}>
                    Success: {team.successRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.teamMetric}>
                    Active: {team.activeMissions}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Export Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.exportButton} onPress={exportAnalytics}>
            <Text style={styles.exportButtonText}>Export Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headerMedium,
  },
  offlineIndicator: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  offlineText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeButtonText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  timeRangeButtonTextActive: {
    color: Colors.surface,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headerSmall,
    marginBottom: Spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    width: (width - Spacing.lg * 3) / 2,
    position: 'relative',
  },
  metricTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    ...Typography.headerMedium,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  trendIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
  },
  chartBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  chartBarLabel: {
    ...Typography.bodySmall,
    width: 80,
    marginRight: Spacing.sm,
  },
  chartBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  chartBarFill: {
    height: 8,
    borderRadius: 4,
  },
  chartBarValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  teamCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  teamName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  teamMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamMetric: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  exportButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  exportButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
