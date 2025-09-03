import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../constants';
import { RouteOptimizationService, OptimizedRoute, DroneSpecs } from '../services/routeOptimizationService';
import { useMissions } from '../hooks/useMissions';
import { Mission } from '../types';

interface RouteCardProps {
  route: OptimizedRoute;
  index: number;
  onSelect: () => void;
  isSelected: boolean;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, index, onSelect, isSelected }) => (
  <TouchableOpacity
    style={[styles.routeCard, isSelected && styles.routeCardSelected]}
    onPress={onSelect}
  >
    <View style={styles.routeHeader}>
      <Text style={styles.routeTitle}>Route Option {index + 1}</Text>
      <View style={[styles.efficiencyBadge, { backgroundColor: getEfficiencyColor(route.efficiency) }]}>
        <Text style={styles.efficiencyText}>{route.efficiency.toFixed(1)}%</Text>
      </View>
    </View>
    
    <View style={styles.routeMetrics}>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Distance</Text>
        <Text style={styles.metricValue}>{route.totalDistance.toFixed(1)} km</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Time</Text>
        <Text style={styles.metricValue}>{route.totalTime} min</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Fuel</Text>
        <Text style={styles.metricValue}>{route.fuelConsumption}%</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Stops</Text>
        <Text style={styles.metricValue}>{route.waypoints.filter(w => w.type === 'delivery').length}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 80) return Colors.success;
  if (efficiency >= 60) return Colors.warning;
  return Colors.danger;
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'emergency': return Colors.danger;
    case 'high': return Colors.warning;
    case 'medium': return Colors.accent;
    case 'low': return Colors.success;
    default: return Colors.textSecondary;
  }
};

export const RouteOptimizationScreen: React.FC = () => {
  const { missions, loading } = useMissions();
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [droneSpecs, setDroneSpecs] = useState<DroneSpecs>({
    maxRange: 50,
    maxFlightTime: 120,
    speed: 60,
    batteryCapacity: 100,
  });
  const [optimizationSettings, setOptimizationSettings] = useState({
    prioritizeEmergency: true,
    minimizeDistance: false,
    balanceLoad: true,
  });
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    generateRoutes();
  }, [missions, droneSpecs, optimizationSettings, activeOnly]);

  const generateRoutes = () => {
    if (!missions || missions.length === 0) {
      setRoutes([]);
      return;
    }

    // Filter missions based on settings
    let filteredMissions = missions.filter(mission => {
      if (activeOnly && mission.status !== 'pending' && mission.status !== 'active') {
        return false;
      }
      return true;
    });

    if (filteredMissions.length === 0) {
      setRoutes([]);
      return;
    }

    const generatedRoutes = RouteOptimizationService.generateRouteOptions(
      filteredMissions,
      droneSpecs
    );

    setRoutes(generatedRoutes);
    setSelectedRouteIndex(0);
  };

  const handleOptimizeRoutes = () => {
    Alert.alert(
      'Optimize Routes',
      'This will generate new optimized routes based on current missions and drone specifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Optimize', onPress: generateRoutes },
      ]
    );
  };

  const handleDeployRoute = () => {
    if (routes.length === 0) return;

    const selectedRoute = routes[selectedRouteIndex];
    const validation = RouteOptimizationService.validateRoute(selectedRoute, droneSpecs);

    if (!validation.valid) {
      Alert.alert(
        'Route Validation Failed',
        `Cannot deploy route:\n${validation.issues.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Deploy Route',
      `Deploy Route Option ${selectedRouteIndex + 1}?\n\nThis will start the mission with ${selectedRoute.waypoints.filter(w => w.type === 'delivery').length} delivery stops.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: () => {
            // TODO: Implement actual route deployment
            Alert.alert('Success', 'Route deployed successfully!');
          },
        },
      ]
    );
  };

  const renderRouteDetails = () => {
    if (routes.length === 0 || !routes[selectedRouteIndex]) return null;

    const route = routes[selectedRouteIndex];
    const instructions = RouteOptimizationService.generateNavigationInstructions(route);
    const arrivalTimes = RouteOptimizationService.calculateArrivalTimes(route, new Date());

    return (
      <View style={styles.routeDetails}>
        <Text style={styles.sectionTitle}>Route Details</Text>
        
        {/* Waypoints */}
        <View style={styles.waypointsContainer}>
          {route.waypoints.map((waypoint, index) => {
            const mission = missions?.find(m => m.id === waypoint.missionId);
            const arrivalTime = arrivalTimes[index];
            
            return (
              <View key={waypoint.id} style={styles.waypointCard}>
                <View style={styles.waypointHeader}>
                  <Text style={styles.waypointIndex}>{index + 1}</Text>
                  <View style={styles.waypointInfo}>
                    <Text style={styles.waypointTitle}>
                      {waypoint.type === 'base' ? 'Base Station' : 
                       mission ? mission.recipient_name : 'Delivery Point'}
                    </Text>
                    {mission && (
                      <View style={styles.waypointMeta}>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(mission.priority) }]}>
                          <Text style={styles.priorityText}>{mission.priority.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.supplyType}>
                          {mission.supply_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.arrivalTime}>
                  ETA: {arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                
                {waypoint.coordinate && (
                  <Text style={styles.coordinates}>
                    {waypoint.coordinate.latitude.toFixed(4)}, {waypoint.coordinate.longitude.toFixed(4)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Navigation Instructions */}
        {instructions.length > 0 && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.sectionTitle}>Navigation Instructions</Text>
            {instructions.map((instruction, index) => (
              <Text key={index} style={styles.instruction}>
                {index + 1}. {instruction}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDroneSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Drone Specifications</Text>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Max Range (km)</Text>
        <TextInput
          style={styles.settingInput}
          value={droneSpecs.maxRange.toString()}
          onChangeText={(text) => {
            const value = parseFloat(text) || 0;
            setDroneSpecs(prev => ({ ...prev, maxRange: value }));
          }}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Max Flight Time (min)</Text>
        <TextInput
          style={styles.settingInput}
          value={droneSpecs.maxFlightTime.toString()}
          onChangeText={(text) => {
            const value = parseInt(text) || 0;
            setDroneSpecs(prev => ({ ...prev, maxFlightTime: value }));
          }}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Speed (km/h)</Text>
        <TextInput
          style={styles.settingInput}
          value={droneSpecs.speed.toString()}
          onChangeText={(text) => {
            const value = parseFloat(text) || 0;
            setDroneSpecs(prev => ({ ...prev, speed: value }));
          }}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Battery Level (%)</Text>
        <TextInput
          style={styles.settingInput}
          value={droneSpecs.batteryCapacity.toString()}
          onChangeText={(text) => {
            const value = parseInt(text) || 0;
            setDroneSpecs(prev => ({ ...prev, batteryCapacity: Math.min(100, Math.max(0, value)) }));
          }}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderOptimizationSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Optimization Settings</Text>
      
      <View style={styles.switchRow}>
        <Text style={styles.settingLabel}>Active Missions Only</Text>
        <Switch
          value={activeOnly}
          onValueChange={setActiveOnly}
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>
      
      <View style={styles.switchRow}>
        <Text style={styles.settingLabel}>Prioritize Emergency</Text>
        <Switch
          value={optimizationSettings.prioritizeEmergency}
          onValueChange={(value) => 
            setOptimizationSettings(prev => ({ ...prev, prioritizeEmergency: value }))
          }
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>
      
      <View style={styles.switchRow}>
        <Text style={styles.settingLabel}>Minimize Distance</Text>
        <Switch
          value={optimizationSettings.minimizeDistance}
          onValueChange={(value) => 
            setOptimizationSettings(prev => ({ ...prev, minimizeDistance: value }))
          }
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>
      
      <View style={styles.switchRow}>
        <Text style={styles.settingLabel}>Balance Load</Text>
        <Switch
          value={optimizationSettings.balanceLoad}
          onValueChange={(value) => 
            setOptimizationSettings(prev => ({ ...prev, balanceLoad: value }))
          }
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading missions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Optimization</Text>
        <TouchableOpacity style={styles.optimizeButton} onPress={handleOptimizeRoutes}>
          <Text style={styles.optimizeButtonText}>Optimize</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Settings */}
        {renderDroneSettings()}
        {renderOptimizationSettings()}

        {/* Route Options */}
        {routes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Options ({routes.length})</Text>
            {routes.map((route, index) => (
              <RouteCard
                key={index}
                route={route}
                index={index}
                onSelect={() => setSelectedRouteIndex(index)}
                isSelected={selectedRouteIndex === index}
              />
            ))}
          </View>
        )}

        {/* Route Details */}
        {renderRouteDetails()}

        {/* Deploy Button */}
        {routes.length > 0 && (
          <View style={styles.deployContainer}>
            <TouchableOpacity style={styles.deployButton} onPress={handleDeployRoute}>
              <Text style={styles.deployButtonText}>Deploy Selected Route</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No Routes Message */}
        {routes.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Routes Available</Text>
            <Text style={styles.emptyMessage}>
              {missions?.length === 0 
                ? 'No missions found. Create missions to generate routes.'
                : 'No missions match the current filters. Adjust settings to see routes.'
              }
            </Text>
          </View>
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
  optimizeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  optimizeButtonText: {
    ...Typography.button,
    color: Colors.surface,
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
  settingsContainer: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
    flex: 1,
  },
  settingInput: {
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    width: 80,
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routeTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  efficiencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  efficiencyText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  metricValue: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  routeDetails: {
    margin: Spacing.lg,
  },
  waypointsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  waypointCard: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  waypointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  waypointIndex: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.primary,
    width: 30,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  waypointMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    marginRight: Spacing.sm,
  },
  priorityText: {
    ...Typography.caption,
    color: Colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  supplyType: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  arrivalTime: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginLeft: 30,
  },
  coordinates: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: 30,
    marginTop: Spacing.xs,
  },
  instructionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
  },
  instruction: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  deployContainer: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  deployButton: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  deployButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.headerSmall,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
