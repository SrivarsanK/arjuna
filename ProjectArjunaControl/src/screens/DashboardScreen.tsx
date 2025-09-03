import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Layout } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notificationService';
import { useMissions } from '../hooks/useMissions';

interface MissionStatsProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

const MissionStatsCard: React.FC<MissionStatsProps> = ({ title, value, icon, color, onPress }) => (
  <TouchableOpacity style={[styles.statsCard, { borderLeftColor: color }]} onPress={onPress}>
    <View style={styles.statsContent}>
      <View style={styles.statsIconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statsText}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

interface RecentMissionProps {
  id: string;
  recipientName: string;
  supplyType: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  timestamp: string;
  onPress?: () => void;
}

const RecentMissionItem: React.FC<RecentMissionProps> = ({
  recipientName,
  supplyType,
  status,
  priority,
  timestamp,
  onPress,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'active': return Colors.secondary;
      case 'completed': return Colors.success;
      case 'failed': return Colors.danger;
      case 'emergency': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'warning';
      case 'high': return 'arrow-up';
      case 'medium': return 'remove';
      case 'low': return 'arrow-down';
      default: return 'remove';
    }
  };

  return (
    <TouchableOpacity style={styles.missionItem} onPress={onPress}>
      <View style={styles.missionContent}>
        <View style={styles.missionHeader}>
          <Text style={styles.missionRecipient}>{recipientName}</Text>
          <View style={styles.missionMeta}>
            <Ionicons 
              name={getPriorityIcon(priority) as keyof typeof Ionicons.glyphMap} 
              size={16} 
              color={priority === 'emergency' ? Colors.danger : Colors.textSecondary} 
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.missionSupplyType}>{supplyType}</Text>
        <Text style={styles.missionTimestamp}>{timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { missions, stats, loading, error, loadMissions } = useMissions();
  const navigation = useNavigation();

  // Convert missions to recent missions format
  const recentMissions: RecentMissionProps[] = missions.slice(0, 3).map(mission => ({
    id: mission.id,
    recipientName: mission.recipient_name,
    supplyType: mission.supply_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    status: mission.status,
    priority: mission.priority,
    timestamp: getTimeAgo(mission.created_at),
  }));

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const handleEmergencyContact = () => {
    // Emergency contact functionality
    console.log('Emergency contact pressed');
  };

  const handleNewMission = () => {
    // Navigate to new mission screen
    navigation.navigate('NewMission' as never);
  };

  // Emergency control handlers
  const handleEmergencyAlert = async () => {
    try {
      await NotificationService.notifyEmergency(
        'emergency-alert',
        'All active missions have been flagged for emergency attention.'
      );
      Alert.alert('Emergency Alert', 'Emergency alert has been sent to all rescue teams.');
    } catch (error) {
      console.error('Emergency alert failed:', error);
      Alert.alert('Error', 'Failed to send emergency alert.');
    }
  };

  const handleAllStop = async () => {
    Alert.alert(
      'All Stop Command',
      'This will immediately halt all active drone operations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'STOP ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.notifyEmergency(
                'all-stop',
                'ALL STOP - All drone operations have been immediately halted.'
              );
              Alert.alert('All Stop', 'All drone operations have been halted.');
            } catch (error) {
              console.error('All stop command failed:', error);
              Alert.alert('Error', 'Failed to execute all stop command.');
            }
          }
        }
      ]
    );
  };

  const handleReturnToBase = async () => {
    Alert.alert(
      'Return to Base',
      'This will direct all active drones to return to their base locations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return All',
          onPress: async () => {
            try {
              await NotificationService.notifyEmergency(
                'return-to-base',
                'Return to Base - All active drones are returning to base locations.'
              );
              Alert.alert('Return to Base', 'All drones are returning to base.');
            } catch (error) {
              console.error('Return to base command failed:', error);
              Alert.alert('Error', 'Failed to execute return to base command.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.profile?.name || user?.email}</Text>
            {user?.profile?.rescue_team_id && (
              <Text style={styles.teamId}>Team: {user.profile.rescue_team_id}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyContact}>
            <Ionicons name="call" size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadMissions}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Mission Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mission Overview</Text>
          <View style={styles.statsGrid}>
            <MissionStatsCard
              title="Active Missions"
              value={stats.activeMissions}
              icon="radio"
              color={Colors.secondary}
            />
            <MissionStatsCard
              title="Completed Today"
              value={stats.completedToday}
              icon="checkmark-circle"
              color={Colors.success}
            />
            <MissionStatsCard
              title="Success Rate"
              value={stats.successRate}
              icon="trending-up"
              color={Colors.primary}
            />
            <MissionStatsCard
              title="Total Missions"
              value={stats.totalMissions}
              icon="layers"
              color={Colors.accent}
            />
          </View>
        </View>

        {/* Emergency Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mission Control</Text>
          <View style={styles.emergencyControls}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={() => Alert.alert('Emergency Alert', 'Broadcasting emergency alert to all active missions')}
            >
              <Ionicons name="warning" size={24} color={Colors.surface} />
              <Text style={styles.emergencyButtonText}>Emergency Alert</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => Alert.alert('All Stop', 'Sending stop command to all drones')}
            >
              <Ionicons name="stop-circle" size={20} color={Colors.danger} />
              <Text style={styles.controlButtonText}>All Stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => Alert.alert('Return to Base', 'Commanding all drones to return to base')}
            >
              <Ionicons name="home" size={20} color={Colors.secondary} />
              <Text style={styles.controlButtonText}>Return to Base</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleNewMission}>
              <Ionicons name="add-circle" size={32} color={Colors.primary} />
              <Text style={styles.quickActionText}>New Mission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="map" size={32} color={Colors.secondary} />
              <Text style={styles.quickActionText}>Live Tracking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="document-text" size={32} color={Colors.accent} />
              <Text style={styles.quickActionText}>Mission Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Missions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Missions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.missionsList}>
            {recentMissions.map((mission) => (
              <RecentMissionItem key={mission.id} {...mission} />
            ))}
            {recentMissions.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyStateText}>No recent missions</Text>
                <Text style={styles.emptyStateSubtext}>Create your first mission to get started</Text>
              </View>
            )}
          </View>
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
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  userName: {
    ...Typography.headerMedium,
    marginVertical: 2,
  },
  teamId: {
    ...Typography.caption,
    color: Colors.secondary,
    fontWeight: '600',
  },
  emergencyButton: {
    backgroundColor: Colors.danger,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginVertical: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headerSmall,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    flex: 1,
    minWidth: '45%',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIconContainer: {
    marginRight: Spacing.sm,
  },
  statsText: {
    flex: 1,
  },
  statsValue: {
    ...Typography.headerMedium,
    fontSize: 20,
    marginBottom: 2,
  },
  statsTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  quickActionText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  missionsList: {
    gap: Spacing.sm,
  },
  missionItem: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  missionContent: {
    gap: Spacing.xs,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionRecipient: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  missionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 10,
  },
  missionSupplyType: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  missionTimestamp: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  emptyStateText: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  emergencyControls: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.lg,
  },
  emergencyButtonText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlButton: {
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginHorizontal: Spacing.xs,
    flex: 1,
    alignItems: 'center',
  },
  controlButtonText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
  },
});
