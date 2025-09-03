import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import { Colors } from '../constants';

// Import placeholder screens
import { 
  DashboardScreen, 
  NewMissionScreen, 
  LiveTrackingScreen, 
  ProfileScreen 
} from '../screens/MainScreens';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'NewMission':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'LiveTracking':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="NewMission" 
        component={NewMissionScreen}
        options={{ tabBarLabel: 'New Mission' }}
      />
      <Tab.Screen 
        name="LiveTracking" 
        component={LiveTrackingScreen}
        options={{ tabBarLabel: 'Live Tracking' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
