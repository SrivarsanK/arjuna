import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notificationService';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);
  const [locationUpdatesEnabled, setLocationUpdatesEnabled] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Get current push token
    const token = NotificationService.getPushToken();
    setPushToken(token);
  }, []);

  // Emergency contact
  const handleEmergencyContact = () => {
    Alert.alert(
      'Emergency Contact',
      'Choose emergency contact method',
      [
        {
          text: 'Call Emergency Services',
          onPress: () => Linking.openURL('tel:911'),
        },
        {
          text: 'Call Mission Control',
          onPress: () => Linking.openURL('tel:+1-555-RESCUE'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Send test notification
  const handleTestNotification = async () => {
    await NotificationService.sendLocalNotification({
      missionId: 'test',
      type: 'status_update',
      title: 'Test Notification',
      body: 'This is a test notification from Project Arjuna Control',
      priority: 'normal',
    });
    Alert.alert('Success', 'Test notification sent!');
  };

  // Clear all notifications
  const handleClearNotifications = async () => {
    await NotificationService.clearAllNotifications();
    Alert.alert('Success', 'All notifications cleared!');
  };

  // Handle sign out
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color={Colors.surface} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.email || 'Unknown User'}</Text>
              <Text style={styles.userRole}>Emergency Response Operator</Text>
              <Text style={styles.userTeam}>Team Alpha - Rescue Division</Text>
            </View>
          </View>
        </View>

        {/* Emergency Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Controls</Text>
          
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyContact}
          >
            <Ionicons name="warning" size={24} color={Colors.surface} />
            <Text style={styles.emergencyButtonText}>Emergency Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Emergency Mode', 'Emergency mode protocols activated')}
          >
            <Ionicons name="flash" size={20} color={Colors.danger} />
            <Text style={styles.actionButtonText}>Activate Emergency Mode</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color={Colors.text} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.disabled, true: Colors.secondary }}
              thumbColor={notificationsEnabled ? Colors.surface : Colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="alert-circle" size={20} color={Colors.danger} />
              <Text style={styles.settingLabel}>Emergency Alerts</Text>
            </View>
            <Switch
              value={emergencyAlertsEnabled}
              onValueChange={setEmergencyAlertsEnabled}
              trackColor={{ false: Colors.disabled, true: Colors.danger }}
              thumbColor={emergencyAlertsEnabled ? Colors.surface : Colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="location" size={20} color={Colors.secondary} />
              <Text style={styles.settingLabel}>Location Updates</Text>
            </View>
            <Switch
              value={locationUpdatesEnabled}
              onValueChange={setLocationUpdatesEnabled}
              trackColor={{ false: Colors.disabled, true: Colors.secondary }}
              thumbColor={locationUpdatesEnabled ? Colors.surface : Colors.background}
            />
          </View>

          {/* Notification Actions */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTestNotification}
          >
            <Ionicons name="play" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Test Notification</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearNotifications}
          >
            <Ionicons name="trash" size={20} color={Colors.warning} />
            <Text style={styles.actionButtonText}>Clear All Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>v1.0.0 (Beta)</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Push Token</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {pushToken ? `${pushToken.substring(0, 20)}...` : 'Not available'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Sync</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Help', 'Help documentation coming soon')}
          >
            <Ionicons name="help-circle" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('About', 'Project Arjuna Control\nEmergency Drone Delivery System\n\nDeveloped for disaster rescue operations')}
          >
            <Ionicons name="information-circle" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color={Colors.danger} />
            <Text style={[styles.actionButtonText, { color: Colors.danger }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
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
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.headerMedium,
    color: Colors.text,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Typography.headerSmall,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  userRole: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userTeam: {
    ...Typography.bodySmall,
    color: Colors.secondary,
  },
  emergencyButton: {
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  emergencyButtonText: {
    ...Typography.button,
    color: Colors.surface,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  signOutButton: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
});
