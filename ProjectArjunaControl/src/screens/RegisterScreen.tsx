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

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rescueTeamId, setRescueTeamId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signUp(
      name.trim(),
      email.trim().toLowerCase(),
      password,
      rescueTeamId.trim() || undefined
    );
    setLoading(false);

    if (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } else {
      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

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
              <Ionicons name="person-add" size={40} color={Colors.primary} />
            </View>
            
            <Text style={styles.title}>Join Project Arjuna</Text>
            <Text style={styles.subtitle}>Create your rescue operator account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rescue Team ID (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your team ID"
                  value={rescueTeamId}
                  onChangeText={setRescueTeamId}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
  passwordInput: {
    paddingRight: Spacing.xl,
  },
  eyeIcon: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  registerButton: {
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
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
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
});
