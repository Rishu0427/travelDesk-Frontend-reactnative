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
import type { Role } from '../../types';
import { Car, ShieldCheck, UserCheck, Lock, Mail, Globe, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react-native';
import { api, getDefaultHost } from '../../api/client';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('OWNER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHostConfig, setShowHostConfig] = useState(false);
  const [customHost, setCustomHost] = useState(getDefaultHost());
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setErrors({});
  };

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string; form?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      const firstError = newErrors.email || newErrors.password;
      newErrors.form = firstError || 'Please enter all required fields.';
      setErrors(newErrors);
      Alert.alert('Required Fields', firstError || 'Please enter all required fields.');
      return;
    }

    if (role === 'ADMIN' && Platform.OS !== 'web') {
      const restrictedMsg = 'Admin login is restricted to web clients only. Mobile devices are not allowed to log in as admin.';
      setErrors({ form: restrictedMsg });
      Alert.alert('Access Restricted', restrictedMsg);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await login({
        email: email.trim(),
        password,
        role,
      });
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password. Please try again.';
      const field = err.field || err.data?.field;
      const errorType = err.errorType || err.data?.errorType;

      const serverErrors: { email?: string; password?: string; form?: string } = {
        form: msg,
      };

      if (
        field === 'email' ||
        errorType === 'USER_NOT_FOUND' ||
        errorType === 'ROLE_MISMATCH' ||
        msg.toLowerCase().includes('not exist') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('registered as')
      ) {
        serverErrors.email = msg;
      } else if (
        field === 'password' ||
        errorType === 'WRONG_PASSWORD' ||
        msg.toLowerCase().includes('wrong password') ||
        msg.toLowerCase().includes('invalid password') ||
        msg.toLowerCase().includes('incorrect password')
      ) {
        serverErrors.password = msg;
      }

      setErrors(serverErrors);
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    if (role === 'OWNER') {
      setEmail('owner@traveldesk.com');
      setPassword('password123');
    } else if (role === 'ADMIN') {
      setEmail('admin@traveldesk.com');
      setPassword('password123');
    } else {
      setEmail('driver@traveldesk.com');
      setPassword('password123');
    }
  };

  const handleSaveHost = async () => {
    await api.setCustomHost(customHost.trim());
    setShowHostConfig(false);
    Alert.alert('Configuration Saved', 'API Endpoint updated to: ' + customHost.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Branding Card */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIconWrap}>
            <Car size={32} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.brandTitle}>TravelDesk Fleet</Text>
          <Text style={styles.brandSubtitle}>Modern Enterprise Logistics & Driver Management</Text>
        </View>

        {/* Main Auth Container */}
        <View style={styles.mainCard}>
          {/* Form Error Banner */}
          {errors.form ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={theme.colors.error} style={styles.errorBannerIcon} />
              <Text style={styles.errorBannerText}>{errors.form}</Text>
            </View>
          ) : null}

          {/* Role Segmented Selector */}
          <Text style={styles.sectionLabel}>Select Portal Role</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.segmentBtn, role === 'OWNER' && styles.segmentBtnActive]}
              onPress={() => handleRoleChange('OWNER')}
            >
              <ShieldCheck
                size={18}
                color={role === 'OWNER' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.segmentText, role === 'OWNER' && styles.segmentTextActive]}>
                Fleet Owner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.segmentBtn, role === 'DRIVER' && styles.segmentBtnActive]}
              onPress={() => handleRoleChange('DRIVER')}
            >
              <UserCheck
                size={18}
                color={role === 'DRIVER' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.segmentText, role === 'DRIVER' && styles.segmentTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>

            {/* Admin option is hidden for now */}
            {/* {Platform.OS === 'web' && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.segmentBtn, role === 'ADMIN' && styles.segmentBtnActive]}
                onPress={() => handleRoleChange('ADMIN')}
              >
                <ShieldAlert
                  size={18}
                  color={role === 'ADMIN' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.segmentText, role === 'ADMIN' && styles.segmentTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            )} */}
          </View>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              Email Address <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputWrap, errors.email ? styles.inputWrapError : null]}>
              <Mail size={18} color={errors.email ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={
                  role === 'OWNER'
                    ? 'owner@traveldesk.com'
                    : role === 'ADMIN'
                    ? 'admin@traveldesk.com'
                    : 'driver@traveldesk.com'
                }
                placeholderTextColor={theme.colors.outline}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email || errors.form) {
                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {errors.email ? <Text style={styles.fieldErrorText}>{errors.email}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>
              Password <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputWrap, errors.password ? styles.inputWrapError : null]}>
              <Lock size={18} color={errors.password ? theme.colors.error : theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.outline}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password || errors.form) {
                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                  }
                }}
                secureTextEntry
              />
            </View>
            {errors.password ? <Text style={styles.fieldErrorText}>{errors.password}</Text> : null}
          </View>

          {/* Sign In Primary Action */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Sign In as {role === 'OWNER' ? 'Owner' : role === 'ADMIN' ? 'Admin' : 'Driver'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Register Links */}
          {role === 'ADMIN' ? (
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>Platform Administrator Portal (Web Client Only)</Text>
            </View>
          ) : role === 'OWNER' ? (
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>New to TravelDesk Fleet? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'OWNER' })}>
                <Text style={styles.registerLink}>Register Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>New Fleet Driver? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'DRIVER' })}>
                <Text style={styles.registerLink}>Register as Driver</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Server Connection Settings */}
        <View style={styles.serverConfigContainer}>
          {/* <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowHostConfig(!showHostConfig)}
          >
            <Globe size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.serverToggleText}>
              Backend Server Endpoint ({Platform.OS.toUpperCase()})
            </Text>
          </TouchableOpacity> */}

          {showHostConfig && (
            <View style={styles.serverCard}>
              <Text style={styles.serverNote}>
                Current endpoint used for API requests. You can customize this if testing on a
                physical mobile device on the same local Wi-Fi.
              </Text>
              <TextInput
                style={styles.serverInput}
                value={customHost}
                onChangeText={setCustomHost}
                placeholder="http://192.168.1.x:8080/api"
                placeholderTextColor={theme.colors.outline}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.serverSaveBtn} onPress={handleSaveHost}>
                <Text style={styles.serverSaveBtnText}>Save Endpoint</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  brandContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  brandIconWrap: {
    width: 60,
    height: 60,
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
  },
  brandSubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  mainCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f0',
    borderColor: '#ffa39e',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  errorBannerIcon: {
    flexShrink: 0,
  },
  errorBannerText: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.error,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  segmentText: {
    ...theme.typography.labelLg,
    color: theme.colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  demoFillText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.primaryContainer,
    fontWeight: '500',
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
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    ...theme.typography.titleLg,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  registerLink: {
    ...theme.typography.bodyMd,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  serverConfigContainer: {
    marginTop: theme.spacing.lg,
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  serverToggleText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  serverCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  serverNote: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  serverInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...theme.typography.bodyMd,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  serverSaveBtn: {
    backgroundColor: theme.colors.surfaceContainer,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  serverSaveBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
