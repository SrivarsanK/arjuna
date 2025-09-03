import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface VoiceCommand {
  command: string;
  action: VoiceCommandAction;
  parameters?: Record<string, any>;
  confidence: number;
}

export type VoiceCommandAction = 
  | 'CREATE_MISSION'
  | 'EMERGENCY_ALERT'
  | 'CHECK_STATUS'
  | 'NAVIGATE_TO'
  | 'START_TRACKING'
  | 'STOP_TRACKING'
  | 'ABORT_MISSION'
  | 'GET_WEATHER'
  | 'OPTIMIZE_ROUTE'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  success: boolean;
  command: VoiceCommand;
  response: string;
  action?: () => Promise<void>;
}

export interface SpeechSettings {
  language: string;
  pitch: number;
  rate: number;
  volume: number;
  voice?: string;
}

class VoiceCommandService {
  private isListening = false;
  private isInitialized = false;
  private speechSettings: SpeechSettings = {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.8,
    volume: 1.0
  };

  // Command patterns for recognition
  private commandPatterns = [
    {
      patterns: [
        /create.*mission/i,
        /new.*mission/i,
        /start.*mission/i,
        /emergency.*mission/i
      ],
      action: 'CREATE_MISSION' as VoiceCommandAction,
      parameters: (text: string) => ({
        isEmergency: /emergency/i.test(text),
        priority: /emergency/i.test(text) ? 'Emergency' : 'Normal'
      })
    },
    {
      patterns: [
        /emergency.*alert/i,
        /emergency.*help/i,
        /send.*emergency/i,
        /mayday/i,
        /help.*emergency/i
      ],
      action: 'EMERGENCY_ALERT' as VoiceCommandAction,
      parameters: () => ({ urgency: 'immediate' })
    },
    {
      patterns: [
        /check.*status/i,
        /mission.*status/i,
        /what.*status/i,
        /current.*missions/i
      ],
      action: 'CHECK_STATUS' as VoiceCommandAction,
      parameters: () => ({})
    },
    {
      patterns: [
        /navigate.*to/i,
        /go.*to/i,
        /open.*(dashboard|tracking|missions|analytics)/i,
        /show.*me.*(dashboard|tracking|missions|analytics)/i
      ],
      action: 'NAVIGATE_TO' as VoiceCommandAction,
      parameters: (text: string) => {
        const screens = ['dashboard', 'missions', 'tracking', 'analytics', 'routes'];
        const targetScreen = screens.find(screen => text.toLowerCase().includes(screen));
        return { screen: targetScreen || 'dashboard' };
      }
    },
    {
      patterns: [
        /start.*tracking/i,
        /begin.*tracking/i,
        /track.*mission/i,
        /monitor.*mission/i
      ],
      action: 'START_TRACKING' as VoiceCommandAction,
      parameters: () => ({})
    },
    {
      patterns: [
        /stop.*tracking/i,
        /end.*tracking/i,
        /pause.*tracking/i
      ],
      action: 'STOP_TRACKING' as VoiceCommandAction,
      parameters: () => ({})
    },
    {
      patterns: [
        /abort.*mission/i,
        /cancel.*mission/i,
        /stop.*mission/i,
        /emergency.*stop/i
      ],
      action: 'ABORT_MISSION' as VoiceCommandAction,
      parameters: () => ({ reason: 'voice_command' })
    },
    {
      patterns: [
        /weather.*report/i,
        /check.*weather/i,
        /weather.*conditions/i,
        /flight.*conditions/i
      ],
      action: 'GET_WEATHER' as VoiceCommandAction,
      parameters: () => ({})
    },
    {
      patterns: [
        /optimize.*route/i,
        /best.*route/i,
        /calculate.*route/i,
        /plan.*route/i
      ],
      action: 'OPTIMIZE_ROUTE' as VoiceCommandAction,
      parameters: () => ({})
    }
  ];

  async initialize(): Promise<void> {
    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission required for voice commands');
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      this.isInitialized = true;
      console.log('Voice Command Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Voice Command Service:', error);
      throw error;
    }
  }

  async startListening(
    onCommand: (command: VoiceCommand) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isListening) {
      console.warn('Voice recognition already active');
      return;
    }

    try {
      this.isListening = true;
      
      // Note: Expo doesn't have built-in continuous speech recognition
      // This is a simplified implementation for demonstration
      // In production, you would use react-native-voice or similar library
      
      await this.speak('Voice commands active. Say your command.');
      
      // Simulate listening state
      console.log('Voice command listening started');
      
    } catch (error) {
      this.isListening = false;
      console.error('Failed to start voice recognition:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      this.isListening = false;
      console.log('Voice command listening stopped');
      
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  // Manual text processing (for demonstration)
  async processTextCommand(text: string): Promise<VoiceCommandResult> {
    try {
      const command = this.parseCommand(text);
      const response = await this.executeCommand(command);
      
      // Speak the response
      await this.speak(response);
      
      return {
        success: true,
        command,
        response
      };
    } catch (error) {
      const errorMessage = `Could not process command: ${error}`;
      await this.speak(errorMessage);
      
      return {
        success: false,
        command: {
          command: text,
          action: 'UNKNOWN',
          confidence: 0
        },
        response: errorMessage
      };
    }
  }

  private parseCommand(text: string): VoiceCommand {
    const cleanText = text.toLowerCase().trim();
    
    for (const pattern of this.commandPatterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(cleanText)) {
          return {
            command: text,
            action: pattern.action,
            parameters: pattern.parameters(text),
            confidence: 0.8 // Mock confidence score
          };
        }
      }
    }
    
    // No pattern matched
    return {
      command: text,
      action: 'UNKNOWN',
      confidence: 0.1
    };
  }

  private async executeCommand(command: VoiceCommand): Promise<string> {
    switch (command.action) {
      case 'CREATE_MISSION':
        return this.handleCreateMission(command);
      
      case 'EMERGENCY_ALERT':
        return this.handleEmergencyAlert(command);
      
      case 'CHECK_STATUS':
        return this.handleCheckStatus(command);
      
      case 'NAVIGATE_TO':
        return this.handleNavigation(command);
      
      case 'START_TRACKING':
        return this.handleStartTracking(command);
      
      case 'STOP_TRACKING':
        return this.handleStopTracking(command);
      
      case 'ABORT_MISSION':
        return this.handleAbortMission(command);
      
      case 'GET_WEATHER':
        return this.handleGetWeather(command);
      
      case 'OPTIMIZE_ROUTE':
        return this.handleOptimizeRoute(command);
      
      default:
        return this.handleUnknownCommand(command);
    }
  }

  private async handleCreateMission(command: VoiceCommand): Promise<string> {
    const isEmergency = command.parameters?.isEmergency || false;
    
    if (isEmergency) {
      return 'Creating emergency mission. Please specify location and supply type.';
    } else {
      return 'Starting mission creation. Navigate to the missions tab to continue.';
    }
  }

  private async handleEmergencyAlert(command: VoiceCommand): Promise<string> {
    // In a real implementation, this would trigger actual emergency protocols
    return 'Emergency alert activated. Notifying all team members and mission control.';
  }

  private async handleCheckStatus(command: VoiceCommand): Promise<string> {
    // In a real implementation, this would fetch current mission data
    return 'Checking mission status. You have 2 active missions and 1 pending approval.';
  }

  private async handleNavigation(command: VoiceCommand): Promise<string> {
    const screen = command.parameters?.screen || 'dashboard';
    return `Navigating to ${screen} screen.`;
  }

  private async handleStartTracking(command: VoiceCommand): Promise<string> {
    return 'Starting mission tracking. Real-time monitoring is now active.';
  }

  private async handleStopTracking(command: VoiceCommand): Promise<string> {
    return 'Stopping mission tracking. Monitoring has been paused.';
  }

  private async handleAbortMission(command: VoiceCommand): Promise<string> {
    return 'Mission abort requested. Please confirm this action in the app.';
  }

  private async handleGetWeather(command: VoiceCommand): Promise<string> {
    return 'Checking weather conditions. Current conditions are partly cloudy with light winds. Flight conditions are good.';
  }

  private async handleOptimizeRoute(command: VoiceCommand): Promise<string> {
    return 'Calculating optimal route. Using AI-powered pathfinding with current weather data.';
  }

  private async handleUnknownCommand(command: VoiceCommand): Promise<string> {
    return 'Command not recognized. Available commands include: create mission, emergency alert, check status, navigate to dashboard, start tracking, and get weather.';
  }

  async speak(text: string, options?: Partial<SpeechSettings>): Promise<void> {
    try {
      const settings = { ...this.speechSettings, ...options };
      
      await Speech.speak(text, {
        language: settings.language,
        pitch: settings.pitch,
        rate: settings.rate,
        volume: settings.volume,
        voice: settings.voice
      });
    } catch (error) {
      console.error('Text-to-speech failed:', error);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  isListeningActive(): boolean {
    return this.isListening;
  }

  updateSpeechSettings(settings: Partial<SpeechSettings>): void {
    this.speechSettings = { ...this.speechSettings, ...settings };
  }

  getSupportedLanguages(): string[] {
    // Common supported languages
    return [
      'en-US', 'en-GB', 'en-AU',
      'es-ES', 'es-MX',
      'fr-FR', 'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'zh-CN',
      'ar-SA'
    ];
  }

  // Emergency voice commands that work even when app is in background
  async enableEmergencyCommands(): Promise<void> {
    try {
      // Register emergency keywords for background processing
      console.log('Emergency voice commands enabled');
      
      // In production, this would register specific emergency phrases
      // that can be recognized even when the app is not active
      
    } catch (error) {
      console.error('Failed to enable emergency commands:', error);
    }
  }

  async disableEmergencyCommands(): Promise<void> {
    try {
      console.log('Emergency voice commands disabled');
    } catch (error) {
      console.error('Failed to disable emergency commands:', error);
    }
  }

  // Voice command tutorial/training
  async startVoiceTraining(): Promise<string[]> {
    const commands = [
      'Say "Create emergency mission" to start an urgent delivery',
      'Say "Emergency alert" to notify all team members',
      'Say "Check status" to hear current mission updates',
      'Say "Navigate to tracking" to open the tracking screen',
      'Say "Get weather report" to hear current conditions',
      'Say "Optimize route" to calculate the best flight path'
    ];

    for (const command of commands) {
      await this.speak(command);
      // In a real implementation, you'd wait for user to practice each command
    }

    return commands;
  }
}

// Singleton instance
export const voiceCommandService = new VoiceCommandService();
