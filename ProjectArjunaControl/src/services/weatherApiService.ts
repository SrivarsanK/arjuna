import { EnvironmentalFactors } from './mlPredictionService';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  cloudCover: number;
  precipitation: number;
  pressure: number;
  uvIndex: number;
  condition: string;
  description: string;
}

export interface WeatherForecast {
  current: WeatherData;
  hourly: WeatherData[];
  daily: WeatherData[];
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  startTime: string;
  endTime: string;
  areas: string[];
}

export interface WeatherAnalysis {
  missionViability: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Dangerous';
  flightSafety: number; // 0-1 score
  recommendations: string[];
  optimalWindow: {
    start: string;
    end: string;
    confidence: number;
  } | null;
  environmentalFactors: EnvironmentalFactors;
}

class WeatherApiService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private geoUrl = 'http://api.openweathermap.org/geo/1.0';

  constructor() {
    // In production, this would come from environment variables
    this.apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || 'demo_key';
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseCurrentWeather(data);
    } catch (error) {
      console.error('Failed to fetch current weather:', error);
      
      // Return mock data for development
      return this.getMockWeatherData();
    }
  }

  async getWeatherForecast(latitude: number, longitude: number): Promise<WeatherForecast> {
    try {
      const [currentData, forecastData, alertsData] = await Promise.all([
        this.getCurrentWeather(latitude, longitude),
        this.getForecastData(latitude, longitude),
        this.getWeatherAlerts(latitude, longitude)
      ]);

      return {
        current: currentData,
        hourly: forecastData.hourly,
        daily: forecastData.daily,
        alerts: alertsData
      };
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      
      // Return mock data for development
      return this.getMockForecast();
    }
  }

  private async getForecastData(latitude: number, longitude: number) {
    const response = await fetch(
      `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.parseForecastData(data);
  }

  private async getWeatherAlerts(latitude: number, longitude: number): Promise<WeatherAlert[]> {
    try {
      // Note: OpenWeatherMap alerts require a paid subscription
      // For demo purposes, return mock alerts based on weather conditions
      const current = await this.getCurrentWeather(latitude, longitude);
      return this.generateMockAlerts(current);
    } catch (error) {
      console.error('Failed to fetch weather alerts:', error);
      return [];
    }
  }

  async analyzeWeatherForMission(
    latitude: number, 
    longitude: number,
    missionStartTime?: Date
  ): Promise<WeatherAnalysis> {
    try {
      const forecast = await this.getWeatherForecast(latitude, longitude);
      const current = forecast.current;
      
      // Calculate flight safety score
      const flightSafety = this.calculateFlightSafety(current);
      
      // Determine mission viability
      const missionViability = this.assessMissionViability(flightSafety, current);
      
      // Generate recommendations
      const recommendations = this.generateWeatherRecommendations(current, forecast.alerts);
      
      // Find optimal weather window
      const optimalWindow = this.findOptimalWeatherWindow(forecast.hourly);
      
      // Convert to environmental factors for ML model
      const environmentalFactors = this.convertToEnvironmentalFactors(current);

      return {
        missionViability,
        flightSafety,
        recommendations,
        optimalWindow,
        environmentalFactors
      };
    } catch (error) {
      console.error('Weather analysis failed:', error);
      
      // Return fallback analysis
      return this.getFallbackAnalysis();
    }
  }

  private parseCurrentWeather(data: any): WeatherData {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: (data.wind?.speed || 0) * 3.6, // Convert m/s to km/h
      windDirection: data.wind?.deg || 0,
      visibility: (data.visibility || 10000) / 1000, // Convert to km
      cloudCover: data.clouds?.all || 0,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      pressure: data.main.pressure,
      uvIndex: 0, // Not available in current weather endpoint
      condition: data.weather[0]?.main || 'Unknown',
      description: data.weather[0]?.description || 'No description'
    };
  }

  private parseForecastData(data: any) {
    const hourly: WeatherData[] = [];
    const daily: WeatherData[] = [];
    
    data.list.forEach((item: any, index: number) => {
      const weatherData = this.parseCurrentWeather(item);
      
      hourly.push(weatherData);
      
      // Add to daily if it's the first entry of the day (every 8th entry ≈ 24 hours)
      if (index % 8 === 0) {
        daily.push(weatherData);
      }
    });
    
    return { hourly: hourly.slice(0, 24), daily: daily.slice(0, 7) };
  }

  private calculateFlightSafety(weather: WeatherData): number {
    let safetyScore = 1.0;
    
    // Wind speed impact (critical for drone operations)
    if (weather.windSpeed > 40) safetyScore -= 0.4;
    else if (weather.windSpeed > 25) safetyScore -= 0.2;
    else if (weather.windSpeed > 15) safetyScore -= 0.1;
    
    // Visibility impact
    if (weather.visibility < 1) safetyScore -= 0.3;
    else if (weather.visibility < 3) safetyScore -= 0.2;
    else if (weather.visibility < 5) safetyScore -= 0.1;
    
    // Precipitation impact
    if (weather.precipitation > 5) safetyScore -= 0.3;
    else if (weather.precipitation > 1) safetyScore -= 0.15;
    else if (weather.precipitation > 0.1) safetyScore -= 0.05;
    
    // Temperature extremes
    if (weather.temperature < -10 || weather.temperature > 40) safetyScore -= 0.2;
    else if (weather.temperature < 0 || weather.temperature > 35) safetyScore -= 0.1;
    
    // Cloud cover (affects visibility and potential weather changes)
    if (weather.cloudCover > 90) safetyScore -= 0.1;
    
    return Math.max(0, Math.min(1, safetyScore));
  }

  private assessMissionViability(
    flightSafety: number, 
    weather: WeatherData
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Dangerous' {
    if (flightSafety >= 0.9) return 'Excellent';
    if (flightSafety >= 0.75) return 'Good';
    if (flightSafety >= 0.5) return 'Fair';
    if (flightSafety >= 0.3) return 'Poor';
    return 'Dangerous';
  }

  private generateWeatherRecommendations(weather: WeatherData, alerts: WeatherAlert[]): string[] {
    const recommendations: string[] = [];
    
    if (weather.windSpeed > 25) {
      recommendations.push(`High wind speeds (${weather.windSpeed.toFixed(1)} km/h) - Consider postponing mission`);
    } else if (weather.windSpeed > 15) {
      recommendations.push(`Moderate winds (${weather.windSpeed.toFixed(1)} km/h) - Use wind-resistant flight path`);
    }
    
    if (weather.visibility < 3) {
      recommendations.push(`Poor visibility (${weather.visibility.toFixed(1)} km) - Enhanced navigation equipment required`);
    }
    
    if (weather.precipitation > 1) {
      recommendations.push(`Active precipitation (${weather.precipitation.toFixed(1)} mm/h) - Weather-resistant equipment needed`);
    }
    
    if (weather.temperature < 0) {
      recommendations.push(`Freezing temperatures (${weather.temperature.toFixed(1)}°C) - Battery performance may be reduced`);
    } else if (weather.temperature > 35) {
      recommendations.push(`High temperatures (${weather.temperature.toFixed(1)}°C) - Monitor equipment for overheating`);
    }
    
    if (alerts.length > 0) {
      const severeAlerts = alerts.filter(alert => alert.severity === 'High' || alert.severity === 'Extreme');
      if (severeAlerts.length > 0) {
        recommendations.push(`Severe weather alerts active - Mission should be postponed`);
      } else {
        recommendations.push(`Weather alerts active - Monitor conditions closely`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Weather conditions are favorable for drone operations');
    }
    
    return recommendations;
  }

  private findOptimalWeatherWindow(hourlyForecast: WeatherData[]) {
    let bestWindow = null;
    let bestScore = 0;
    
    // Check 4-hour windows
    for (let i = 0; i <= hourlyForecast.length - 4; i++) {
      const windowData = hourlyForecast.slice(i, i + 4);
      const avgScore = windowData.reduce((sum, data) => sum + this.calculateFlightSafety(data), 0) / 4;
      
      if (avgScore > bestScore && avgScore > 0.7) {
        bestScore = avgScore;
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + i);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 4);
        
        bestWindow = {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          confidence: avgScore
        };
      }
    }
    
    return bestWindow;
  }

  private convertToEnvironmentalFactors(weather: WeatherData): EnvironmentalFactors {
    const currentHour = new Date().getHours();
    
    // Calculate weather score (0-1, higher is better)
    let weatherScore = 1.0;
    if (weather.windSpeed > 20) weatherScore -= 0.3;
    if (weather.precipitation > 0.5) weatherScore -= 0.2;
    if (weather.visibility < 5) weatherScore -= 0.2;
    if (weather.cloudCover > 80) weatherScore -= 0.1;
    weatherScore = Math.max(0, weatherScore);
    
    // Simple terrain difficulty (would be enhanced with actual terrain data)
    const terrainDifficulty = 0.3; // Default moderate difficulty
    
    // Visibility score (0-1)
    const visibilityScore = Math.min(1, weather.visibility / 10);
    
    return {
      weatherScore,
      terrainDifficulty,
      timeOfDay: currentHour,
      visibility: visibilityScore,
      windSpeed: weather.windSpeed,
      temperature: weather.temperature
    };
  }

  private generateMockAlerts(weather: WeatherData): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    
    if (weather.windSpeed > 35) {
      alerts.push({
        id: 'wind-alert-1',
        title: 'High Wind Warning',
        description: `Sustained winds of ${weather.windSpeed.toFixed(1)} km/h. Drone operations not recommended.`,
        severity: 'High',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        areas: ['Mission Area']
      });
    }
    
    if (weather.precipitation > 5) {
      alerts.push({
        id: 'precip-alert-1',
        title: 'Heavy Precipitation Warning',
        description: `Heavy rain/snow affecting visibility and equipment operation.`,
        severity: 'Moderate',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        areas: ['Mission Area']
      });
    }
    
    return alerts;
  }

  private getMockWeatherData(): WeatherData {
    return {
      temperature: 18,
      humidity: 65,
      windSpeed: 12,
      windDirection: 230,
      visibility: 8,
      cloudCover: 40,
      precipitation: 0,
      pressure: 1013,
      uvIndex: 5,
      condition: 'Partly Cloudy',
      description: 'partly cloudy'
    };
  }

  private getMockForecast(): WeatherForecast {
    const current = this.getMockWeatherData();
    const hourly = Array(24).fill(null).map((_, i) => ({
      ...current,
      temperature: current.temperature + Math.sin(i / 4) * 3,
      windSpeed: current.windSpeed + Math.random() * 5 - 2.5
    }));
    const daily = Array(7).fill(null).map((_, i) => ({
      ...current,
      temperature: current.temperature + Math.random() * 10 - 5
    }));
    
    return {
      current,
      hourly,
      daily,
      alerts: []
    };
  }

  private getFallbackAnalysis(): WeatherAnalysis {
    const mockWeather = this.getMockWeatherData();
    return {
      missionViability: 'Good',
      flightSafety: 0.8,
      recommendations: ['Using fallback weather data - connect to internet for real-time conditions'],
      optimalWindow: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        confidence: 0.8
      },
      environmentalFactors: this.convertToEnvironmentalFactors(mockWeather)
    };
  }
}

// Singleton instance
export const weatherApiService = new WeatherApiService();
