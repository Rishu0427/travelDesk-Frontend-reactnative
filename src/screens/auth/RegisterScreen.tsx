import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../constants/theme';
import { ShieldCheck, Lock, Mail, User, Phone, ArrowLeft, Award, UserCheck } from 'lucide-react-native';
import { EmailOtpModal } from '../../components/EmailOtpModal';
import type { Role } from '../../types';

export const RegisterScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { registerOwner, registerDriver, sendOtp } = useAuth();

  const initialRole: Role = route?.params?.role === 'DRIVER' ? 'DRIVER' : 'OWNER';
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; password?: string }>({});

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setErrors({});
  };

  // OTP Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  const handlePhoneChange = (val: string) => {
    // Strip non-digit characters
    let digits = val.replace(/\D/g, '');
    // If pasted or typed with 91 country code
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
      digits = digits.slice(1);
    }
    setPhone(digits.slice(0, 10));
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; email?: string; phone?: string; password?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      newErrors.email = `${role === 'OWNER' ? 'Business' : 'Driver'} email address is required.`;
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (role === 'DRIVER' && !phone.trim()) {
      newErrors.phone = 'Mobile number is required.';
    } else if (phone.trim() && phone.trim().length !== 10) {
      newErrors.phone = 'Mobile number must be exactly 10 digits.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = newErrors.name || newErrors.email || newErrors.phone || newErrors.password;
      Alert.alert('Required Fields', firstError || 'Please fill in all required fields.');
      return false;
    }

    setErrors({});
    return true;
  };

  const handleInitiateRegistration = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const purpose = role === 'OWNER' ? 'OWNER_REGISTRATION' : 'DRIVER_REGISTRATION';
      const res = await sendOtp({
        email: email.trim().toLowerCase(),
        purpose,
        name: name.trim(),
      });

      setDevOtp(res.devOtp);
      setOtpModalVisible(true);
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Failed to send verification code. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const purpose = role === 'OWNER' ? 'OWNER_REGISTRATION' : 'DRIVER_REGISTRATION';
    const res = await sendOtp({
      email: email.trim().toLowerCase(),
      purpose,
      name: name.trim(),
    });
    setDevOtp(res.devOtp);
    return res.devOtp;
  };

  const handleCompleteRegistrationWithOtp = async (otpCode: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const formattedPhone = phone.trim() ? `+91${phone.trim()}` : undefined;

    if (role === 'OWNER') {
      await registerOwner({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: formattedPhone,
        otp: otpCode,
      });
      setOtpModalVisible(false);
      Alert.alert('Registration Successful', `Welcome to TravelDesk Fleet, ${name.trim()}!`);
    } else {
      await registerDriver({
        name: name.trim(),
        email: cleanEmail,
        password,
        mobile: formattedPhone || '+910000000000',
        licenseNumber: licenseNumber.trim() || undefined,
        otp: otpCode,
      });
      setOtpModalVisible(false);
      Alert.alert('Registration Successful', `Driver profile created successfully. Welcome, ${name.trim()}!`);
    }
  };

  const isOwner = role === 'OWNER';

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={theme.colors.primaryContainer} />
          <Text style={styles.backBtnText}>Back to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.brandContainer}>
          <View style={[styles.brandIconWrap, !isOwner && { backgroundColor: theme.colors.secondary }]}>
            {isOwner ? (
              <ShieldCheck size={28} color={theme.colors.onPrimary} />
            ) : (
              <UserCheck size={28} color={theme.colors.onPrimary} />
            )}
          </View>
          <Text style={styles.brandTitle}>
            {isOwner ? 'Register Fleet Business' : 'Register as Fleet Driver'}
          </Text>
          <Text style={styles.brandSubtitle}>
            {isOwner
              ? 'Create your enterprise owner account to manage fleet vehicles, drivers & operations'
              : 'Create your driver account to log daily trips, record expenses & track attendance'}
          </Text>
        </View>

        {/* Role Segmented Selector */}
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, isOwner && styles.roleOptionActive]}
            onPress={() => handleRoleChange('OWNER')}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color={isOwner ? theme.colors.primaryContainer : theme.colors.outline} />
            <Text style={[styles.roleOptionText, isOwner && styles.roleOptionTextActive]}>
              Fleet Owner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleOption, !isOwner && styles.roleOptionActiveDriver]}
            onPress={() => handleRoleChange('DRIVER')}
            activeOpacity={0.8}
          >
            <UserCheck size={16} color={!isOwner ? theme.colors.secondary : theme.colors.outline} />
            <Text style={[styles.roleOptionText, !isOwner && styles.roleOptionTextActiveDriver]}>
              Fleet Driver
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              Full Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputWrap, errors.name ? styles.inputWrapError : null]}>
              <User size={18} color={errors.name ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={isOwner ? 'e.g. Rajesh Gupta' : 'e.g. Ramesh Kumar'}
                placeholderTextColor={theme.colors.outline}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
            </View>
            {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              {isOwner ? 'Business / Owner Email' : 'Driver Email (Login ID)'} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputWrap, errors.email ? styles.inputWrapError : null]}>
              <Mail size={18} color={errors.email ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={isOwner ? 'owner@myfleet.com' : 'driver@fleet.com'}
                placeholderTextColor={theme.colors.outline}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {errors.email ? <Text style={styles.fieldErrorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              Mobile Number {isOwner ? '(Optional)' : '(Required)'}{' '}
              {!isOwner ? <Text style={styles.requiredStar}>*</Text> : null}
            </Text>
            <View style={[styles.inputWrap, errors.phone ? styles.inputWrapError : null]}>
              <Phone size={18} color={errors.phone ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91</Text>
                <View style={styles.countryCodeDivider} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor={theme.colors.outline}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone ? <Text style={styles.fieldErrorText}>{errors.phone}</Text> : null}
          </View>

          {!isOwner && (
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Driving License Number (Optional)</Text>
              <View style={styles.inputWrap}>
                <Award size={18} color={theme.colors.outline} style={styles.inputIcon} />
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
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              Password (Min. 6 chars) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputWrap, errors.password ? styles.inputWrapError : null]}>
              <Lock size={18} color={errors.password ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
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
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              !isOwner && { backgroundColor: theme.colors.secondary },
              loading && styles.primaryBtnDisabled,
            ]}
            onPress={handleInitiateRegistration}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <Mail size={18} color={theme.colors.onPrimary} />
                <Text style={styles.primaryBtnText}>Verify Email via OTP</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* OTP Verification Modal */}
        <EmailOtpModal
          visible={otpModalVisible}
          email={email.trim().toLowerCase()}
          purpose={isOwner ? 'OWNER_REGISTRATION' : 'DRIVER_REGISTRATION'}
          recipientName={name.trim()}
          initialDevOtp={devOtp}
          onClose={() => setOtpModalVisible(false)}
          onVerify={handleCompleteRegistrationWithOtp}
          onResend={handleResendOtp}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.md,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    ...theme.typography.labelLg,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  brandIconWrap: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.level1,
  },
  brandTitle: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  brandSubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.radius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  roleOptionActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.level1,
  },
  roleOptionActiveDriver: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.level1,
  },
  roleOptionText: {
    ...theme.typography.labelLg,
    color: theme.colors.outline,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: theme.colors.primaryContainer,
  },
  roleOptionTextActiveDriver: {
    color: theme.colors.secondary,
  },
  mainCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 48,
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
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '500',
  },
  inputIcon: {
    marginRight: 10,
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
  primaryBtn: {
    height: 48,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.level1,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    ...theme.typography.titleLg,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});
