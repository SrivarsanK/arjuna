/**
 * International API Integration Service
 * Handles integration with UN OCHA, Red Cross, and other humanitarian APIs
 */

export interface UNOCHAEvent {
  id: string;
  name: string;
  description: string;
  country: string;
  region: string;
  type: 'earthquake' | 'flood' | 'hurricane' | 'drought' | 'conflict' | 'epidemic' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  affectedPopulation: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  funding: {
    requested: number;
    received: number;
    currency: string;
  };
  organizations: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface RedCrossOperation {
  id: string;
  appealNumber: string;
  name: string;
  country: string;
  disasterType: string;
  numBeneficiaries: number;
  amountRequested: number;
  amountRaised: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'suspended';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  operationType: 'emergency' | 'recovery' | 'preparedness';
}

export interface GovernmentEmergencyAPI {
  country: string;
  endpoint: string;
  apiKey: string;
  status: 'active' | 'inactive';
  lastSync: string;
  supportedOperations: string[];
}

export interface SatelliteDataFeed {
  provider: 'nasa' | 'esa' | 'noaa' | 'commercial';
  dataType: 'weather' | 'terrain' | 'damage_assessment' | 'population_density';
  coverage: 'global' | 'regional' | 'local';
  resolution: number; // meters per pixel
  updateFrequency: number; // hours
  latency: number; // minutes
  endpoint: string;
  status: 'active' | 'maintenance' | 'offline';
}

export interface InternationalCoordinationRequest {
  requestId: string;
  requestingOrganization: string;
  targetOrganization: string;
  missionId: string;
  requestType: 'resource_sharing' | 'coordination' | 'information_sharing' | 'joint_operation';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  requiredResources?: string[];
  proposedTimeline: {
    start: string;
    end: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  responses: Array<{
    organization: string;
    response: 'accept' | 'decline' | 'negotiate';
    message: string;
    timestamp: string;
  }>;
}

class InternationalAPIService {
  private static instance: InternationalAPIService;
  private unochaBaseUrl = 'https://api.reliefweb.int/v1';
  private redCrossBaseUrl = 'https://api.go.ifrc.org/v2';
  private governmentAPIs: Map<string, GovernmentEmergencyAPI> = new Map();
  private satelliteFeeds: Map<string, SatelliteDataFeed> = new Map();

  private constructor() {
    this.initializeGovernmentAPIs();
    this.initializeSatelliteFeeds();
  }

  public static getInstance(): InternationalAPIService {
    if (!InternationalAPIService.instance) {
      InternationalAPIService.instance = new InternationalAPIService();
    }
    return InternationalAPIService.instance;
  }

  private initializeGovernmentAPIs(): void {
    const apis: GovernmentEmergencyAPI[] = [
      {
        country: 'US',
        endpoint: 'https://api.fema.gov/open/v2',
        apiKey: process.env.FEMA_API_KEY || '',
        status: 'active',
        lastSync: new Date().toISOString(),
        supportedOperations: ['disasters', 'declarations', 'assistance']
      },
      {
        country: 'EU',
        endpoint: 'https://api.echo.europa.eu/v1',
        apiKey: process.env.EU_ECHO_API_KEY || '',
        status: 'active',
        lastSync: new Date().toISOString(),
        supportedOperations: ['humanitarian_aid', 'crisis_response', 'funding']
      },
      {
        country: 'UK',
        endpoint: 'https://api.gov.uk/emergency-management/v1',
        apiKey: process.env.UK_EMERGENCY_API_KEY || '',
        status: 'active',
        lastSync: new Date().toISOString(),
        supportedOperations: ['emergency_alerts', 'response_coordination']
      },
      {
        country: 'AU',
        endpoint: 'https://api.emergency.gov.au/v1',
        apiKey: process.env.AU_EMERGENCY_API_KEY || '',
        status: 'active',
        lastSync: new Date().toISOString(),
        supportedOperations: ['warnings', 'incidents', 'resources']
      },
      {
        country: 'CA',
        endpoint: 'https://api.publicsafety.gc.ca/v1',
        apiKey: process.env.CA_SAFETY_API_KEY || '',
        status: 'active',
        lastSync: new Date().toISOString(),
        supportedOperations: ['emergency_management', 'alerts', 'preparedness']
      }
    ];

    apis.forEach(api => {
      this.governmentAPIs.set(api.country, api);
    });
  }

  private initializeSatelliteFeeds(): void {
    const feeds: SatelliteDataFeed[] = [
      {
        provider: 'nasa',
        dataType: 'weather',
        coverage: 'global',
        resolution: 1000,
        updateFrequency: 3,
        latency: 30,
        endpoint: 'https://api.nasa.gov/planetary/earth/imagery',
        status: 'active'
      },
      {
        provider: 'esa',
        dataType: 'terrain',
        coverage: 'global',
        resolution: 10,
        updateFrequency: 24,
        latency: 60,
        endpoint: 'https://api.esa.int/copernicus/imagery',
        status: 'active'
      },
      {
        provider: 'noaa',
        dataType: 'weather',
        coverage: 'global',
        resolution: 500,
        updateFrequency: 1,
        latency: 15,
        endpoint: 'https://api.weather.gov/imagery',
        status: 'active'
      }
    ];

    feeds.forEach(feed => {
      this.satelliteFeeds.set(`${feed.provider}_${feed.dataType}`, feed);
    });
  }

  /**
   * Get current disasters from UN OCHA
   */
  public async getUNOCHADisasters(country?: string, disasterType?: string): Promise<UNOCHAEvent[]> {
    try {
      let url = `${this.unochaBaseUrl}/disasters`;
      const params = new URLSearchParams();
      
      if (country) params.append('filter[field]=country&filter[value]', country);
      if (disasterType) params.append('filter[field]=type&filter[value]', disasterType);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Arjuna-Control/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`OCHA API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.data.map((disaster: any) => ({
        id: disaster.id,
        name: disaster.fields.name,
        description: disaster.fields.description || '',
        country: disaster.fields.country?.[0]?.name || 'Unknown',
        region: disaster.fields.region?.[0]?.name || 'Unknown',
        type: this.mapDisasterType(disaster.fields.type?.[0]?.name),
        severity: this.mapSeverity(disaster.fields.severity),
        startDate: disaster.fields.date?.created || new Date().toISOString(),
        endDate: disaster.fields.date?.end,
        affectedPopulation: disaster.fields.population?.affected || 0,
        coordinates: {
          latitude: disaster.fields.coordinate?.lat || 0,
          longitude: disaster.fields.coordinate?.lon || 0
        },
        funding: {
          requested: disaster.fields.funding?.requested || 0,
          received: disaster.fields.funding?.received || 0,
          currency: disaster.fields.funding?.currency || 'USD'
        },
        organizations: disaster.fields.organizations?.map((org: any) => org.name) || [],
        contact: {
          name: disaster.fields.contact?.name || 'Unknown',
          email: disaster.fields.contact?.email || '',
          phone: disaster.fields.contact?.phone || ''
        }
      }));
    } catch (error) {
      console.error('Error fetching OCHA disasters:', error);
      return [];
    }
  }

  /**
   * Get Red Cross operations
   */
  public async getRedCrossOperations(country?: string): Promise<RedCrossOperation[]> {
    try {
      let url = `${this.redCrossBaseUrl}/appeals`;
      if (country) {
        url += `?country=${country}`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${process.env.IFRC_API_KEY || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Red Cross API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results.map((appeal: any) => ({
        id: appeal.id,
        appealNumber: appeal.code,
        name: appeal.name,
        country: appeal.country?.name || 'Unknown',
        disasterType: appeal.dtype?.name || 'Unknown',
        numBeneficiaries: appeal.num_beneficiaries || 0,
        amountRequested: appeal.amount_requested || 0,
        amountRaised: appeal.amount_funded || 0,
        startDate: appeal.start_date,
        endDate: appeal.end_date,
        status: appeal.status === 'Active' ? 'active' : 'completed',
        coordinates: {
          latitude: appeal.country?.bbox?.[1] || 0,
          longitude: appeal.country?.bbox?.[0] || 0
        },
        operationType: this.mapOperationType(appeal.atype?.name)
      }));
    } catch (error) {
      console.error('Error fetching Red Cross operations:', error);
      return [];
    }
  }

  /**
   * Create international coordination request
   */
  public async createCoordinationRequest(
    request: Omit<InternationalCoordinationRequest, 'requestId' | 'status' | 'responses'>
  ): Promise<InternationalCoordinationRequest> {
    const coordinationRequest: InternationalCoordinationRequest = {
      ...request,
      requestId: `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      responses: []
    };

    // In a real implementation, this would be sent to the target organization
    // For now, we'll simulate the process
    try {
      // Send notification to target organization
      await this.notifyOrganization(coordinationRequest);
      
      // Store the request (in real app, this would be in a database)
      console.log('Coordination request created:', coordinationRequest);
      
      return coordinationRequest;
    } catch (error) {
      console.error('Error creating coordination request:', error);
      throw error;
    }
  }

  /**
   * Get satellite imagery for disaster assessment
   */
  public async getSatelliteImagery(
    latitude: number,
    longitude: number,
    dataType: SatelliteDataFeed['dataType'] = 'damage_assessment',
    provider?: SatelliteDataFeed['provider']
  ): Promise<{
    imageUrl: string;
    metadata: {
      provider: string;
      captureTime: string;
      resolution: number;
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    };
  }> {
    try {
      // Find the best satellite feed
      let feed: SatelliteDataFeed | undefined;
      
      if (provider) {
        feed = this.satelliteFeeds.get(`${provider}_${dataType}`);
      } else {
        // Find the best available feed for this data type
        for (const [key, f] of this.satelliteFeeds.entries()) {
          if (f.dataType === dataType && f.status === 'active') {
            if (!feed || f.resolution < feed.resolution) {
              feed = f;
            }
          }
        }
      }

      if (!feed) {
        throw new Error(`No satellite feed available for ${dataType}`);
      }

      // For NASA API example
      if (feed.provider === 'nasa') {
        const response = await fetch(
          `${feed.endpoint}?lon=${longitude}&lat=${latitude}&date=2024-09-03&dim=0.1&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`
        );

        if (!response.ok) {
          throw new Error(`Satellite API error: ${response.status}`);
        }

        const data = await response.json();
        
        return {
          imageUrl: data.url,
          metadata: {
            provider: feed.provider,
            captureTime: data.date,
            resolution: feed.resolution,
            bounds: {
              north: latitude + 0.05,
              south: latitude - 0.05,
              east: longitude + 0.05,
              west: longitude - 0.05
            }
          }
        };
      }

      // Default response for other providers
      return {
        imageUrl: `${feed.endpoint}/imagery?lat=${latitude}&lon=${longitude}`,
        metadata: {
          provider: feed.provider,
          captureTime: new Date().toISOString(),
          resolution: feed.resolution,
          bounds: {
            north: latitude + 0.05,
            south: latitude - 0.05,
            east: longitude + 0.05,
            west: longitude - 0.05
          }
        }
      };
    } catch (error) {
      console.error('Error fetching satellite imagery:', error);
      throw error;
    }
  }

  /**
   * Sync with government emergency APIs
   */
  public async syncGovernmentAPIs(): Promise<{
    success: boolean;
    results: Array<{
      country: string;
      status: 'success' | 'error';
      message: string;
      dataCount: number;
    }>;
  }> {
    const results = [];

    for (const [country, api] of this.governmentAPIs.entries()) {
      try {
        if (api.status !== 'active') {
          results.push({
            country,
            status: 'error' as const,
            message: 'API is inactive',
            dataCount: 0
          });
          continue;
        }

        const response = await fetch(`${api.endpoint}/disasters`, {
          headers: {
            'Authorization': `Bearer ${api.apiKey}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          api.lastSync = new Date().toISOString();
          
          results.push({
            country,
            status: 'success' as const,
            message: 'Successfully synced',
            dataCount: Array.isArray(data) ? data.length : (data.count || 0)
          });
        } else {
          results.push({
            country,
            status: 'error' as const,
            message: `HTTP ${response.status}`,
            dataCount: 0
          });
        }
      } catch (error) {
        results.push({
          country,
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
          dataCount: 0
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    
    return {
      success: successCount > 0,
      results
    };
  }

  private async notifyOrganization(request: InternationalCoordinationRequest): Promise<void> {
    // In a real implementation, this would send notifications via email, webhook, etc.
    console.log(`Notifying ${request.targetOrganization} about coordination request ${request.requestId}`);
  }

  private mapDisasterType(type: string): UNOCHAEvent['type'] {
    const typeMap: Record<string, UNOCHAEvent['type']> = {
      'earthquake': 'earthquake',
      'flood': 'flood',
      'hurricane': 'hurricane',
      'cyclone': 'hurricane',
      'drought': 'drought',
      'conflict': 'conflict',
      'epidemic': 'epidemic',
      'pandemic': 'epidemic'
    };
    
    return typeMap[type?.toLowerCase()] || 'other';
  }

  private mapSeverity(severity: any): UNOCHAEvent['severity'] {
    if (!severity) return 'medium';
    
    const level = severity.toString().toLowerCase();
    if (level.includes('critical') || level.includes('severe')) return 'critical';
    if (level.includes('high') || level.includes('major')) return 'high';
    if (level.includes('low') || level.includes('minor')) return 'low';
    
    return 'medium';
  }

  private mapOperationType(type: string): RedCrossOperation['operationType'] {
    if (!type) return 'emergency';
    
    const typeMap: Record<string, RedCrossOperation['operationType']> = {
      'emergency': 'emergency',
      'recovery': 'recovery',
      'preparedness': 'preparedness',
      'dref': 'emergency'
    };
    
    return typeMap[type.toLowerCase()] || 'emergency';
  }

  /**
   * Get all available government APIs
   */
  public getGovernmentAPIs(): Map<string, GovernmentEmergencyAPI> {
    return new Map(this.governmentAPIs);
  }

  /**
   * Get all satellite feeds
   */
  public getSatelliteFeeds(): Map<string, SatelliteDataFeed> {
    return new Map(this.satelliteFeeds);
  }
}

export default InternationalAPIService;
