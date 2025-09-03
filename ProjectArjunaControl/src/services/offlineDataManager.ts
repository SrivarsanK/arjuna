import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mission, MissionLog, Profile } from '../types';
import { supabase } from './supabaseClient';

export interface OfflineData {
  missions: Mission[];
  missionLogs: Record<string, MissionLog[]>;
  userProfile: Profile | null;
  lastSync: string;
  version: number;
}

export class OfflineDataManager {
  private static readonly STORAGE_KEY = 'arjuna_offline_data';
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  
  // Cache mission data for offline access
  static async cacheMissionData(missions: Mission[], userProfile: Profile | null): Promise<void> {
    try {
      const offlineData: OfflineData = {
        missions,
        missionLogs: {},
        userProfile,
        lastSync: new Date().toISOString(),
        version: 1,
      };

      // Cache mission logs for each mission
      for (const mission of missions) {
        try {
          const { data: logs } = await supabase
            .from('mission_logs')
            .select('*')
            .eq('mission_id', mission.id)
            .order('created_at', { ascending: false });
          
          if (logs) {
            offlineData.missionLogs[mission.id] = logs;
          }
        } catch (error) {
          console.warn(`Failed to cache logs for mission ${mission.id}:`, error);
        }
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineData));
      console.log('Mission data cached successfully');
    } catch (error) {
      console.error('Failed to cache mission data:', error);
    }
  }

  // Retrieve cached mission data
  static async getCachedMissionData(): Promise<OfflineData | null> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!cached) return null;

      const offlineData: OfflineData = JSON.parse(cached);
      
      // Check if cache is too old
      const lastSync = new Date(offlineData.lastSync);
      const now = new Date();
      const cacheAge = now.getTime() - lastSync.getTime();
      
      if (cacheAge > this.MAX_CACHE_AGE) {
        console.log('Cache is too old, clearing...');
        await this.clearCache();
        return null;
      }

      return offlineData;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      return null;
    }
  }

  // Check if we have valid cached data
  static async hasCachedData(): Promise<boolean> {
    const cached = await this.getCachedMissionData();
    return cached !== null;
  }

  // Get cached missions
  static async getCachedMissions(): Promise<Mission[]> {
    const cached = await this.getCachedMissionData();
    return cached?.missions || [];
  }

  // Get cached mission logs for a specific mission
  static async getCachedMissionLogs(missionId: string): Promise<MissionLog[]> {
    const cached = await this.getCachedMissionData();
    return cached?.missionLogs[missionId] || [];
  }

  // Get cached user profile
  static async getCachedUserProfile(): Promise<Profile | null> {
    const cached = await this.getCachedMissionData();
    return cached?.userProfile || null;
  }

  // Clear all cached data
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Update specific mission in cache
  static async updateCachedMission(updatedMission: Mission): Promise<void> {
    try {
      const cached = await this.getCachedMissionData();
      if (!cached) return;

      const missionIndex = cached.missions.findIndex(m => m.id === updatedMission.id);
      if (missionIndex !== -1) {
        cached.missions[missionIndex] = updatedMission;
        cached.lastSync = new Date().toISOString();
        
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(cached));
        console.log('Cached mission updated successfully');
      }
    } catch (error) {
      console.error('Failed to update cached mission:', error);
    }
  }

  // Add new mission log to cache
  static async addCachedMissionLog(missionId: string, log: MissionLog): Promise<void> {
    try {
      const cached = await this.getCachedMissionData();
      if (!cached) return;

      if (!cached.missionLogs[missionId]) {
        cached.missionLogs[missionId] = [];
      }
      
      cached.missionLogs[missionId].unshift(log);
      cached.lastSync = new Date().toISOString();
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(cached));
      console.log('Mission log added to cache successfully');
    } catch (error) {
      console.error('Failed to add mission log to cache:', error);
    }
  }

  // Queue offline actions for later sync
  static async queueOfflineAction(action: {
    type: 'create_mission' | 'update_mission' | 'add_log';
    data: any;
    timestamp: string;
  }): Promise<void> {
    try {
      const queueKey = 'arjuna_offline_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push(action);
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('Offline action queued successfully');
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  // Process queued offline actions when back online
  static async processOfflineQueue(): Promise<void> {
    try {
      const queueKey = 'arjuna_offline_queue';
      const queueData = await AsyncStorage.getItem(queueKey);
      
      if (!queueData) return;
      
      const queue = JSON.parse(queueData);
      console.log(`Processing ${queue.length} offline actions...`);
      
      for (const action of queue) {
        try {
          await this.processOfflineAction(action);
        } catch (error) {
          console.error('Failed to process offline action:', action, error);
        }
      }
      
      // Clear the queue after processing
      await AsyncStorage.removeItem(queueKey);
      console.log('Offline queue processed and cleared');
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  private static async processOfflineAction(action: any): Promise<void> {
    switch (action.type) {
      case 'create_mission':
        await supabase.from('missions').insert(action.data);
        break;
      case 'update_mission':
        await supabase.from('missions').update(action.data).eq('id', action.data.id);
        break;
      case 'add_log':
        await supabase.from('mission_logs').insert(action.data);
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  // Check network connectivity and sync if needed
  static async syncIfOnline(): Promise<boolean> {
    try {
      // Simple network check by trying to fetch from Supabase
      const { data, error } = await supabase.from('missions').select('id').limit(1);
      
      if (!error) {
        await this.processOfflineQueue();
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('App is offline, using cached data');
      return false;
    }
  }
}
