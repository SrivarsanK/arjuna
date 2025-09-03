// App Constants
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'Project Arjuna Control';
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

// Colors - Emergency/Rescue Theme
export const Colors = {
  primary: '#E53E3E', // Emergency Red
  secondary: '#3182CE', // Mission Blue
  accent: '#F6AD55', // Warning Orange
  success: '#38A169', // Success Green
  warning: '#F6AD55', // Warning Orange
  danger: '#E53E3E', // Danger Red
  background: '#F7FAFC', // Light Gray
  surface: '#FFFFFF', // White
  text: '#2D3748', // Dark Gray
  textSecondary: '#718096', // Medium Gray
  border: '#E2E8F0', // Light Border
  disabled: '#A0AEC0', // Disabled Gray
};

// Typography
export const Typography = {
  headerLarge: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.text,
  },
  headerMedium: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.text,
  },
  headerSmall: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    color: Colors.text,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: Colors.textSecondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    color: Colors.textSecondary,
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Mission Status
export const MissionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EMERGENCY: 'emergency',
} as const;

// Mission Priority
export const MissionPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EMERGENCY: 'emergency',
} as const;

// Supply Types
export const SupplyTypes = {
  MEDICINE: 'medicine',
  COMMUNICATION_DEVICE: 'communication_device',
  FOOD: 'food',
  WATER: 'water',
  EMERGENCY_KIT: 'emergency_kit',
  CUSTOM: 'custom',
} as const;

// User Roles
export const UserRoles = {
  OPERATOR: 'operator',
  COORDINATOR: 'coordinator',
  ADMIN: 'admin',
} as const;

// Screen dimensions and layout
export const Layout = {
  window: {
    width: 375, // Default width for calculations
    height: 667, // Default height for calculations
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  buttonHeight: {
    sm: 36,
    md: 44,
    lg: 52,
  },
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};
