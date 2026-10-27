import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { UserProfile, UpdateProfileRequest } from '../types';
import {
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Edit3,
  Car,
  IndianRupee,
  FileBadge,
  Building2,
  Calendar,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle2,
  Info,
  KeyRound,
  RotateCw,
} from 'lucide-react-native';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});

  const isDriver = (profile?.role || user?.role) === 'DRIVER';

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setMobile(data.mobile || data.phone || '');
      setPassword('');
      setIsEditing(false);
      setErrors({});
    } catch (err: any) {
      console.warn('Failed to load profile:', err);
      // Fallback to auth context user
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setMobile(user.phone || '');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      loadProfile();
    }
  }, [visible, loadProfile]);

  const validate = () => {
    const errs: { name?: string; email?: string; mobile?: string } = {};

    if (!name.trim()) {
      errs.name = 'Full name is required';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (!mobile.trim()) {
      errs.mobile = isDriver ? 'Mobile number is required' : 'Phone number is required';
    } else if (isDriver) {
      const cleanMob = mobile.replace(/[^0-9]/g, '');
      if (cleanMob.length !== 10) {
        errs.mobile = 'Enter a valid 10-digit mobile number';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const updateData: UpdateProfileRequest = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        phone: mobile.trim(),
      };

      if (password.trim().length > 0) {
        updateData.password = password.trim();
      }

      const res = await api.updateProfile(updateData);

      // Update state and auth context
      if (res.user) {
        updateUser(res.user);
      } else {
        updateUser({
          name: updateData.name,
          email: updateData.email,
          phone: updateData.phone,
        });
      }

      setProfile(res.profile);
      setPassword('');
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setMobile(profile.mobile || profile.phone || '');
    }
    setPassword('');
    setErrors({});
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await logout();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Top Bar Indicator */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.avatarBadge,
                  {
                    backgroundColor: isDriver
                      ? theme.colors.secondaryLight
                      : theme.colors.primaryLight,
                  },
                ]}
              >
                {isDriver ? (
                  <User size={22} color={theme.colors.secondary} />
                ) : (
                  <ShieldCheck size={22} color={theme.colors.primaryContainer} />
                )}
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isEditing ? 'Edit Profile' : 'My Profile'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isDriver ? 'Driver Account' : 'Fleet Owner Account'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="large"
                color={isDriver ? theme.colors.secondary : theme.colors.primaryContainer}
              />
              <Text style={styles.loadingText}>Loading profile details...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollInner}
            >
              {/* User Overview Hero Card */}
              <View style={styles.heroCard}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>
                    {(name || user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.heroInfo}>
                  <Text style={styles.heroName}>{name || user?.name || 'User'}</Text>
                  <Text style={styles.heroEmail}>{email || user?.email}</Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.rolePill,
                        {
                          backgroundColor: isDriver
                            ? theme.colors.secondaryLight
                            : theme.colors.primaryLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rolePillText,
                          {
                            color: isDriver
                              ? theme.colors.secondary
                              : theme.colors.primaryContainer,
                          },
                        ]}
                      >
                        {isDriver ? 'Driver Member' : 'Fleet Owner / Admin'}
                      </Text>
                    </View>

                    {isDriver && (
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor:
                              profile?.status === 'INACTIVE'
                                ? theme.colors.leaveBg
                                : theme.colors.presentBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                profile?.status === 'INACTIVE'
                                  ? theme.colors.error
                                  : theme.colors.secondary,
                            },
                          ]}
                        >
                          {profile?.status || 'ACTIVE'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Owner Stats Section */}
              {!isDriver && profile?.stats && (
                <View style={styles.statsCard}>
                  <View style={styles.statCol}>
                    <Text style={styles.statNumber}>{profile.stats.vehicles}</Text>
                    <Text style={styles.statLabel}>Vehicles</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statNumber}>{profile.stats.drivers}</Text>
                    <Text style={styles.statLabel}>Drivers</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statNumber}>{profile.stats.trips}</Text>
                    <Text style={styles.statLabel}>Trips Logged</Text>
                  </View>
                </View>
              )}

              {/* Driver Owner / Fleet Info Card */}
              {isDriver && profile?.owner && (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <Building2 size={16} color={theme.colors.secondary} />
                    <Text style={styles.infoCardTitle}>Fleet Administration</Text>
                  </View>
                  <Text style={styles.infoCardSub}>
                    Owner: {profile.owner.name} • {profile.owner.email}
                  </Text>
                </View>
              )}

              {/* Driver Assigned Vehicle Card */}
              {isDriver && (
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleHeader}>
                    <Car size={16} color={theme.colors.primaryContainer} />
                    <Text style={styles.vehicleCardTitle}>Assigned Fleet Vehicle</Text>
                    <View style={styles.lockBadge}>
                      <Lock size={11} color={theme.colors.outline} />
                      <Text style={styles.lockBadgeText}>Owner Managed</Text>
                    </View>
                  </View>
                  {profile?.assignedVehicle ? (
                    <View style={styles.assignedVehicleBox}>
                      <Text style={styles.vehicleNumber}>
                        {profile.assignedVehicle.vehicleNumber}
                      </Text>
                      <Text style={styles.vehicleDetails}>
                        {profile.assignedVehicle.model} • {profile.assignedVehicle.fuelType || 'CNG'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noVehicleText}>No vehicle assigned by owner yet.</Text>
                  )}
                </View>
              )}

              {/* ================= EDIT MODE vs VIEW MODE ================= */}
              {isEditing ? (
                /* EDIT FORM */
                <View style={styles.editSection}>
                  <View style={styles.formHeaderRow}>
                    <Text style={styles.sectionHeading}>Update Personal Details</Text>
                    {isDriver && (
                      <Text style={styles.driverNote}>
                        (Name, mobile number & email can be edited)
                      </Text>
                    )}
                  </View>

                  {/* Name Input */}
                  <Text style={styles.inputLabel}>
                    Full Name <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      errors.name ? styles.inputWrapError : null,
                    ]}
                  >
                    <User size={18} color={theme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (errors.name) setErrors({ ...errors, name: undefined });
                      }}
                      placeholder="Enter full name"
                      placeholderTextColor={theme.colors.outline}
                    />
                  </View>
                  {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                  {/* Mobile Input */}
                  <Text style={styles.inputLabel}>
                    {isDriver ? 'Mobile Number' : 'Phone Number'} <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      errors.mobile ? styles.inputWrapError : null,
                    ]}
                  >
                    <Phone size={18} color={theme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={mobile}
                      onChangeText={(val) => {
                        setMobile(val);
                        if (errors.mobile) setErrors({ ...errors, mobile: undefined });
                      }}
                      placeholder={isDriver ? '10-digit mobile number' : 'Phone number'}
                      placeholderTextColor={theme.colors.outline}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}

                  {/* Email Input */}
                  <Text style={styles.inputLabel}>
                    Email Address <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      errors.email ? styles.inputWrapError : null,
                    ]}
                  >
                    <Mail size={18} color={theme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="driver@example.com"
                      placeholderTextColor={theme.colors.outline}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                  {/* Optional Password Input */}
                  <Text style={styles.inputLabel}>
                    New Password <Text style={styles.optionalNote}>(Leave blank to keep current)</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <KeyRound size={18} color={theme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.outline}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 6 }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={theme.colors.outline} />
                      ) : (
                        <Eye size={18} color={theme.colors.outline} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Driver Non-Editable / Owner-Locked Fields Notice */}
                  {isDriver && (
                    <View style={styles.lockedNoticeBox}>
                      <View style={styles.lockedNoticeHeader}>
                        <Lock size={15} color="#b45309" />
                        <Text style={styles.lockedNoticeTitle}>Fleet Owner Controlled Fields</Text>
                      </View>
                      <Text style={styles.lockedNoticeText}>
                        • Monthly Salary: ₹{(profile?.salary || 0).toLocaleString()} / month{'\n'}
                        • License Number: {profile?.licenseNumber || 'Not provided'}{'\n'}
                        • Vehicle Assignment: {profile?.assignedVehicle?.vehicleNumber || 'Unassigned'}{'\n'}
                        • Driver Status: {profile?.status || 'ACTIVE'}{'\n'}
                        These fields are managed strictly by your Fleet Owner for payroll and security compliance.
                      </Text>
                    </View>
                  )}

                  {/* Form Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleCancelEdit}
                      disabled={saving}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        {
                          backgroundColor: isDriver
                            ? theme.colors.secondary
                            : theme.colors.primaryContainer,
                        },
                      ]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#fff" />
                          <Text style={styles.saveBtnText}>Save Changes</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* VIEW MODE */
                <View style={styles.viewSection}>
                  <Text style={styles.sectionHeading}>Account Details</Text>

                  {/* Detail Item: Full Name */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconCircle}>
                      <User size={16} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Full Name</Text>
                      <Text style={styles.detailValue}>{name || user?.name || '—'}</Text>
                    </View>
                  </View>

                  {/* Detail Item: Mobile / Phone */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconCircle}>
                      <Phone size={16} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>
                        {isDriver ? 'Mobile Number' : 'Phone Number'}
                      </Text>
                      <Text style={styles.detailValue}>
                        {mobile || profile?.mobile || profile?.phone || user?.phone || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Item: Email */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconCircle}>
                      <Mail size={16} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailValue}>{email || user?.email || '—'}</Text>
                    </View>
                  </View>

                  {/* Driver Specific Employment Fields (Read-Only) */}
                  {isDriver && (
                    <>
                      <View style={styles.detailRow}>
                        <View style={[styles.detailIconCircle, { backgroundColor: '#fef3c7' }]}>
                          <IndianRupee size={16} color="#b45309" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.detailLabel}>Monthly Salary</Text>
                            <View style={styles.lockBadge}>
                              <Lock size={10} color="#b45309" />
                              <Text style={[styles.lockBadgeText, { color: '#b45309' }]}>
                                Owner Managed
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.detailValue, { color: '#047857', fontWeight: '700' }]}>
                            {profile?.salary !== undefined && profile?.salary !== null
                              ? `₹${Number(profile.salary).toLocaleString()} / month`
                              : 'Not configured by owner'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <View style={[styles.detailIconCircle, { backgroundColor: '#f1f5f9' }]}>
                          <FileBadge size={16} color={theme.colors.outline} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.detailLabel}>License Number</Text>
                            <View style={styles.lockBadge}>
                              <Lock size={10} color={theme.colors.outline} />
                              <Text style={styles.lockBadgeText}>Owner Managed</Text>
                            </View>
                          </View>
                          <Text style={styles.detailValue}>
                            {profile?.licenseNumber || 'Not recorded'}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Account Creation Date */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconCircle}>
                      <Calendar size={16} color={theme.colors.outline} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Member Since</Text>
                      <Text style={styles.detailValue}>
                        {profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Active Member'}
                      </Text>
                    </View>
                  </View>

                  {/* Edit Profile Button */}
                  <TouchableOpacity
                    style={[
                      styles.editActionBtn,
                      {
                        backgroundColor: isDriver
                          ? theme.colors.secondary
                          : theme.colors.primaryContainer,
                      },
                    ]}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.85}
                  >
                    <Edit3 size={18} color="#ffffff" />
                    <Text style={styles.editActionBtnText}>
                      {isDriver ? 'Edit Contact & Name' : 'Edit Profile Details'}
                    </Text>
                  </TouchableOpacity>

                  {/* Log Out Option Button */}
                  <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                  >
                    <LogOut size={16} color={theme.colors.error} />
                    <Text style={styles.logoutBtnText}>Sign Out of TravelDesk</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    ...theme.shadows.level2,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLow,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.titleLg,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  body: {
    marginTop: 8,
  },
  scrollInner: {
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 14,
  },
  heroAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    ...theme.typography.titleLg,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  heroEmail: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...theme.shadows.level1,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...theme.typography.titleLg,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryContainer,
  },
  statLabel: {
    ...theme.typography.labelSm,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderLight,
  },
  infoCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: theme.radius.md,
    padding: 12,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: {
    ...theme.typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  infoCardSub: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  vehicleCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    padding: 14,
    ...theme.shadows.level1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  vehicleCardTitle: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
    flex: 1,
  },
  assignedVehicleBox: {
    backgroundColor: theme.colors.surfaceLow,
    padding: 10,
    borderRadius: theme.radius.sm,
  },
  vehicleNumber: {
    ...theme.typography.titleLg,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },
  vehicleDetails: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  noVehicleText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.outline,
    fontStyle: 'italic',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.outline,
  },
  viewSection: {
    gap: 12,
  },
  sectionHeading: {
    ...theme.typography.titleLg,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLow,
  },
  detailIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    ...theme.typography.labelSm,
    fontSize: 11,
    color: theme.colors.outline,
  },
  detailValue: {
    ...theme.typography.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    marginTop: 10,
    ...theme.shadows.level1,
  },
  editActionBtnText: {
    ...theme.typography.titleLg,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorLight,
    marginTop: 4,
  },
  logoutBtnText: {
    ...theme.typography.labelMd,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
  },
  editSection: {
    gap: 10,
  },
  formHeaderRow: {
    marginBottom: 4,
  },
  driverNote: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  inputLabel: {
    ...theme.typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  reqStar: {
    color: theme.colors.error,
  },
  optionalNote: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.outline,
    fontWeight: '400',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: theme.colors.surface,
  },
  inputWrapError: {
    borderColor: theme.colors.error,
    backgroundColor: '#fffbfa',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    ...theme.typography.bodyLg,
    fontSize: 14,
    color: theme.colors.onSurface,
    height: '100%',
  },
  errorText: {
    ...theme.typography.labelSm,
    fontSize: 11,
    color: theme.colors.error,
    marginTop: -4,
  },
  lockedNoticeBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: theme.radius.md,
    padding: 12,
    marginTop: 8,
  },
  lockedNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lockedNoticeTitle: {
    ...theme.typography.labelMd,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  lockedNoticeText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: '#78350f',
    lineHeight: 17,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  cancelBtnText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    ...theme.shadows.level1,
  },
  saveBtnText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
