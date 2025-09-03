import React, { useEffect } from 'react';
import { AuthProvider } from './src/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationService } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Initialize notifications
    NotificationService.initialize();
  }, []);

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
