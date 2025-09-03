/**
 * Global Coordination Dashboard Screen
 * Main interface for Stage 7 - Global Response Coordination
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlobalConfigurationService, { GlobalRegion, TimeZoneInfo } from '../services/globalConfigurationService';
import InternationalAPIService, { UNOCHAEvent, RedCrossOperation } from '../services/internationalAPIService';
import AdvancedDroneFleetService, { DroneUnit, DroneSwarm } from '../services/advancedDroneFleetService';

const { width } = Dimensions.get('window');

interface GlobalStats {
  totalMissions: number;
  activeDrones: number;
  activeSwarms: number;
  globalCoverage: number;
  responseTime: number;
  coordinationRequests: number;
}

const GlobalCoordinationScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east-1');
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalMissions: 0,
    activeDrones: 0,
    activeSwarms: 0,
    globalCoverage: 0,
    responseTime: 0,
    coordinationRequests: 0
  });
  const [regions, setRegions] = useState<GlobalRegion[]>([]);
  const [timeZones, setTimeZones] = useState<TimeZoneInfo[]>([]);
  const [oochaEvents, setOochaEvents] = useState<UNOCHAEvent[]>([]);
  const [redCrossOps, setRedCrossOps] = useState<RedCrossOperation[]>([]);
  const [fleetStatus, setFleetStatus] = useState<any>(null);

  const globalConfigService = GlobalConfigurationService.getInstance();
  const internationalService = InternationalAPIService.getInstance();
  const droneFleetService = AdvancedDroneFleetService.getInstance();

  useEffect(() => {
    loadGlobalData();
  }, []);

  const loadGlobalData = async () => {
    try {
      setLoading(true);

      // Load global configuration
      const config = globalConfigService.getConfiguration();
      setRegions(config.availableRegions);
      setSelectedRegion(config.currentRegion);

      // Load time zones
      const timeZoneInfo = globalConfigService.getGlobalTimeZones();
      setTimeZones(timeZoneInfo);

      // Load international data
      const [oochaData, redCrossData] = await Promise.all([
        internationalService.getUNOCHADisasters(),
        internationalService.getRedCrossOperations()
      ]);
      setOochaEvents(oochaData.slice(0, 5)); // Show top 5
      setRedCrossOps(redCrossData.slice(0, 5)); // Show top 5

      // Load drone fleet status
      const fleet = droneFleetService.getFleetStatus();
      setFleetStatus(fleet);

      // Generate global stats
      setGlobalStats({
        totalMissions: oochaData.length + redCrossData.length,
        activeDrones: fleet.activeDeployments,
        activeSwarms: droneFleetService.getAllSwarms().size,
        globalCoverage: 98.5, // Simulated
        responseTime: 45, // Simulated average response time in seconds
        coordinationRequests: 12 // Simulated
      });

    } catch (error) {
      console.error('Error loading global data:', error);
      Alert.alert('Error', 'Failed to load global coordination data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGlobalData();
  };

  const switchRegion = async (regionId: string) => {
    try {
      setLoading(true);
      const success = await globalConfigService.switchRegion(regionId);
      if (success) {
        setSelectedRegion(regionId);
        Alert.alert('Success', `Switched to ${regions.find(r => r.id === regionId)?.name}`);
        await loadGlobalData();
      } else {
        Alert.alert('Error', 'Failed to switch region');
      }
    } catch (error) {
      Alert.alert('Error', 'Region switch failed');
    } finally {
      setLoading(false);
    }
  };

  const renderGlobalStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Global Response Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="globe-outline" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{globalStats.totalMissions}</Text>
          <Text style={styles.statLabel}>Active Missions</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="airplane-outline" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{globalStats.activeDrones}</Text>
          <Text style={styles.statLabel}>Deployed Drones</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="radio-outline" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{globalStats.activeSwarms}</Text>
          <Text style={styles.statLabel}>Active Swarms</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer-outline" size={24} color="#9C27B0" />
          <Text style={styles.statValue}>{globalStats.responseTime}s</Text>
          <Text style={styles.statLabel}>Avg Response</Text>
        </View>
      </View>
    </View>
  );

  const renderRegionSelector = () => (
    <View style={styles.regionContainer}>
      <Text style={styles.sectionTitle}>Global Regions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {regions.map((region) => (
          <TouchableOpacity
            key={region.id}
            style={[
              styles.regionCard,
              selectedRegion === region.id && styles.selectedRegion
            ]}
            onPress={() => switchRegion(region.id)}
          >
            <Text style={styles.regionCode}>{region.code}</Text>
            <Text style={styles.regionName}>{region.name}</Text>
            <View style={styles.regionStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: region.status === 'active' ? '#4CAF50' : '#FF5722' }
              ]} />
              <Text style={styles.latencyText}>{region.latency}ms</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTimeZones = () => (
    <View style={styles.timeZoneContainer}>
      <Text style={styles.sectionTitle}>Global Time Coordination</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {timeZones.map((tz, index) => (
          <View key={index} style={styles.timeZoneCard}>
            <Text style={styles.timeZoneAbbr}>{tz.abbreviation}</Text>
            <Text style={styles.timeZoneTime}>
              {new Date(tz.localTime).toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.timeZoneOffset}>
              UTC{tz.offset >= 0 ? '+' : ''}{tz.offset}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderDisasterEvents = () => (
    <View style={styles.eventsContainer}>
      <Text style={styles.sectionTitle}>International Disasters (UN OCHA)</Text>
      {oochaEvents.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
            <View style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(event.severity) }
            ]}>
              <Text style={styles.severityText}>{event.severity.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.eventCountry}>{event.country} • {event.type}</Text>
          <Text style={styles.eventAffected}>
            {event.affectedPopulation.toLocaleString()} people affected
          </Text>
          <View style={styles.eventFunding}>
            <Text style={styles.fundingText}>
              ${event.funding.received.toLocaleString()} / ${event.funding.requested.toLocaleString()} {event.funding.currency}
            </Text>
            <View style={styles.fundingBar}>
              <View 
                style={[
                  styles.fundingProgress,
                  { width: `${Math.min(100, (event.funding.received / event.funding.requested) * 100)}%` }
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderRedCrossOperations = () => (
    <View style={styles.eventsContainer}>
      <Text style={styles.sectionTitle}>Red Cross Operations</Text>
      {redCrossOps.map((op) => (
        <View key={op.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventName} numberOfLines={1}>{op.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: op.status === 'active' ? '#4CAF50' : '#9E9E9E' }
            ]}>
              <Text style={styles.statusText}>{op.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.eventCountry}>{op.country} • {op.disasterType}</Text>
          <Text style={styles.eventAffected}>
            {op.numBeneficiaries.toLocaleString()} beneficiaries
          </Text>
          <View style={styles.eventFunding}>
            <Text style={styles.fundingText}>
              ${op.amountRaised.toLocaleString()} / ${op.amountRequested.toLocaleString()}
            </Text>
            <View style={styles.fundingBar}>
              <View 
                style={[
                  styles.fundingProgress,
                  { width: `${Math.min(100, (op.amountRaised / op.amountRequested) * 100)}%` }
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFleetStatus = () => (
    <View style={styles.fleetContainer}>
      <Text style={styles.sectionTitle}>Global Drone Fleet</Text>
      {fleetStatus && (
        <View style={styles.fleetStats}>
          <View style={styles.fleetStatItem}>
            <Text style={styles.fleetStatValue}>{fleetStatus.totalDrones}</Text>
            <Text style={styles.fleetStatLabel}>Total Drones</Text>
          </View>
          <View style={styles.fleetStatItem}>
            <Text style={styles.fleetStatValue}>{fleetStatus.activeDeployments}</Text>
            <Text style={styles.fleetStatLabel}>Active</Text>
          </View>
          <View style={styles.fleetStatItem}>
            <Text style={styles.fleetStatValue}>{fleetStatus.maintenanceNeeded}</Text>
            <Text style={styles.fleetStatLabel}>Maintenance</Text>
          </View>
          <View style={styles.fleetStatItem}>
            <Text style={styles.fleetStatValue}>{Math.round(fleetStatus.averageHealth)}%</Text>
            <Text style={styles.fleetStatLabel}>Avg Health</Text>
          </View>
        </View>
      )}
    </View>
  );

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Global Coordination Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Coordination Center</Text>
        <Text style={styles.headerSubtitle}>Stage 7 - Global Response Platform</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderGlobalStats()}
        {renderRegionSelector()}
        {renderTimeZones()}
        {renderFleetStatus()}
        {renderDisasterEvents()}
        {renderRedCrossOperations()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  regionContainer: {
    marginBottom: 20,
  },
  regionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRegion: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  regionCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  regionName: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  regionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  latencyText: {
    fontSize: 11,
    color: '#666',
  },
  timeZoneContainer: {
    marginBottom: 20,
  },
  timeZoneCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeZoneAbbr: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeZoneTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 4,
  },
  timeZoneOffset: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  eventsContainer: {
    marginBottom: 20,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  eventCountry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventAffected: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  eventFunding: {
    marginTop: 8,
  },
  fundingText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fundingBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fundingProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  fleetContainer: {
    marginBottom: 20,
  },
  fleetStats: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fleetStatItem: {
    alignItems: 'center',
  },
  fleetStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  fleetStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default GlobalCoordinationScreen;
