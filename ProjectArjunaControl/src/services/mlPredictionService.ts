import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { Mission } from '../types';

export type MissionPriority = 'low' | 'medium' | 'high' | 'emergency';
export type SupplyType = 'medicine' | 'communication_device' | 'food' | 'water' | 'emergency_kit' | 'custom';

export interface MissionPrediction {
  successProbability: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskFactors: string[];
  recommendations: string[];
  estimatedDuration: number; // in minutes
  optimalLaunchTime: string;
}

export interface EnvironmentalFactors {
  weatherScore: number; // 0-1, 1 = optimal
  terrainDifficulty: number; // 0-1, 1 = most difficult
  timeOfDay: number; // 0-24 hours
  visibility: number; // 0-1, 1 = perfect visibility
  windSpeed: number; // in km/h
  temperature: number; // in Celsius
}

class MLPredictionService {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  async initializeModel(): Promise<void> {
    try {
      // Initialize TensorFlow.js platform
      await tf.ready();
      
      // Create a simple neural network for mission prediction
      // In production, this would be a pre-trained model
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.1 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Success probability
        ]
      });

      // Compile the model
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Simulate training with synthetic data (in production, use real historical data)
      await this.trainModel();
      
      this.isInitialized = true;
      console.log('ML Prediction Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      throw error;
    }
  }

  private async trainModel(): Promise<void> {
    // Generate synthetic training data
    const trainingSize = 1000;
    const features = [];
    const labels = [];

    for (let i = 0; i < trainingSize; i++) {
      const feature = this.generateSyntheticFeatures();
      const label = this.calculateSyntheticSuccess(feature);
      features.push(feature);
      labels.push([label]);
    }

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);

    // Train the model
    await this.model!.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      shuffle: true,
      verbose: 0
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();
  }

  private generateSyntheticFeatures(): number[] {
    return [
      Math.random(), // priority (0-1)
      Math.random(), // weather score
      Math.random(), // terrain difficulty
      Math.random() * 24, // time of day
      Math.random(), // visibility
      Math.random() * 50, // wind speed
      Math.random() * 40 - 10, // temperature (-10 to 30)
      Math.random(), // supply type complexity
      Math.random(), // distance factor
      Math.random() // resource availability
    ];
  }

  private calculateSyntheticSuccess(features: number[]): number {
    // Simulate success probability based on features
    const [priority, weather, terrain, timeOfDay, visibility, windSpeed, temp, supply, distance, resources] = features;
    
    let successScore = 0.5; // Base success rate
    
    // Priority impact (higher priority = more resources = higher success)
    successScore += priority * 0.2;
    
    // Weather impact
    successScore += weather * 0.15;
    successScore -= Math.abs(temp - 20) / 100; // Optimal temp around 20°C
    successScore -= Math.min(windSpeed / 100, 0.3); // High wind reduces success
    
    // Terrain impact
    successScore -= terrain * 0.1;
    
    // Time of day impact (daylight hours better)
    if (timeOfDay >= 6 && timeOfDay <= 18) {
      successScore += 0.1;
    }
    
    // Visibility impact
    successScore += visibility * 0.1;
    
    // Distance and resources
    successScore -= distance * 0.05;
    successScore += resources * 0.1;
    
    return Math.max(0, Math.min(1, successScore));
  }

  async predictMissionSuccess(
    mission: Mission, 
    environmentalFactors: EnvironmentalFactors
  ): Promise<MissionPrediction> {
    if (!this.isInitialized || !this.model) {
      await this.initializeModel();
    }

    try {
      // Convert mission and environmental data to model input
      const features = this.extractFeatures(mission, environmentalFactors);
      const inputTensor = tf.tensor2d([features]);
      
      // Make prediction
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const successProbability = await prediction.data();
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      const probability = successProbability[0];
      
      // Generate comprehensive prediction result
      return this.generatePredictionResult(probability, mission, environmentalFactors);
    } catch (error) {
      console.error('Prediction failed:', error);
      
      // Fallback to rule-based prediction
      return this.fallbackPrediction(mission, environmentalFactors);
    }
  }

  private extractFeatures(mission: Mission, env: EnvironmentalFactors): number[] {
    // Convert mission priority to numeric
    const priorityScore = this.priorityToNumeric(mission.priority);
    
    // Convert supply type to complexity score
    const supplyComplexity = this.supplyTypeComplexity(mission.supply_type);
    
    // Calculate distance factor (normalized)
    const distanceFactor = Math.min(1, (mission.target_location?.latitude || 0) / 90);
    
    // Resource availability (based on priority and supply type)
    const resourceAvailability = mission.priority === 'emergency' ? 0.9 : 0.6;

    return [
      priorityScore,
      env.weatherScore,
      env.terrainDifficulty,
      env.timeOfDay,
      env.visibility,
      env.windSpeed / 50, // Normalize wind speed
      (env.temperature + 20) / 60, // Normalize temperature (-20 to 40)
      supplyComplexity,
      distanceFactor,
      resourceAvailability
    ];
  }

  private priorityToNumeric(priority: MissionPriority): number {
    switch (priority) {
      case 'emergency': return 1.0;
      case 'high': return 0.75;
      case 'medium': return 0.5;
      case 'low': return 0.25;
      default: return 0.5;
    }
  }

  private supplyTypeComplexity(supplyType: string): number {
    switch (supplyType) {
      case 'medicine': return 0.9; // High complexity, time-sensitive
      case 'communication_device': return 0.7; // Medium-high complexity
      case 'emergency_kit': return 0.6; // Medium complexity
      case 'food': return 0.4; // Lower complexity
      case 'water': return 0.3; // Lower complexity
      case 'custom': return 0.5; // Medium complexity
      default: return 0.5;
    }
  }

  private generatePredictionResult(
    probability: number, 
    mission: Mission, 
    env: EnvironmentalFactors
  ): MissionPrediction {
    const riskLevel = this.calculateRiskLevel(probability);
    const riskFactors = this.identifyRiskFactors(env, mission);
    const recommendations = this.generateRecommendations(probability, env, mission);
    const estimatedDuration = this.estimateFlightTime(mission, env);
    const optimalLaunchTime = this.calculateOptimalLaunchTime(env);

    return {
      successProbability: Math.round(probability * 100) / 100,
      riskLevel,
      riskFactors,
      recommendations,
      estimatedDuration,
      optimalLaunchTime
    };
  }

  private calculateRiskLevel(probability: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (probability >= 0.8) return 'Low';
    if (probability >= 0.6) return 'Medium';
    if (probability >= 0.4) return 'High';
    return 'Critical';
  }

  private identifyRiskFactors(env: EnvironmentalFactors, mission: Mission): string[] {
    const factors: string[] = [];
    
    if (env.weatherScore < 0.6) factors.push('Poor weather conditions');
    if (env.windSpeed > 25) factors.push('High wind speeds');
    if (env.visibility < 0.5) factors.push('Limited visibility');
    if (env.terrainDifficulty > 0.7) factors.push('Challenging terrain');
    if (env.temperature < -5 || env.temperature > 35) factors.push('Extreme temperature');
    if (env.timeOfDay < 6 || env.timeOfDay > 20) factors.push('Low light conditions');
    
    if (mission.priority === 'emergency') {
      factors.push('Time-critical emergency mission');
    }
    
    if (mission.supply_type === 'medicine') {
      factors.push('Time-sensitive medical supplies');
    }

    return factors;
  }

  private generateRecommendations(
    probability: number, 
    env: EnvironmentalFactors, 
    mission: Mission
  ): string[] {
    const recommendations: string[] = [];
    
    if (probability < 0.5) {
      recommendations.push('Consider delaying mission until conditions improve');
    }
    
    if (env.windSpeed > 20) {
      recommendations.push('Wait for calmer wind conditions');
    }
    
    if (env.visibility < 0.6) {
      recommendations.push('Improve visibility with additional lighting equipment');
    }
    
    if (env.timeOfDay < 6 || env.timeOfDay > 20) {
      recommendations.push('Schedule mission during daylight hours if possible');
    }
    
    if (mission.priority === 'emergency' && probability > 0.4) {
      recommendations.push('Proceed with enhanced monitoring and backup plans');
    }
    
    if (env.terrainDifficulty > 0.8) {
      recommendations.push('Use terrain-optimized flight path');
    }

    if (recommendations.length === 0) {
      recommendations.push('Conditions are favorable for mission execution');
    }

    return recommendations;
  }

  private estimateFlightTime(mission: Mission, env: EnvironmentalFactors): number {
    // Base flight time estimation (in minutes)
    let baseTime = 15; // Default base time
    
    // Adjust for terrain difficulty
    baseTime += env.terrainDifficulty * 10;
    
    // Adjust for wind conditions
    baseTime += Math.max(0, (env.windSpeed - 15) * 0.5);
    
    // Adjust for visibility
    if (env.visibility < 0.5) baseTime += 5;
    
    // Adjust for priority (emergency missions may take alternate routes)
    if (mission.priority === 'emergency') baseTime += 3;
    
    // Adjust for supply type complexity
    if (mission.supply_type === 'medicine') baseTime += 2;
    
    return Math.round(baseTime);
  }

  private calculateOptimalLaunchTime(env: EnvironmentalFactors): string {
    const currentHour = env.timeOfDay;
    
    // Find optimal time window (8 AM to 6 PM for best conditions)
    if (currentHour >= 8 && currentHour <= 18) {
      return 'Now - Current conditions are within optimal time window';
    } else if (currentHour < 8) {
      return `${8}:00 - Wait for better daylight conditions`;
    } else {
      return 'Tomorrow 8:00 - Wait for daylight hours';
    }
  }

  private fallbackPrediction(mission: Mission, env: EnvironmentalFactors): MissionPrediction {
    // Rule-based fallback when ML model fails
    let successProbability = 0.7; // Base success rate
    
    // Apply simple rules
    if (env.weatherScore < 0.5) successProbability -= 0.2;
    if (env.windSpeed > 30) successProbability -= 0.3;
    if (env.visibility < 0.4) successProbability -= 0.15;
    if (mission.priority === 'emergency') successProbability += 0.1; // Better resources
    
    successProbability = Math.max(0.1, Math.min(0.95, successProbability));
    
    return this.generatePredictionResult(successProbability, mission, env);
  }

  async dispose(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
export const mlPredictionService = new MLPredictionService();
