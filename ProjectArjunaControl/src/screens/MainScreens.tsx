import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../constants';

// Temporary placeholder for main app screens
export const DashboardScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to Project Arjuna Control</Text>
      </View>
    </SafeAreaView>
  );
};

export const NewMissionScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Mission</Text>
        <Text style={styles.subtitle}>Create a new drone delivery mission</Text>
      </View>
    </SafeAreaView>
  );
};

export const LiveTrackingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Live Tracking</Text>
        <Text style={styles.subtitle}>Track active missions in real-time</Text>
      </View>
    </SafeAreaView>
  );
};

export const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account and settings</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    ...Typography.headerLarge,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
});
