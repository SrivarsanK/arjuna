import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants';
import { AuthStackParamList } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email.trim().toLowerCase());
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="mail" size={60} color={Colors.success} />
          </View>
          
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
          
          <Text style={styles.instructionText}>
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </Text>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => setSent(false)}
          >
            <Text style={styles.resendText}>Didn't receive email? Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Ionicons name="lock-closed" size={40} color={Colors.primary} />
            </View>
            
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: Spacing.lg,
    padding: Spacing.sm,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    ...Typography.headerLarge,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    height: '100%',
  },
  resetButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
  },
  signInText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    ...Typography.headerLarge,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  instructionText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  backToLoginButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backToLoginText: {
    ...Typography.button,
    color: Colors.surface,
  },
  resendButton: {
    padding: Spacing.md,
  },
  resendText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
});
