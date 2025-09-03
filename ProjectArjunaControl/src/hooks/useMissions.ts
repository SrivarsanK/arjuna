import { useState, useEffect } from 'react';
import { MissionService } from '../services/missionService';
import { Mission } from '../types';
import { useAuth } from './useAuth';

interface MissionStats {
  activeMissions: number;
  completedToday: number;
  successRate: string;
  totalMissions: number;
}

export const useMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<MissionStats>({
    activeMissions: 0,
    completedToday: 0,
    successRate: '0%',
    totalMissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load missions
  const loadMissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const missionsData = await MissionService.getMissions(user?.id, 10);
      const statsData = await MissionService.getMissionStats(user?.id);
      
      setMissions(missionsData || []);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading missions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load missions');
      
      // Set mock data on error
      setStats({
        activeMissions: 3,
        completedToday: 7,
        successRate: '94%',
        totalMissions: 156,
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new mission
  const createMission = async (missionData: Omit<Mission, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newMission = await MissionService.createMission(missionData);
      setMissions(prev => [newMission, ...prev]);
      await loadMissions(); // Refresh stats
      return newMission;
    } catch (err) {
      console.error('Error creating mission:', err);
      throw err;
    }
  };

  // Update mission status
  const updateMissionStatus = async (missionId: string, status: Mission['status'], notes?: string) => {
    try {
      const updatedMission = await MissionService.updateMissionStatus(missionId, status, notes);
      setMissions(prev => 
        prev.map(mission => 
          mission.id === missionId ? updatedMission : mission
        )
      );
      await loadMissions(); // Refresh stats
      return updatedMission;
    } catch (err) {
      console.error('Error updating mission status:', err);
      throw err;
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = MissionService.subscribeMissionUpdates((payload) => {
      console.log('Mission update:', payload);
      loadMissions(); // Refresh data on updates
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Load initial data
  useEffect(() => {
    loadMissions();
  }, [user?.id]);

  return {
    missions,
    stats,
    loading,
    error,
    loadMissions,
    createMission,
    updateMissionStatus,
  };
};

export const useMissionTracking = (missionId: string) => {
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tracking data
  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MissionService.getMissionTracking(missionId);
      setTrackingData(data || []);
    } catch (err) {
      console.error('Error loading tracking data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time tracking updates
  useEffect(() => {
    if (!missionId) return;

    const subscription = MissionService.subscribeMissionTracking(missionId, (payload) => {
      console.log('Tracking update:', payload);
      setTrackingData(prev => [payload.new, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [missionId]);

  // Load initial data
  useEffect(() => {
    if (missionId) {
      loadTrackingData();
    }
  }, [missionId]);

  return {
    trackingData,
    loading,
    error,
    loadTrackingData,
  };
};
