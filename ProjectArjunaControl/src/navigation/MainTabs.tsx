import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import { Colors } from '../constants';

// Import all screens
import { 
  DashboardScreen, 
  NewMissionScreen, 
  LiveTrackingScreen, 
  ProfileScreen 
} from '../screens/MainScreens';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { RouteOptimizationScreen } from '../screens/RouteOptimizationScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

// Analytics Stack Navigator
const AnalyticsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} />
  </Stack.Navigator>
);

// Route Optimization Stack Navigator  
const RouteStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RouteOptimizationMain" component={RouteOptimizationScreen} />
  </Stack.Navigator>
);

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
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'RouteOptimization':
              iconName = focused ? 'location' : 'location-outline';
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
          paddingBottom: 6,
          paddingTop: 6,
          height: 75,
        },
        tabBarLabelStyle: {
          fontSize: 10,
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
        options={{ tabBarLabel: 'Tracking' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsStack}
        options={{ tabBarLabel: 'Analytics' }}
      />
      <Tab.Screen 
        name="RouteOptimization" 
        component={RouteStack}
        options={{ tabBarLabel: 'Routes' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
