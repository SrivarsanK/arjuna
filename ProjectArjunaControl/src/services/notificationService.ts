import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  missionId: string;
  type: 'status_update' | 'emergency' | 'location_update' | 'delivery_complete';
  title: string;
  body: string;
  priority: 'normal' | 'high' | 'emergency';
}

export class NotificationService {
  private static expoPushToken: string | null = null;

  // Initialize notification permissions and get push token
  static async initialize() {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', token.data);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergency', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('mission_updates', {
          name: 'Mission Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  // Get the current push token
  static getPushToken() {
    return this.expoPushToken;
  }

  // Send local notification
  static async sendLocalNotification(data: NotificationData) {
    try {
      const channelId = data.priority === 'emergency' ? 'emergency' : 'mission_updates';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            missionId: data.missionId,
            type: data.type,
          },
          sound: data.priority === 'emergency' ? 'default' : undefined,
          priority: data.priority === 'emergency' 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
        ...(Platform.OS === 'android' && { channelId }),
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Handle mission status updates
  static async notifyMissionStatusUpdate(missionId: string, status: string, recipientName: string) {
    const notifications: Record<string, { title: string; body: string; priority: 'normal' | 'high' | 'emergency' }> = {
      'active': {
        title: '🚁 Mission Started',
        body: `Drone deployed for ${recipientName}`,
        priority: 'high'
      },
      'completed': {
        title: '✅ Mission Complete',
        body: `Supply delivery to ${recipientName} successful`,
        priority: 'normal'
      },
      'failed': {
        title: '❌ Mission Failed',
        body: `Delivery to ${recipientName} encountered issues`,
        priority: 'high'
      },
      'emergency': {
        title: '🚨 Emergency Status',
        body: `Critical alert for mission to ${recipientName}`,
        priority: 'emergency'
      }
    };

    const notificationData = notifications[status];
    if (notificationData) {
      await this.sendLocalNotification({
        missionId,
        type: 'status_update',
        title: notificationData.title,
        body: notificationData.body,
        priority: notificationData.priority,
      });
    }
  }

  // Handle emergency alerts
  static async notifyEmergency(missionId: string, message: string) {
    await this.sendLocalNotification({
      missionId,
      type: 'emergency',
      title: '🚨 EMERGENCY ALERT',
      body: message,
      priority: 'emergency',
    });
  }

  // Handle location updates
  static async notifyLocationUpdate(missionId: string, location: string, recipientName: string) {
    await this.sendLocalNotification({
      missionId,
      type: 'location_update',
      title: '📍 Location Update',
      body: `Drone for ${recipientName} reached ${location}`,
      priority: 'normal',
    });
  }

  // Handle delivery completion
  static async notifyDeliveryComplete(missionId: string, recipientName: string) {
    await this.sendLocalNotification({
      missionId,
      type: 'delivery_complete',
      title: '📦 Delivery Complete',
      body: `Supply successfully delivered to ${recipientName}`,
      priority: 'high',
    });
  }

  // Add notification listener
  static addNotificationListener(handler: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(handler);
  }

  // Add notification response listener (when user taps notification)
  static addNotificationResponseListener(handler: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  // Clear all notifications
  static async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Clear notifications for specific mission
  static async clearMissionNotifications(missionId: string) {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    
    for (const notification of notifications) {
      if (notification.request.content.data?.missionId === missionId) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  }
}
