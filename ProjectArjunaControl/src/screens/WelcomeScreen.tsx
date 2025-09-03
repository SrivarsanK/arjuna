import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants';
import { AuthStackParamList } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="airplane" size={60} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Project Arjuna</Text>
            <Text style={styles.subtitle}>Control</Text>
            <Text style={styles.description}>
              Precision laser-guided drone deliveries for disaster relief operations
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Emergency Response • Rescue Operations
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  backgroundImageStyle: {
    opacity: 0.3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    ...Typography.headerLarge,
    fontSize: 32,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.headerMedium,
    color: Colors.surface,
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.surface,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: Colors.surface,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.8,
  },
});
