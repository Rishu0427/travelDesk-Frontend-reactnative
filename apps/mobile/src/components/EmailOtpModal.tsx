import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';
import { ShieldCheck, Mail, RefreshCw, X, Sparkles } from 'lucide-react-native';

interface EmailOtpModalProps {
  visible: boolean;
  email: string;
  purpose: 'OWNER_REGISTRATION' | 'DRIVER_REGISTRATION';
  recipientName?: string;
  initialDevOtp?: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<string | undefined>; // Returns devOtp if present
}

export const EmailOtpModal: React.FC<EmailOtpModalProps> = ({
  visible,
  email,
  purpose,
  recipientName,
  initialDevOtp,
  onClose,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(initialDevOtp);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setOtp('');
      setTimer(60);
      setCanResend(false);
      setDevOtp(initialDevOtp);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible, initialDevOtp]);

  useEffect(() => {
    let interval: any = null;
    if (visible && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, timer]);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await onVerify(cleanOtp);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      const newDevOtp = await onResend();
      if (newDevOtp) {
        setDevOtp(newDevOtp);
      }
      setTimer(60);
      setCanResend(false);
      Alert.alert('Code Resent', `A new verification code has been sent to ${email}`);
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleQuickFill = () => {
    if (devOtp) {
      setOtp(devOtp);
    }
  };

  const roleName = purpose === 'OWNER_REGISTRATION' ? 'Fleet Owner' : 'Driver';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={theme.colors.outline} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <ShieldCheck size={28} color={theme.colors.primaryContainer} />
          </View>

          <Text style={styles.title}>Email Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP code sent to verify your {roleName} registration
          </Text>

          <View style={styles.emailPill}>
            <Mail size={14} color={theme.colors.primary} />
            <Text style={styles.emailText} numberOfLines={1}>
              {email}
            </Text>
          </View>

          {/* Dev OTP Helper Banner */}
          {devOtp ? (
            <TouchableOpacity style={styles.devBanner} onPress={handleQuickFill} activeOpacity={0.8}>
              <Sparkles size={14} color={theme.colors.primaryContainer} />
              <Text style={styles.devBannerText}>
                Dev Code: <Text style={styles.devCodeHighlight}>{devOtp}</Text>
              </Text>
              <View style={styles.quickFillPill}>
                <Text style={styles.quickFillText}>Auto Fill</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 6-Digit OTP Box Input */}
          <View style={styles.otpInputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.otpInput}
              value={otp}
              onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={theme.colors.outlineVariant}
              textAlign="center"
              autoFocus
            />
          </View>

          {/* Resend Timer / Action */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
                style={styles.resendBtn}
                activeOpacity={0.7}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryContainer} />
                ) : (
                  <>
                    <RefreshCw size={14} color={theme.colors.primaryContainer} />
                    <Text style={styles.resendBtnText}>Resend Code</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerBold}>{timer}s</Text>
              </Text>
            )}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (loading || otp.trim().length !== 6) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.trim().length !== 6}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Complete</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Edit Registration Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level2,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    marginTop: 6,
  },
  title: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: theme.spacing.md,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceLow,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    maxWidth: '92%',
  },
  emailText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  devBannerText: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  devCodeHighlight: {
    fontWeight: '700',
    color: theme.colors.primaryContainer,
    letterSpacing: 1,
  },
  quickFillPill: {
    backgroundColor: theme.colors.primaryContainer,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    marginLeft: 4,
  },
  quickFillText: {
    ...theme.typography.labelMd,
    fontSize: 10,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  otpInputWrap: {
    width: '100%',
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    paddingVertical: 10,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 12,
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingHorizontal: 20,
  },
  resendContainer: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  timerText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  timerBold: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  resendBtnText: {
    ...theme.typography.labelLg,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  verifyBtn: {
    width: '100%',
    height: 48,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.level1,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    ...theme.typography.titleLg,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
  },
});
