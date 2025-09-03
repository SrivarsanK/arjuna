/**
 * Global Configuration Service
 * Manages multi-region deployment, time zones, and global settings
 */

export interface GlobalRegion {
  id: string;
  name: string;
  code: string;
  timezone: string;
  endpoint: string;
  latency: number;
  status: 'active' | 'maintenance' | 'offline';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface GlobalConfiguration {
  currentRegion: string;
  availableRegions: GlobalRegion[];
  globalSettings: {
    defaultLanguage: string;
    supportedLanguages: string[];
    emergencyCoordinationCenter: string;
    globalEmergencyContact: string;
  };
}

export interface TimeZoneInfo {
  timezone: string;
  offset: number;
  abbreviation: string;
  localTime: string;
  utcTime: string;
}

class GlobalConfigurationService {
  private static instance: GlobalConfigurationService;
  private config: GlobalConfiguration;
  private regions: Map<string, GlobalRegion> = new Map();

  private constructor() {
    this.initializeRegions();
    this.config = this.getDefaultConfiguration();
  }

  public static getInstance(): GlobalConfigurationService {
    if (!GlobalConfigurationService.instance) {
      GlobalConfigurationService.instance = new GlobalConfigurationService();
    }
    return GlobalConfigurationService.instance;
  }

  private initializeRegions(): void {
    const globalRegions: GlobalRegion[] = [
      {
        id: 'us-east-1',
        name: 'US East (Virginia)',
        code: 'USE1',
        timezone: 'America/New_York',
        endpoint: 'https://us-east-1.arjuna-control.com',
        latency: 0,
        status: 'active',
        coordinates: { latitude: 39.0458, longitude: -76.6413 }
      },
      {
        id: 'eu-west-1',
        name: 'Europe (Ireland)',
        code: 'EUW1',
        timezone: 'Europe/Dublin',
        endpoint: 'https://eu-west-1.arjuna-control.com',
        latency: 0,
        status: 'active',
        coordinates: { latitude: 53.3498, longitude: -6.2603 }
      },
      {
        id: 'ap-southeast-1',
        name: 'Asia Pacific (Singapore)',
        code: 'APS1',
        timezone: 'Asia/Singapore',
        endpoint: 'https://ap-southeast-1.arjuna-control.com',
        latency: 0,
        status: 'active',
        coordinates: { latitude: 1.3521, longitude: 103.8198 }
      },
      {
        id: 'af-south-1',
        name: 'Africa (Cape Town)',
        code: 'AFS1',
        timezone: 'Africa/Johannesburg',
        endpoint: 'https://af-south-1.arjuna-control.com',
        latency: 0,
        status: 'active',
        coordinates: { latitude: -33.9249, longitude: 18.4241 }
      },
      {
        id: 'sa-east-1',
        name: 'South America (São Paulo)',
        code: 'SAE1',
        timezone: 'America/Sao_Paulo',
        endpoint: 'https://sa-east-1.arjuna-control.com',
        latency: 0,
        status: 'active',
        coordinates: { latitude: -23.5505, longitude: -46.6333 }
      }
    ];

    globalRegions.forEach(region => {
      this.regions.set(region.id, region);
    });
  }

  private getDefaultConfiguration(): GlobalConfiguration {
    return {
      currentRegion: 'us-east-1',
      availableRegions: Array.from(this.regions.values()),
      globalSettings: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ar', 'ru', 'pt', 'hi', 'ja'],
        emergencyCoordinationCenter: 'Global Emergency Coordination Center',
        globalEmergencyContact: '+1-800-ARJUNA-EMERGENCY'
      }
    };
  }

  /**
   * Get the optimal region based on user's location
   */
  public async getOptimalRegion(userLatitude: number, userLongitude: number): Promise<GlobalRegion> {
    let closestRegion = this.regions.get('us-east-1')!;
    let minDistance = Infinity;

    for (const region of this.regions.values()) {
      if (region.status !== 'active') continue;

      const distance = this.calculateDistance(
        userLatitude,
        userLongitude,
        region.coordinates.latitude,
        region.coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestRegion = region;
      }
    }

    // Test latency to confirm optimal region
    await this.testRegionLatency(closestRegion);
    return closestRegion;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Test latency to a specific region
   */
  private async testRegionLatency(region: GlobalRegion): Promise<number> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${region.endpoint}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const latency = Date.now() - startTime;
        region.latency = latency;
        return latency;
      }
    } catch (error) {
      console.warn(`Failed to test latency for region ${region.id}:`, error);
      region.latency = 9999; // High latency for failed regions
    }
    
    return region.latency;
  }

  /**
   * Get all available regions with current status
   */
  public async getAllRegionsWithStatus(): Promise<GlobalRegion[]> {
    const regions = Array.from(this.regions.values());
    
    // Test latency for all regions in parallel
    await Promise.all(
      regions.map(region => this.testRegionLatency(region))
    );

    return regions.sort((a, b) => a.latency - b.latency);
  }

  /**
   * Switch to a different region
   */
  public async switchRegion(regionId: string): Promise<boolean> {
    const region = this.regions.get(regionId);
    if (!region || region.status !== 'active') {
      throw new Error(`Region ${regionId} is not available`);
    }

    // Test the region before switching
    await this.testRegionLatency(region);
    
    if (region.latency < 5000) { // 5 second timeout
      this.config.currentRegion = regionId;
      return true;
    }
    
    return false;
  }

  /**
   * Get time zone information for all regions
   */
  public getGlobalTimeZones(): TimeZoneInfo[] {
    const now = new Date();
    
    return Array.from(this.regions.values()).map(region => {
      const localTime = now.toLocaleString('en-US', { 
        timeZone: region.timezone,
        hour12: false 
      });
      
      const utcTime = now.toISOString();
      
      // Calculate offset
      const tempDate = new Date(now.toLocaleString('en-US', { timeZone: region.timezone }));
      const offset = (tempDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      return {
        timezone: region.timezone,
        offset,
        abbreviation: region.code,
        localTime,
        utcTime
      };
    });
  }

  /**
   * Convert time between different regions
   */
  public convertTime(time: Date, fromRegionId: string, toRegionId: string): Date {
    const fromRegion = this.regions.get(fromRegionId);
    const toRegion = this.regions.get(toRegionId);
    
    if (!fromRegion || !toRegion) {
      throw new Error('Invalid region ID');
    }

    // Convert to UTC first, then to target timezone
    const utcTime = new Date(time.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(utcTime.toLocaleString('en-US', { timeZone: toRegion.timezone }));
  }

  /**
   * Get current global configuration
   */
  public getConfiguration(): GlobalConfiguration {
    return { ...this.config };
  }

  /**
   * Update global settings
   */
  public updateGlobalSettings(settings: Partial<GlobalConfiguration['globalSettings']>): void {
    this.config.globalSettings = {
      ...this.config.globalSettings,
      ...settings
    };
  }

  /**
   * Get region by ID
   */
  public getRegion(regionId: string): GlobalRegion | undefined {
    return this.regions.get(regionId);
  }

  /**
   * Get current region
   */
  public getCurrentRegion(): GlobalRegion {
    return this.regions.get(this.config.currentRegion)!;
  }

  /**
   * Check if global services are healthy
   */
  public async performGlobalHealthCheck(): Promise<{
    healthy: boolean;
    regions: Array<{
      region: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number;
      lastChecked: string;
    }>;
  }> {
    const healthResults = await Promise.all(
      Array.from(this.regions.values()).map(async region => {
        const latency = await this.testRegionLatency(region);
        const lastChecked = new Date().toISOString();
        
        let status: 'healthy' | 'degraded' | 'unhealthy';
        if (latency < 1000) {
          status = 'healthy';
        } else if (latency < 3000) {
          status = 'degraded';
        } else {
          status = 'unhealthy';
        }

        return {
          region: region.id,
          status,
          latency,
          lastChecked
        };
      })
    );

    const healthyCount = healthResults.filter(r => r.status === 'healthy').length;
    const healthy = healthyCount >= Math.ceil(this.regions.size / 2); // At least half regions healthy

    return {
      healthy,
      regions: healthResults
    };
  }
}

export default GlobalConfigurationService;
