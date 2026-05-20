import React, { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { getSocket } from '../services/socketService';
import { useAuth } from './AuthContext';

// Only load expo-notifications outside of Expo Go (storeClient).
// In Expo SDK 53+, expo-notifications is not available in Expo Go.
let Notifications: any = null;

if (Constants.executionEnvironment !== 'storeClient') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[NotificationContext] Could not initialize expo-notifications:', e);
  }
}

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Skip permission setup in Expo Go — expo-notifications is not available
    if (!Notifications) return;

    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permission de notification refusée');
        return;
      }
      console.log('🔔 Permission de notification accordée');
    };

    void requestPermissions();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (!socket) return;

    const joinRoom = () => {
      console.log('🔌 [Socket] Tentative de rejoindre le salon :', `user:${user.id}`);
      socket.emit('join_room', `user:${user.id}`);
    };

    // Join immediately if already connected
    if (socket.connected) {
      joinRoom();
    }

    // Re-join on every reconnection
    socket.on('connect', joinRoom);

    // Listen for new notifications
    const handleNewNotification = async (notification: any) => {
      console.log('🔔 [Socket] Nouvelle notification reçue:', notification);
      
      // FALLBACK: Alert popup to be 100% sure the user sees it
      Alert.alert(
        notification.titre || 'Nouvelle Alerte',
        notification.message || 'Vous avez reçu une nouvelle notification.',
        [{ text: 'OK' }]
      );

      // Schedule a local notification if running in a dev/prod build (not Expo Go)
      if (Notifications) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.titre || 'Nouvelle Alerte',
              body: notification.message || 'Vous avez reçu une nouvelle notification.',
              data: { interventionId: notification.interventionId },
            },
            trigger: null,
          });
          console.log('✅ [Socket] Notification locale affichée');
        } catch (err) {
          console.error('❌ [Socket] Erreur affichage notification:', err);
        }
      } else {
        console.log('ℹ️ [Socket] Expo Go détecté — notification affichée via Alert uniquement');
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      console.log('🔌 [Socket] Nettoyage des écouteurs');
      socket.off('connect', joinRoom);
      socket.off('new_notification', handleNewNotification);
    };
  }, [isAuthenticated, user?.id]);

  return <>{children}</>;
};

export const useNotifications = () => {
  // Can be extended if needed
  return {};
};
