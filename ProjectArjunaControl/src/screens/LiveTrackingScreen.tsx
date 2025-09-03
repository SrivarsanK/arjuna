import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, MissionStatus, MissionPriority } from '../constants';
import { useMissions } from '../hooks/useMissions';
import { useAuth } from '../hooks/useAuth';
import { Mission, MissionTracking, MissionLog } from '../types';
import { MissionService } from '../services/missionService';

export const LiveTrackingScreen: React.FC = () => {
  const { user } = useAuth();
  const { missions, loading, loadMissions } = useMissions();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [trackingData, setTrackingData] = useState<MissionTracking[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedMission) return;

    // Subscribe to tracking updates for selected mission
    const trackingSubscription = MissionService.subscribeMissionTracking(
      selectedMission.id,
      (payload) => {
        console.log('New tracking data:', payload);
        if (payload.new) {
          setTrackingData(prev => [payload.new, ...prev]);
        }
      }
    );

    // Subscribe to mission status updates
    const missionSubscription = MissionService.subscribeMissionUpdates((payload) => {
      console.log('Mission update:', payload);
      if (payload.new && payload.new.id === selectedMission.id) {
        setSelectedMission(payload.new);
        // Reload missions to update the list
        loadMissions();
      }
    });

    return () => {
      trackingSubscription?.unsubscribe();
      missionSubscription?.unsubscribe();
    };
  }, [selectedMission?.id, loadMissions]);

  // Filter active missions only
  const activeMissions = missions.filter(
    mission => mission.status === 'active' || mission.status === 'pending'
  );

  // Load tracking data for selected mission
  const loadTrackingData = async (missionId: string) => {
    try {
      setTrackingLoading(true);
      
      // Load real tracking data from Supabase
      const trackingResult = await MissionService.getMissionTracking(missionId);
      const logsResult = await MissionService.getMissionLogs(missionId);
      
      setTrackingData(trackingResult || []);
      setMissionLogs(logsResult || []);
      
      // If no tracking data exists, create some sample data for demo
      if (!trackingResult || trackingResult.length === 0) {
        const mockTrackingData: MissionTracking[] = [
          {
            id: '1',
            mission_id: missionId,
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 150,
            battery_level: 85,
            speed: 25.5,
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            mission_id: missionId,
            latitude: 40.7130,
            longitude: -74.0058,
            altitude: 152,
            battery_level: 83,
            speed: 24.2,
            timestamp: new Date(Date.now() - 30000).toISOString(),
          },
        ];
        setTrackingData(mockTrackingData);
      }
      
      // If no logs exist, create some sample logs for demo
      if (!logsResult || logsResult.length === 0) {
        const mockLogs: MissionLog[] = [
          {
            id: '1',
            mission_id: missionId,
            event_type: 'takeoff',
            description: 'Drone takeoff initiated from base station',
            timestamp: new Date(Date.now() - 120000).toISOString(),
          },
          {
            id: '2',
            mission_id: missionId,
            event_type: 'navigation',
            description: 'Route to target location calculated and confirmed',
            timestamp: new Date(Date.now() - 90000).toISOString(),
          },
          {
            id: '3',
            mission_id: missionId,
            event_type: 'location_update',
            description: 'Approaching target coordinates',
            timestamp: new Date(Date.now() - 30000).toISOString(),
          },
        ];
        setMissionLogs(mockLogs);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      Alert.alert('Error', 'Failed to load tracking data');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Handle mission selection
  const handleMissionSelect = (mission: Mission) => {
    setSelectedMission(mission);
    loadTrackingData(mission.id);
  };

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMissions();
    if (selectedMission) {
      await loadTrackingData(selectedMission.id);
    }
    setRefreshing(false);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'in_progress': return Colors.secondary;
      case 'completed': return Colors.success;
      case 'failed': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'LOW': return Colors.success;
      case 'MEDIUM': return Colors.warning;
      case 'HIGH': return Colors.accent;
      case 'CRITICAL': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format coordinates
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Mission Tracking</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={Colors.text} 
            style={refreshing ? styles.spinning : undefined}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Active Missions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Missions</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : activeMissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="airplane" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No active missions</Text>
              <Text style={styles.emptySubtext}>
                Create a new mission to start tracking
              </Text>
            </View>
          ) : (
            activeMissions.map((mission) => (
              <TouchableOpacity
                key={mission.id}
                style={[
                  styles.missionCard,
                  selectedMission?.id === mission.id && styles.selectedCard
                ]}
                onPress={() => handleMissionSelect(mission)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.missionName}>{mission.recipient_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) }]}>
                    <Text style={styles.statusText}>{mission.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.missionDetail}>
                    Supply: {mission.supply_type}
                  </Text>
                  <Text style={styles.missionDetail}>
                    Priority: 
                    <Text style={{ color: getPriorityColor(mission.priority) }}>
                      {' '}{mission.priority}
                    </Text>
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.missionTime}>
                    Created: {new Date(mission.created_at).toLocaleTimeString()}
                  </Text>
                  {selectedMission?.id === mission.id && (
                    <Ionicons name="chevron-up" size={20} color={Colors.secondary} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Mission Tracking Details */}
        {selectedMission && (
          <>
            {/* Real-time Data */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Real-time Data</Text>
              
              {trackingLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : trackingData.length > 0 ? (
                <View style={styles.dataGrid}>
                  <View style={styles.dataCard}>
                    <Ionicons name="location" size={20} color={Colors.secondary} />
                    <Text style={styles.dataLabel}>Position</Text>
                    <Text style={styles.dataValue}>
                      {formatCoordinates(trackingData[0].latitude, trackingData[0].longitude)}
                    </Text>
                  </View>

                  <View style={styles.dataCard}>
                    <Ionicons name="trending-up" size={20} color={Colors.accent} />
                    <Text style={styles.dataLabel}>Altitude</Text>
                    <Text style={styles.dataValue}>{trackingData[0].altitude}m</Text>
                  </View>

                  <View style={styles.dataCard}>
                    <Ionicons name="battery-half" size={20} color={Colors.success} />
                    <Text style={styles.dataLabel}>Battery</Text>
                    <Text style={styles.dataValue}>{trackingData[0].battery_level}%</Text>
                  </View>

                  <View style={styles.dataCard}>
                    <Ionicons name="speedometer" size={20} color={Colors.warning} />
                    <Text style={styles.dataLabel}>Speed</Text>
                    <Text style={styles.dataValue}>{trackingData[0].speed} km/h</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noData}>No tracking data available</Text>
              )}
            </View>

            {/* Mission Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mission Timeline</Text>
              
              {missionLogs.length > 0 ? (
                <View style={styles.timeline}>
                  {missionLogs.map((log, index) => (
                    <View key={log.id} style={styles.timelineItem}>
                      <View style={styles.timelineMarker}>
                        <View style={[styles.timelineDot, index === 0 && styles.activeDot]} />
                        {index < missionLogs.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <Text style={styles.timelineEventType}>{log.event_type}</Text>
                          <Text style={styles.timelineTime}>{formatTime(log.timestamp)}</Text>
                        </View>
                        <Text style={styles.timelineDescription}>{log.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noData}>No mission logs available</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.text,
  },
  spinning: {
    // Add animation if needed
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headerSmall,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  missionCard: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedCard: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '10',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  missionName: {
    ...Typography.headerSmall,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardContent: {
    marginBottom: Spacing.sm,
  },
  missionDetail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataCard: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    width: '48%',
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dataLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dataValue: {
    ...Typography.headerSmall,
    color: Colors.text,
    marginTop: Spacing.xs,
    fontWeight: 'bold',
  },
  noData: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  timeline: {
    paddingLeft: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  activeDot: {
    backgroundColor: Colors.secondary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  timelineEventType: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  timelineTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  timelineDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
