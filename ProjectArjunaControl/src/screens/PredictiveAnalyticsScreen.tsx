import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMissions } from '../hooks/useMissions';
import { mlPredictionService, MissionPrediction } from '../services/mlPredictionService';
import { weatherApiService, WeatherAnalysis } from '../services/weatherApiService';
import { voiceCommandService } from '../services/voiceCommandService';
import { Mission } from '../types';

interface PredictiveInsight {
  id: string;
  title: string;
  prediction: string;
  confidence: number;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
  trend: 'improving' | 'declining' | 'stable';
}

export const PredictiveAnalyticsScreen: React.FC = () => {
  const { missions, loading: missionsLoading, loadMissions } = useMissions();
  const [loading, setLoading] = useState(true);
  const [weatherAnalysis, setWeatherAnalysis] = useState<WeatherAnalysis | null>(null);
  const [missionPredictions, setMissionPredictions] = useState<(Mission & { prediction: MissionPrediction })[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    initializePredictiveAnalytics();
  }, [missions]);

  const initializePredictiveAnalytics = async () => {
    try {
      setLoading(true);
      
      // Initialize ML service
      await mlPredictionService.initializeModel();
      
      // Get weather analysis for current location (mock coordinates)
      const weatherData = await weatherApiService.analyzeWeatherForMission(
        40.7128, // NYC coordinates for demo
        -74.0060
      );
      setWeatherAnalysis(weatherData);
      
      // Generate predictions for active missions
      const activeMissions = missions.filter(m => m.status === 'active');
      const predictions = await Promise.all(
        activeMissions.map(async (mission) => {
          const prediction = await mlPredictionService.predictMissionSuccess(
            mission,
            weatherData.environmentalFactors
          );
          return { ...mission, prediction };
        })
      );
      setMissionPredictions(predictions);
      
      // Generate predictive insights
      const generatedInsights = generatePredictiveInsights(predictions, weatherData);
      setInsights(generatedInsights);
      
    } catch (error) {
      console.error('Failed to initialize predictive analytics:', error);
      Alert.alert('Error', 'Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  const generatePredictiveInsights = (
    predictions: (Mission & { prediction: MissionPrediction })[],
    weather: WeatherAnalysis
  ): PredictiveInsight[] => {
    const insights: PredictiveInsight[] = [];
    
    // Weather-based insights
    insights.push({
      id: 'weather-conditions',
      title: 'Current Weather Impact',
      prediction: `Flight conditions are ${weather.missionViability.toLowerCase()}`,
      confidence: weather.flightSafety,
      impact: weather.flightSafety > 0.8 ? 'Low' : weather.flightSafety > 0.6 ? 'Medium' : 'High',
      recommendation: weather.recommendations[0] || 'Conditions are optimal',
      trend: weather.flightSafety > 0.7 ? 'stable' : 'declining'
    });
    
    // Success rate predictions
    const avgSuccessRate = predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.prediction.successProbability, 0) / predictions.length 
      : 0.8;
    
    insights.push({
      id: 'mission-success',
      title: 'Mission Success Forecast',
      prediction: `${Math.round(avgSuccessRate * 100)}% expected success rate`,
      confidence: avgSuccessRate,
      impact: avgSuccessRate > 0.8 ? 'Low' : avgSuccessRate > 0.6 ? 'Medium' : 'High',
      recommendation: avgSuccessRate > 0.7 
        ? 'Continue with current mission plans' 
        : 'Consider delaying non-critical missions',
      trend: avgSuccessRate > 0.7 ? 'improving' : 'declining'
    });
    
    // Risk assessment
    const highRiskMissions = predictions.filter(p => p.prediction.riskLevel === 'High' || p.prediction.riskLevel === 'Critical');
    if (highRiskMissions.length > 0) {
      insights.push({
        id: 'risk-assessment',
        title: 'High-Risk Mission Alert',
        prediction: `${highRiskMissions.length} mission(s) have elevated risk levels`,
        confidence: 0.9,
        impact: 'Critical',
        recommendation: 'Review high-risk missions and consider alternative approaches',
        trend: 'declining'
      });
    }
    
    // Optimal timing insights
    if (weather.optimalWindow) {
      const windowStart = new Date(weather.optimalWindow.start);
      const hoursUntil = Math.round((windowStart.getTime() - Date.now()) / (1000 * 60 * 60));
      
      insights.push({
        id: 'optimal-timing',
        title: 'Optimal Launch Window',
        prediction: hoursUntil > 0 
          ? `Best conditions in ${hoursUntil} hours` 
          : 'Currently in optimal window',
        confidence: weather.optimalWindow.confidence,
        impact: 'Medium',
        recommendation: hoursUntil > 0 
          ? 'Schedule missions for optimal weather window' 
          : 'Take advantage of current optimal conditions',
        trend: 'improving'
      });
    }
    
    return insights;
  };

  const handleVoiceCommand = async () => {
    try {
      if (voiceActive) {
        await voiceCommandService.stopListening();
        setVoiceActive(false);
      } else {
        setVoiceActive(true);
        await voiceCommandService.startListening(
          (command) => {
            console.log('Voice command received:', command);
            // Handle voice commands for analytics
            if (command.action === 'GET_WEATHER') {
              voiceCommandService.speak(`Current weather analysis shows ${weatherAnalysis?.missionViability.toLowerCase()} conditions for flight operations.`);
            }
          },
          (error) => {
            console.error('Voice command error:', error);
            setVoiceActive(false);
          }
        );
      }
    } catch (error) {
      console.error('Voice command failed:', error);
      setVoiceActive(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMissions();
    await initializePredictiveAnalytics();
    setRefreshing(false);
  };

  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'High': return '#FF5722';
      case 'Critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      case 'stable': return 'remove';
      default: return 'help';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initializing AI Predictions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 AI Predictive Analytics</Text>
        <TouchableOpacity 
          style={[styles.voiceButton, voiceActive && styles.voiceButtonActive]}
          onPress={handleVoiceCommand}
        >
          <Ionicons name={voiceActive ? "mic" : "mic-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Weather Analysis Card */}
      {weatherAnalysis && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Environmental Intelligence</Text>
          </View>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherLabel}>Flight Conditions:</Text>
            <Text style={[styles.weatherValue, { color: getRiskColor(
              weatherAnalysis.flightSafety > 0.8 ? 'Low' : 
              weatherAnalysis.flightSafety > 0.6 ? 'Medium' : 'High'
            )}]}>
              {weatherAnalysis.missionViability}
            </Text>
          </View>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherLabel}>Safety Score:</Text>
            <Text style={styles.weatherValue}>
              {Math.round(weatherAnalysis.flightSafety * 100)}%
            </Text>
          </View>
          <Text style={styles.recommendation}>
            💡 {weatherAnalysis.recommendations[0]}
          </Text>
        </View>
      )}

      {/* Predictive Insights */}
      <View style={styles.sectionHeader}>
        <Ionicons name="analytics" size={20} color="#666" />
        <Text style={styles.sectionTitle}>AI Insights & Predictions</Text>
      </View>

      {insights.map((insight) => (
        <View key={insight.id} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightTitleRow}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(insight.confidence * 100)}%
                </Text>
              </View>
            </View>
            <View style={styles.impactRow}>
              <View style={[styles.impactBadge, { backgroundColor: getRiskColor(insight.impact) }]}>
                <Text style={styles.impactText}>{insight.impact}</Text>
              </View>
              <Ionicons 
                name={getTrendIcon(insight.trend)} 
                size={16} 
                color={insight.trend === 'improving' ? '#4CAF50' : insight.trend === 'declining' ? '#F44336' : '#9E9E9E'} 
              />
            </View>
          </View>
          <Text style={styles.predictionText}>{insight.prediction}</Text>
          <Text style={styles.recommendationText}>
            🎯 {insight.recommendation}
          </Text>
        </View>
      ))}

      {/* Mission Predictions */}
      {missionPredictions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="rocket" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Mission Success Predictions</Text>
          </View>

          {missionPredictions.map((mission) => (
            <View key={mission.id} style={styles.missionCard}>
              <View style={styles.missionHeader}>
                <Text style={styles.missionTitle}>
                  Mission for {mission.recipient_name} - {mission.supply_type}
                </Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(mission.prediction.riskLevel) }]}>
                  <Text style={styles.riskText}>{mission.prediction.riskLevel}</Text>
                </View>
              </View>
              
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Success Probability:</Text>
                <Text style={styles.predictionValue}>
                  {Math.round(mission.prediction.successProbability * 100)}%
                </Text>
              </View>
              
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Est. Duration:</Text>
                <Text style={styles.predictionValue}>
                  {mission.prediction.estimatedDuration} min
                </Text>
              </View>
              
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Optimal Launch:</Text>
                <Text style={styles.predictionValue}>
                  {mission.prediction.optimalLaunchTime}
                </Text>
              </View>

              {mission.prediction.riskFactors.length > 0 && (
                <View style={styles.riskFactors}>
                  <Text style={styles.riskFactorsTitle}>⚠️ Risk Factors:</Text>
                  {mission.prediction.riskFactors.map((factor, index) => (
                    <Text key={index} style={styles.riskFactor}>• {factor}</Text>
                  ))}
                </View>
              )}

              <View style={styles.recommendations}>
                <Text style={styles.recommendationsTitle}>💡 AI Recommendations:</Text>
                {mission.prediction.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendation}>• {rec}</Text>
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      {/* AI Status Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🤖 AI Model Active • Real-time Environmental Analysis • Voice Commands Ready
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  voiceButton: {
    backgroundColor: '#2196F3',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#F44336',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weatherLabel: {
    fontSize: 14,
    color: '#666',
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  insightCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightHeader: {
    marginBottom: 8,
  },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  impactText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  predictionText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  missionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  riskFactors: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  riskFactorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 4,
  },
  riskFactor: {
    fontSize: 13,
    color: '#ef6c00',
    marginBottom: 2,
  },
  recommendations: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#388e3c',
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 13,
    color: '#2e7d32',
    marginBottom: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default PredictiveAnalyticsScreen;
