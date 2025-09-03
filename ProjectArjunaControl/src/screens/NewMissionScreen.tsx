import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Layout, SupplyTypes, MissionPriority } from '../constants';
import { useMissions } from '../hooks/useMissions';
import { useAuth } from '../hooks/useAuth';
import { Mission } from '../types';

interface FormData {
  // Step 1: Recipient Details
  recipientName: string;
  contactInfo: string;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  
  // Step 2: Supply Information
  supplyType: keyof typeof SupplyTypes;
  customSupplyType?: string;
  quantity: number;
  priority: keyof typeof MissionPriority;
  
  // Step 3: Delivery Instructions
  laserCode: string;
  specialNotes: string;
  targetLatitude: string;
  targetLongitude: string;
  emergencyPhoto?: string; // Base64 encoded image
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => (
  <View style={styles.stepIndicator}>
    {Array.from({ length: totalSteps }, (_, index) => (
      <View key={index} style={styles.stepContainer}>
        <View
          style={[
            styles.stepCircle,
            {
              backgroundColor: index + 1 <= currentStep ? Colors.primary : Colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.stepNumber,
              { color: index + 1 <= currentStep ? Colors.surface : Colors.textSecondary },
            ]}
          >
            {index + 1}
          </Text>
        </View>
        {index < totalSteps - 1 && (
          <View
            style={[
              styles.stepLine,
              {
                backgroundColor: index + 1 < currentStep ? Colors.primary : Colors.border,
              },
            ]}
          />
        )}
      </View>
    ))}
  </View>
);

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, children }) => (
  <View style={styles.formField}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.requiredMark}> *</Text>}
    </Text>
    {children}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

interface SupplyTypeButtonProps {
  type: keyof typeof SupplyTypes;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}

const SupplyTypeButton: React.FC<SupplyTypeButtonProps> = ({
  type,
  label,
  icon,
  selected,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.supplyTypeButton,
      { backgroundColor: selected ? Colors.primary : Colors.surface },
    ]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={24}
      color={selected ? Colors.surface : Colors.textSecondary}
    />
    <Text
      style={[
        styles.supplyTypeText,
        { color: selected ? Colors.surface : Colors.text },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface PriorityButtonProps {
  priority: keyof typeof MissionPriority;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

const PriorityButton: React.FC<PriorityButtonProps> = ({
  priority,
  label,
  color,
  selected,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.priorityButton,
      {
        backgroundColor: selected ? color : Colors.surface,
        borderColor: color,
        borderWidth: 2,
      },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.priorityText,
        { color: selected ? Colors.surface : color },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export const NewMissionScreen: React.FC = () => {
  const { user } = useAuth();
  const { createMission } = useMissions();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      recipientName: '',
      contactInfo: '',
      locationDescription: '',
      latitude: undefined,
      longitude: undefined,
      supplyType: 'MEDICINE',
      quantity: 1,
      priority: 'MEDIUM',
      laserCode: '',
      specialNotes: '',
      targetLatitude: '',
      targetLongitude: '',
      emergencyPhoto: undefined,
    },
  });

  const supplyType = watch('supplyType');
  const priority = watch('priority');

  // GPS Location Function
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Set coordinates in form
      setValue('latitude', location.coords.latitude);
      setValue('longitude', location.coords.longitude);

      // Get address from coordinates
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const fullAddress = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
        setValue('locationDescription', fullAddress);
      }

      Alert.alert('Location Updated', 'GPS coordinates have been set successfully');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Camera Function for Emergency Documentation
  const takeEmergencyPhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // Get base64 for easy storage
      });

      if (!result.canceled && result.assets[0] && result.assets[0].base64) {
        const photo = result.assets[0];
        setValue('emergencyPhoto', photo.base64 || undefined);
        Alert.alert('Photo Captured', 'Emergency documentation photo has been saved');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const supplyTypes = [
    { type: 'MEDICINE' as const, label: 'Medicine', icon: 'medical' as const },
    { type: 'COMMUNICATION_DEVICE' as const, label: 'Communication', icon: 'radio' as const },
    { type: 'FOOD' as const, label: 'Food', icon: 'restaurant' as const },
    { type: 'WATER' as const, label: 'Water', icon: 'water' as const },
    { type: 'EMERGENCY_KIT' as const, label: 'Emergency Kit', icon: 'briefcase' as const },
    { type: 'CUSTOM' as const, label: 'Custom', icon: 'cube' as const },
  ];

  const priorities = [
    { priority: 'LOW' as const, label: 'Low', color: Colors.success },
    { priority: 'MEDIUM' as const, label: 'Medium', color: Colors.warning },
    { priority: 'HIGH' as const, label: 'High', color: Colors.accent },
    { priority: 'EMERGENCY' as const, label: 'Emergency', color: Colors.danger },
  ];

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const missionData: Omit<Mission, 'id' | 'created_at' | 'updated_at'> = {
        created_by: user.id,
        recipient_name: data.recipientName,
        contact_info: data.contactInfo,
        supply_type: SupplyTypes[data.supplyType],
        priority: MissionPriority[data.priority],
        status: 'pending',
        target_location: {
          latitude: data.latitude || parseFloat(data.targetLatitude) || 0,
          longitude: data.longitude || parseFloat(data.targetLongitude) || 0,
          description: data.locationDescription,
        },
        laser_code: data.laserCode,
        special_notes: data.specialNotes,
        quantity: data.quantity,
      };

      await createMission(missionData);

      Alert.alert(
        'Mission Created',
        'Your mission has been successfully created and is pending deployment.',
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              setCurrentStep(1);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create mission. Please try again.');
      console.error('Mission creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Recipient Information</Text>
      <Text style={styles.stepDescription}>
        Enter details about the mission recipient and delivery location.
      </Text>

      <FormField label="Recipient Name" required error={errors.recipientName?.message}>
        <Controller
          control={control}
          name="recipientName"
          rules={{ required: 'Recipient name is required' }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChange}
              placeholder="Emergency Shelter A, Rescue Team Alpha..."
              placeholderTextColor={Colors.textSecondary}
            />
          )}
        />
      </FormField>

      <FormField label="Contact Information" required error={errors.contactInfo?.message}>
        <Controller
          control={control}
          name="contactInfo"
          rules={{ required: 'Contact information is required' }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChange}
              placeholder="Phone number, radio frequency, etc."
              placeholderTextColor={Colors.textSecondary}
            />
          )}
        />
      </FormField>

      <FormField label="Location Description" required error={errors.locationDescription?.message}>
        <Controller
          control={control}
          name="locationDescription"
          rules={{ required: 'Location description is required' }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Describe the delivery location, landmarks, etc."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          )}
        />
      </FormField>

      {/* GPS Location Button */}
      <TouchableOpacity
        style={styles.gpsButton}
        onPress={getCurrentLocation}
        disabled={isLoadingLocation}
      >
        <Ionicons 
          name={isLoadingLocation ? "sync" : "location"} 
          size={20} 
          color={Colors.surface} 
          style={isLoadingLocation ? styles.spinning : undefined}
        />
        <Text style={styles.gpsButtonText}>
          {isLoadingLocation ? 'Getting Location...' : 'Use Current GPS Location'}
        </Text>
      </TouchableOpacity>

      {/* Display coordinates if available */}
      {(watch('latitude') && watch('longitude')) && (
        <View style={styles.coordinatesDisplay}>
          <Text style={styles.coordinatesText}>
            📍 GPS: {watch('latitude')?.toFixed(6)}, {watch('longitude')?.toFixed(6)}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Supply Information</Text>
      <Text style={styles.stepDescription}>
        Specify the type and quantity of supplies to be delivered.
      </Text>

      <FormField label="Supply Type" required>
        <View style={styles.supplyTypeGrid}>
          {supplyTypes.map((item) => (
            <SupplyTypeButton
              key={item.type}
              type={item.type}
              label={item.label}
              icon={item.icon}
              selected={supplyType === item.type}
              onPress={() => setValue('supplyType', item.type)}
            />
          ))}
        </View>
      </FormField>

      {supplyType === 'CUSTOM' && (
        <FormField label="Custom Supply Type" required>
          <Controller
            control={control}
            name="customSupplyType"
            rules={{ required: supplyType === 'CUSTOM' ? 'Custom supply type is required' : false }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChange}
                placeholder="Specify custom supply type"
                placeholderTextColor={Colors.textSecondary}
              />
            )}
          />
        </FormField>
      )}

      <FormField label="Quantity" required error={errors.quantity?.message}>
        <Controller
          control={control}
          name="quantity"
          rules={{ 
            required: 'Quantity is required',
            min: { value: 1, message: 'Quantity must be at least 1' }
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.textInput}
              value={value?.toString()}
              onChangeText={(text) => onChange(parseInt(text) || 1)}
              placeholder="1"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          )}
        />
      </FormField>

      <FormField label="Priority Level" required>
        <View style={styles.priorityGrid}>
          {priorities.map((item) => (
            <PriorityButton
              key={item.priority}
              priority={item.priority}
              label={item.label}
              color={item.color}
              selected={priority === item.priority}
              onPress={() => setValue('priority', item.priority)}
            />
          ))}
        </View>
      </FormField>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Delivery Instructions</Text>
      <Text style={styles.stepDescription}>
        Provide specific delivery instructions and targeting information.
      </Text>

      <FormField label="GPS Coordinates">
        <View style={styles.coordinateRow}>
          <View style={styles.coordinateField}>
            <Text style={styles.coordinateLabel}>Latitude</Text>
            <Controller
              control={control}
              name="targetLatitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.coordinateInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="0.000000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <View style={styles.coordinateField}>
            <Text style={styles.coordinateLabel}>Longitude</Text>
            <Controller
              control={control}
              name="targetLongitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.coordinateInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="0.000000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              )}
            />
          </View>
        </View>
      </FormField>

      <FormField label="Laser Guidance Code">
        <Controller
          control={control}
          name="laserCode"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChange}
              placeholder="LGC-001-ALPHA"
              placeholderTextColor={Colors.textSecondary}
            />
          )}
        />
      </FormField>

      <FormField label="Special Instructions">
        <Controller
          control={control}
          name="specialNotes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Any special delivery instructions, precautions, or notes..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          )}
        />
      </FormField>

      {/* Emergency Photo Documentation */}
      <FormField label="Emergency Documentation">
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={takeEmergencyPhoto}
        >
          <Ionicons name="camera" size={20} color={Colors.surface} />
          <Text style={styles.cameraButtonText}>
            Take Emergency Photo
          </Text>
        </TouchableOpacity>
        
        {watch('emergencyPhoto') && (
          <View style={styles.photoConfirmation}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.photoConfirmationText}>
              Emergency photo captured
            </Text>
          </View>
        )}
      </FormField>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Mission Confirmation</Text>
      <Text style={styles.stepDescription}>
        Review your mission details before submission.
      </Text>

      <View style={styles.confirmationCard}>
        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationTitle}>Recipient</Text>
          <Text style={styles.confirmationValue}>{watch('recipientName')}</Text>
          <Text style={styles.confirmationSubvalue}>{watch('contactInfo')}</Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationTitle}>Supply</Text>
          <Text style={styles.confirmationValue}>
            {supplyTypes.find(s => s.type === supplyType)?.label} (×{watch('quantity')})
          </Text>
          <Text style={styles.confirmationSubvalue}>
            Priority: {priorities.find(p => p.priority === priority)?.label}
          </Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationTitle}>Location</Text>
          <Text style={styles.confirmationValue}>{watch('locationDescription')}</Text>
          {(watch('targetLatitude') || watch('targetLongitude')) && (
            <Text style={styles.confirmationSubvalue}>
              {watch('targetLatitude')}, {watch('targetLongitude')}
            </Text>
          )}
        </View>

        {watch('laserCode') && (
          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationTitle}>Laser Code</Text>
            <Text style={styles.confirmationValue}>{watch('laserCode')}</Text>
          </View>
        )}

        {watch('specialNotes') && (
          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationTitle}>Special Notes</Text>
            <Text style={styles.confirmationValue}>{watch('specialNotes')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Mission</Text>
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </View>

        {/* Form Content */}
        <View style={styles.content}>
          {renderCurrentStep()}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationBar}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.flex} />

          {currentStep < 4 ? (
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating Mission...' : 'Create Mission'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.headerMedium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    ...Typography.caption,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stepTitle: {
    ...Typography.headerSmall,
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  formField: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  requiredMark: {
    color: Colors.danger,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    backgroundColor: Colors.surface,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  supplyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  supplyTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: '48%',
    gap: Spacing.sm,
  },
  supplyTypeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  priorityText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  coordinateField: {
    flex: 1,
  },
  coordinateLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  coordinateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    ...Typography.bodySmall,
    backgroundColor: Colors.surface,
  },
  confirmationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  confirmationSection: {
    gap: Spacing.xs,
  },
  confirmationTitle: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  confirmationValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  confirmationSubvalue: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  flex: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.xs,
  },
  nextButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  submitButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.surface,
    textAlign: 'center',
  },
  gpsButton: {
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  gpsButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  spinning: {
    // Add animation for spinning effect if needed
  },
  coordinatesDisplay: {
    backgroundColor: Colors.success + '20', // 20% opacity
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Spacing.sm,
  },
  coordinatesText: {
    ...Typography.caption,
    color: Colors.success,
    textAlign: 'center',
  },
  cameraButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.sm,
  },
  cameraButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  photoConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  photoConfirmationText: {
    ...Typography.caption,
    color: Colors.success,
  },
});
