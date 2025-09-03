// User Profile Type
export interface Profile {
  id: string;
  name: string;
  rescue_team_id?: string;
  role: 'operator' | 'coordinator' | 'admin';
  created_at: string;
}

// Mission Types
export interface Mission {
  id: string;
  created_by: string;
  recipient_name: string;
  contact_info?: string;
  supply_type: 'medicine' | 'communication_device' | 'food' | 'water' | 'emergency_kit' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'emergency';
  target_location: {
    latitude: number;
    longitude: number;
    description?: string;
  };
  laser_code?: string;
  special_notes?: string;
  quantity?: number;
  created_at: string;
  updated_at: string;
}

// Mission Tracking
export interface MissionTracking {
  id: string;
  mission_id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  battery_level: number;
  speed: number;
  timestamp: string;
}

// Mission Logs
export interface MissionLog {
  id: string;
  mission_id: string;
  event_type: string;
  description?: string;
  timestamp: string;
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  rescue_team_id?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  NewMission: undefined;
  LiveTracking: undefined;
  Analytics: undefined;
  RouteOptimization: undefined;
  GlobalCoordination: undefined;
  Profile: undefined;
};

// Form Types
export interface NewMissionForm {
  recipient_name: string;
  contact_info: string;
  location_description: string;
  latitude: number;
  longitude: number;
  supply_type: string;
  quantity: number;
  priority: string;
  laser_code: string;
  special_notes: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Notification Types
export interface NotificationData {
  title: string;
  body: string;
  data?: {
    mission_id?: string;
    type: 'mission_update' | 'emergency' | 'system';
  };
}

// Location Types
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

// Camera/Photo Types
export interface PhotoData {
  uri: string;
  width: number;
  height: number;
  type: 'image';
}
