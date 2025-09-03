import { Mission } from '../types';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteWaypoint {
  id: string;
  coordinate: Coordinate;
  missionId?: string;
  type: 'base' | 'delivery' | 'waypoint';
  priority: number;
  estimatedTime?: number; // in minutes
}

export interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number; // in km
  totalTime: number; // in minutes
  efficiency: number; // percentage
  fuelConsumption: number; // estimated
}

export interface DroneSpecs {
  maxRange: number; // in km
  maxFlightTime: number; // in minutes
  speed: number; // km/h
  batteryCapacity: number; // percentage
}

export class RouteOptimizationService {
  private static readonly EARTH_RADIUS = 6371; // km
  private static readonly DEFAULT_DRONE_SPEED = 60; // km/h
  private static readonly BASE_LOCATION: Coordinate = {
    latitude: 40.7128, // Default to NYC coordinates
    longitude: -74.0060
  };

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
      Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Convert missions to route waypoints
  static missionsToWaypoints(missions: Mission[]): RouteWaypoint[] {
    const baseWaypoint: RouteWaypoint = {
      id: 'base',
      coordinate: this.BASE_LOCATION,
      type: 'base',
      priority: 0,
    };

    const missionWaypoints: RouteWaypoint[] = missions.map((mission, index) => ({
      id: mission.id,
      coordinate: mission.target_location,
      missionId: mission.id,
      type: 'delivery',
      priority: this.getPriorityValue(mission.priority),
    }));

    return [baseWaypoint, ...missionWaypoints];
  }

  private static getPriorityValue(priority: string): number {
    switch (priority) {
      case 'emergency': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  // Optimize route using nearest neighbor algorithm with priority weighting
  static optimizeRoute(
    missions: Mission[],
    droneSpecs: DroneSpecs = {
      maxRange: 50,
      maxFlightTime: 120,
      speed: this.DEFAULT_DRONE_SPEED,
      batteryCapacity: 100
    }
  ): OptimizedRoute {
    const waypoints = this.missionsToWaypoints(missions);
    
    if (waypoints.length <= 1) {
      return {
        waypoints,
        totalDistance: 0,
        totalTime: 0,
        efficiency: 100,
        fuelConsumption: 0,
      };
    }

    const optimizedWaypoints = this.nearestNeighborWithPriority(waypoints, droneSpecs);
    const metrics = this.calculateRouteMetrics(optimizedWaypoints, droneSpecs);

    return {
      waypoints: optimizedWaypoints,
      ...metrics,
    };
  }

  // Nearest neighbor algorithm with priority weighting
  private static nearestNeighborWithPriority(
    waypoints: RouteWaypoint[],
    droneSpecs: DroneSpecs
  ): RouteWaypoint[] {
    if (waypoints.length === 0) return [];

    const base = waypoints.find(w => w.type === 'base');
    if (!base) return waypoints;

    const unvisited = waypoints.filter(w => w.type !== 'base');
    const route: RouteWaypoint[] = [base];
    let currentPosition = base;
    let totalTime = 0;
    let totalDistance = 0;

    while (unvisited.length > 0 && totalTime < droneSpecs.maxFlightTime) {
      let bestNext: RouteWaypoint | null = null;
      let bestScore = Infinity;

      for (const waypoint of unvisited) {
        const distance = this.calculateDistance(currentPosition.coordinate, waypoint.coordinate);
        const time = (distance / droneSpecs.speed) * 60; // convert to minutes
        
        // Check if we can make it there and back to base
        const returnDistance = this.calculateDistance(waypoint.coordinate, base.coordinate);
        const returnTime = (returnDistance / droneSpecs.speed) * 60;
        
        if (totalTime + time + returnTime > droneSpecs.maxFlightTime) {
          continue; // Skip if we can't make it back
        }

        // Score based on distance and priority (lower is better)
        // Higher priority missions get lower scores (more likely to be selected)
        const priorityWeight = 6 - waypoint.priority; // Inverse priority for scoring
        const score = distance * priorityWeight;

        if (score < bestScore) {
          bestScore = score;
          bestNext = waypoint;
        }
      }

      if (!bestNext) break; // No feasible next waypoint

      const distance = this.calculateDistance(currentPosition.coordinate, bestNext.coordinate);
      const time = (distance / droneSpecs.speed) * 60;

      route.push(bestNext);
      currentPosition = bestNext;
      totalTime += time;
      totalDistance += distance;

      // Remove from unvisited
      const index = unvisited.indexOf(bestNext);
      unvisited.splice(index, 1);
    }

    // Add return to base
    if (route.length > 1 && route[route.length - 1].type !== 'base') {
      route.push(base);
    }

    return route;
  }

  // Calculate route metrics
  private static calculateRouteMetrics(
    waypoints: RouteWaypoint[],
    droneSpecs: DroneSpecs
  ): Omit<OptimizedRoute, 'waypoints'> {
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const distance = this.calculateDistance(
        waypoints[i].coordinate,
        waypoints[i + 1].coordinate
      );
      const time = (distance / droneSpecs.speed) * 60; // convert to minutes

      totalDistance += distance;
      totalTime += time;

      // Add estimated delivery time for delivery waypoints
      if (waypoints[i + 1].type === 'delivery') {
        totalTime += 5; // 5 minutes delivery time
      }
    }

    // Calculate efficiency (missions completed vs. attempted)
    const deliveryWaypoints = waypoints.filter(w => w.type === 'delivery').length;
    const efficiency = deliveryWaypoints > 0 ? 
      (deliveryWaypoints / (deliveryWaypoints)) * 100 : 100;

    // Estimate fuel consumption (simplified model)
    const fuelConsumption = Math.min(
      (totalTime / droneSpecs.maxFlightTime) * droneSpecs.batteryCapacity,
      100
    );

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime),
      efficiency: Math.round(efficiency * 100) / 100,
      fuelConsumption: Math.round(fuelConsumption),
    };
  }

  // Generate multiple route options
  static generateRouteOptions(
    missions: Mission[],
    droneSpecs?: DroneSpecs
  ): OptimizedRoute[] {
    const routes: OptimizedRoute[] = [];

    // Strategy 1: Priority-first routing
    const prioritySorted = [...missions].sort((a, b) => 
      this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
    );
    routes.push(this.optimizeRoute(prioritySorted, droneSpecs));

    // Strategy 2: Distance-based routing (nearest first)
    const distanceSorted = this.sortByDistanceFromBase(missions);
    routes.push(this.optimizeRoute(distanceSorted, droneSpecs));

    // Strategy 3: Mixed approach (current default)
    routes.push(this.optimizeRoute(missions, droneSpecs));

    return routes.sort((a, b) => b.efficiency - a.efficiency);
  }

  private static sortByDistanceFromBase(missions: Mission[]): Mission[] {
    return [...missions].sort((a, b) => {
      const distanceA = this.calculateDistance(this.BASE_LOCATION, a.target_location);
      const distanceB = this.calculateDistance(this.BASE_LOCATION, b.target_location);
      return distanceA - distanceB;
    });
  }

  // Check if route is feasible given drone constraints
  static validateRoute(route: OptimizedRoute, droneSpecs: DroneSpecs): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (route.totalDistance > droneSpecs.maxRange) {
      issues.push(`Route distance (${route.totalDistance}km) exceeds max range (${droneSpecs.maxRange}km)`);
    }

    if (route.totalTime > droneSpecs.maxFlightTime) {
      issues.push(`Route time (${route.totalTime}min) exceeds max flight time (${droneSpecs.maxFlightTime}min)`);
    }

    if (route.fuelConsumption > droneSpecs.batteryCapacity) {
      issues.push(`Route requires more fuel (${route.fuelConsumption}%) than available (${droneSpecs.batteryCapacity}%)`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  // Estimate arrival times for each waypoint
  static calculateArrivalTimes(route: OptimizedRoute, startTime: Date): Date[] {
    const arrivalTimes: Date[] = [];
    let currentTime = new Date(startTime);

    for (let i = 0; i < route.waypoints.length; i++) {
      arrivalTimes.push(new Date(currentTime));

      if (i < route.waypoints.length - 1) {
        const distance = this.calculateDistance(
          route.waypoints[i].coordinate,
          route.waypoints[i + 1].coordinate
        );
        const travelTime = (distance / this.DEFAULT_DRONE_SPEED) * 60; // minutes
        const deliveryTime = route.waypoints[i + 1].type === 'delivery' ? 5 : 0; // 5 min delivery

        currentTime = new Date(currentTime.getTime() + (travelTime + deliveryTime) * 60000);
      }
    }

    return arrivalTimes;
  }

  // Generate waypoint instructions for navigation
  static generateNavigationInstructions(route: OptimizedRoute): string[] {
    const instructions: string[] = [];

    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const current = route.waypoints[i];
      const next = route.waypoints[i + 1];
      const distance = this.calculateDistance(current.coordinate, next.coordinate);
      const bearing = this.calculateBearing(current.coordinate, next.coordinate);

      if (next.type === 'delivery') {
        instructions.push(
          `Proceed ${distance.toFixed(1)}km ${this.bearingToDirection(bearing)} to delivery point ${next.id}`
        );
      } else if (next.type === 'base') {
        instructions.push(
          `Return ${distance.toFixed(1)}km ${this.bearingToDirection(bearing)} to base`
        );
      }
    }

    return instructions;
  }

  private static calculateBearing(from: Coordinate, to: Coordinate): number {
    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }
}
