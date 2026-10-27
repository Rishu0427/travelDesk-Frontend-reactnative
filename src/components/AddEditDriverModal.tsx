import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Driver, Vehicle } from '../types';
import { X, UserCheck, Mail } from 'lucide-react-native';
import { api } from '../api/client';
import { EmailOtpModal } from './EmailOtpModal';

interface AddEditDriverModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  driverToEdit?: Driver | null;
  vehicles?: Vehicle[];
}

export const AddEditDriverModal: React.FC<AddEditDriverModalProps> = ({
  visible,
  onClose,
  onSubmit,
  driverToEdit,
  vehicles = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string; password?: string }>({});

  // OTP Modal State for Driver Registration
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  useEffect(() => {
    setErrors({});
    if (driverToEdit) {
      setName(driverToEdit.name || '');
      setEmail(driverToEdit.email || '');
      setPassword('');
      let rawMobile = driverToEdit.mobile || '';
      if (rawMobile.startsWith('+91')) {
        rawMobile = rawMobile.slice(3);
      }
      setMobile(rawMobile);
      setLicenseNumber(driverToEdit.licenseNumber || '');
      setSalary(driverToEdit.salary ? String(driverToEdit.salary) : '');
      setStatus(driverToEdit.status || 'ACTIVE');
      setAssignedVehicleId(driverToEdit.assignedVehicleId || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setMobile('');
      setLicenseNumber('');
      setSalary('');
      setStatus('ACTIVE');
      setAssignedVehicleId('');
    }
  }, [driverToEdit, visible]);

  const handleMobileChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
      digits = digits.slice(1);
    }
    setMobile(digits.slice(0, 10));
    if (errors.mobile) {
      setErrors((prev) => ({ ...prev, mobile: undefined }));
    }
  };

  const handleSubmit = async () => {
    const newErrors: { name?: string; email?: string; mobile?: string; password?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Driver full name is required.';
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      newErrors.email = 'Driver email address is required.';
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required.';
    } else if (mobile.trim().length !== 10) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits.';
    }

    if (!driverToEdit && !password) {
      newErrors.password = 'Password is required for driver login access.';
    } else if (!driverToEdit && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = newErrors.name || newErrors.email || newErrors.mobile || newErrors.password;
      Alert.alert('Required Fields', firstError || 'Please fill in all required fields.');
      return;
    }

    setErrors({});

    // If editing existing driver profile, save directly
    if (driverToEdit) {
      setLoading(true);
      try {
        const payload: any = {
          name: name.trim(),
          email: cleanEmail,
          mobile: `+91${mobile.trim()}`,
          licenseNumber: licenseNumber.trim() || null,
          salary: salary ? parseFloat(salary) : null,
          status,
          assignedVehicleId: assignedVehicleId || null,
        };

        if (password) {
          payload.password = password;
        }

        await onSubmit(payload);
        onClose();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to save driver profile.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // If registering a new driver: verify driver's email via OTP!
    setLoading(true);
    try {
      const res = await api.sendOtp({
        email: cleanEmail,
        purpose: 'DRIVER_REGISTRATION',
        name: name.trim(),
      });
      setDevOtp(res.devOtp);
      setOtpModalVisible(true);
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Failed to send verification code to driver email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await api.sendOtp({
      email: cleanEmail,
      purpose: 'DRIVER_REGISTRATION',
      name: name.trim(),
    });
    setDevOtp(res.devOtp);
    return res.devOtp;
  };

  const handleCompleteRegistrationWithOtp = async (otpCode: string) => {
    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: `+91${mobile.trim()}`,
      licenseNumber: licenseNumber.trim() || null,
      salary: salary ? parseFloat(salary) : null,
      status,
      assignedVehicleId: assignedVehicleId || null,
      password,
      otp: otpCode,
    };

    await onSubmit(payload);
    setOtpModalVisible(false);
    onClose();
    Alert.alert('Driver Registered', `Driver ${name.trim()} registered and email verified successfully.`);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.iconCircle}>
                  <UserCheck size={18} color={theme.colors.secondary} />
                </View>
                <Text style={styles.title}>{driverToEdit ? 'Edit Driver' : 'Register New Driver'}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>
                Driver Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrap, errors.name ? styles.inputWrapError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={theme.colors.outline}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
              </View>
              {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}

              <Text style={styles.label}>
                Driver Login Email <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrap, errors.email ? styles.inputWrapError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="driver@fleet.com"
                  placeholderTextColor={theme.colors.outline}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!driverToEdit}
                />
              </View>
              {errors.email ? <Text style={styles.fieldErrorText}>{errors.email}</Text> : null}

              <Text style={styles.label}>
                {driverToEdit ? 'Update Login Password (Optional)' : 'Login Password (Min 6 chars)'}{' '}
                {!driverToEdit ? <Text style={styles.requiredStar}>*</Text> : null}
              </Text>
              <View style={[styles.inputWrap, errors.password ? styles.inputWrapError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder={driverToEdit ? 'Leave blank to preserve existing password' : 'Enter login password'}
                  placeholderTextColor={theme.colors.outline}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  secureTextEntry
                />
              </View>
              {errors.password ? <Text style={styles.fieldErrorText}>{errors.password}</Text> : null}

              <Text style={styles.label}>
                Mobile Phone Number <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrapWithPrefix, errors.mobile ? styles.inputWrapError : null]}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <View style={styles.countryCodeDivider} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor={theme.colors.outline}
                  value={mobile}
                  onChangeText={handleMobileChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.mobile ? <Text style={styles.fieldErrorText}>{errors.mobile}</Text> : null}

              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.label}>Driving License</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="DL-0420110012"
                      placeholderTextColor={theme.colors.outline}
                      value={licenseNumber}
                      onChangeText={setLicenseNumber}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.label}>Base Salary (₹/mo)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 20000"
                      placeholderTextColor={theme.colors.outline}
                      value={salary}
                      onChangeText={setSalary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Duty Status</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentBtn, status === 'ACTIVE' && styles.segmentBtnActive]}
                  onPress={() => setStatus('ACTIVE')}
                >
                  <Text style={[styles.segmentText, status === 'ACTIVE' && styles.segmentTextActive]}>
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, status === 'INACTIVE' && styles.segmentBtnActiveInactive]}
                  onPress={() => setStatus('INACTIVE')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      status === 'INACTIVE' && styles.segmentTextActive,
                    ]}
                  >
                    Inactive / On Leave
                  </Text>
                </TouchableOpacity>
              </View>

              {vehicles.length > 0 && (
                <View>
                  <Text style={styles.label}>Assigned Vehicle</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.vehiclePill, !assignedVehicleId && styles.vehiclePillActive]}
                      onPress={() => setAssignedVehicleId('')}
                    >
                      <Text
                        style={[
                          styles.vehiclePillText,
                          !assignedVehicleId && styles.vehiclePillTextActive,
                        ]}
                      >
                        Unassigned
                      </Text>
                    </TouchableOpacity>
                    {vehicles.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vehiclePill,
                          assignedVehicleId === v.id && styles.vehiclePillActive,
                        ]}
                        onPress={() => setAssignedVehicleId(v.id)}
                      >
                        <Text
                          style={[
                            styles.vehiclePillText,
                            assignedVehicleId === v.id && styles.vehiclePillTextActive,
                          ]}
                        >
                          {v.vehicleNumber} ({v.model})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <View style={styles.btnContentRow}>
                  {!driverToEdit && <Mail size={16} color={theme.colors.onPrimary} />}
                  <Text style={styles.submitBtnText}>
                    {driverToEdit ? 'Save Driver Profile' : 'Verify Email & Register Driver'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Driver Registration OTP Verification Modal */}
      <EmailOtpModal
        visible={otpModalVisible}
        email={email.trim().toLowerCase()}
        purpose="DRIVER_REGISTRATION"
        recipientName={name.trim()}
        initialDevOtp={devOtp}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleCompleteRegistrationWithOtp}
        onResend={handleResendOtp}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: '88%',
    ...theme.shadows.level2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    maxHeight: 440,
  },
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    marginBottom: 8,
  },
  inputWrapWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  inputWrapError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
    backgroundColor: '#fffbfa',
  },
  requiredStar: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  fieldErrorText: {
    ...theme.typography.labelSm,
    color: theme.colors.error,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 2,
    fontWeight: '500',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  countryCodeText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginRight: 8,
  },
  countryCodeDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.borderLight,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  rowTwo: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  segmentBtnActiveInactive: {
    backgroundColor: theme.colors.tertiaryContainer,
    borderColor: theme.colors.tertiaryContainer,
  },
  segmentText: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
  },
  vehiclePill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 8,
  },
  vehiclePillActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  vehiclePillText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  vehiclePillTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  submitBtn: {
    height: 48,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.level1,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    ...theme.typography.titleLg,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});
