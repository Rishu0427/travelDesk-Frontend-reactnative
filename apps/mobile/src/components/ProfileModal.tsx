import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Linking,
  Share,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { UserProfile, UpdateProfileRequest, Salary } from '../types';
import { confirmAction } from '../utils/alert';
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
  Star,
  MessageCircle,
  Copy,
  Receipt,
  Download,
  Fuel,
  Headphones,
  Check,
  Sparkles,
} from 'lucide-react-native';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSalarySlip?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onOpenSalarySlip,
}) => {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [latestSalary, setLatestSalary] = useState<Salary | null>(null);

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
      const [profileData, salariesData] = await Promise.all([
        api.getProfile().catch((e) => {
          console.warn('Failed to load profile:', e);
          return null;
        }),
        api.getSalaries().catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name || '');
        setEmail(profileData.email || '');
        setMobile(profileData.mobile || profileData.phone || '');
      } else if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setMobile(user.phone || '');
      }

      if (Array.isArray(salariesData) && salariesData.length > 0) {
        // Find most recent salary record
        const sorted = [...salariesData].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setLatestSalary(sorted[0]);
      }

      setPassword('');
      setIsEditing(false);
      setErrors({});
    } catch (err: any) {
      console.warn('Failed to load profile details:', err);
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
      errs.name = language === 'hi' ? 'पूरा नाम आवश्यक है' : 'Full name is required';
    }

    if (!email.trim()) {
      errs.email = language === 'hi' ? 'ईमेल पता आवश्यक है' : 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = language === 'hi' ? 'कृपया मान्य ईमेल दर्ज करें' : 'Please enter a valid email address';
      }
    }

    if (!mobile.trim()) {
      errs.mobile = isDriver
        ? (language === 'hi' ? 'मोबाइल नंबर आवश्यक है' : 'Mobile number is required')
        : (language === 'hi' ? 'फ़ोन नंबर आवश्यक है' : 'Phone number is required');
    } else if (isDriver) {
      const cleanMob = mobile.replace(/[^0-9]/g, '');
      if (cleanMob.length !== 10) {
        errs.mobile = language === 'hi' ? '10-अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Enter a valid 10-digit mobile number';
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
      Alert.alert(
        language === 'hi' ? 'प्रोफ़ाइल अपडेट हुई' : 'Profile Updated',
        language === 'hi'
          ? 'आपके प्रोफ़ाइल विवरण सफलतापूर्वक सहेजे गए।'
          : 'Your profile details have been saved successfully.'
      );
    } catch (err: any) {
      Alert.alert(
        language === 'hi' ? 'अपडेट विफल' : 'Update Failed',
        err.message || 'Could not update profile. Please try again.'
      );
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
    confirmAction(
      language === 'hi' ? 'लॉग आउट' : 'Log Out',
      language === 'hi'
        ? 'क्या आप निश्चित रूप से साइन आउट करना चाहते हैं?'
        : 'Are you sure you want to sign out?',
      async () => {
        onClose();
        await logout();
      },
      language === 'hi' ? 'लॉग आउट' : 'Log Out'
    );
  };

  const handleCall = (phoneNumber: string) => {
    const clean = phoneNumber.replace(/[^0-9+]/g, '');
    if (!clean) return;
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Call Failed', `Cannot dial ${phoneNumber} on this device.`);
    });
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${clean}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        return Linking.openURL(`https://wa.me/${clean}`);
      })
      .catch(() => {
        Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
      });
  };

  const handleCopyEmail = async (emailText: string) => {
    if (!emailText) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(emailText);
      } else {
        await Share.share({ message: emailText });
      }
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      Alert.alert('Email', emailText);
    }
  };

  const handleDownloadSalarySlip = () => {
    if (onOpenSalarySlip) {
      onClose();
      onOpenSalarySlip();
    } else {
      Alert.alert(
        language === 'hi' ? 'वेतन पर्ची' : 'Salary Slip',
        language === 'hi'
          ? 'नवीनतम वेतन पर्ची देखने के लिए मुख्य स्क्रीन पर "वेतन पर्ची देखें" पर टैप करें।'
          : 'You can view and download your detailed salary slip directly from the Home screen salary card.'
      );
    }
  };

  const handleContactManager = () => {
    const mgrPhone = profile?.owner?.phone || '+91 80000 12345';
    confirmAction(
      language === 'hi' ? 'फ्लीट प्रबंधक से संपर्क' : 'Call Fleet Manager',
      language === 'hi'
        ? `${profile?.owner?.name || 'Fleet Manager'} (${mgrPhone}) को कॉल करें?`
        : `Call ${profile?.owner?.name || 'Fleet Manager'} at ${mgrPhone}?`,
      () => handleCall(mgrPhone),
      language === 'hi' ? 'कॉल करें' : 'Call'
    );
  };

  // Content translations
  const t = {
    title: language === 'hi' ? 'ड्राइवर प्रोफ़ाइल' : 'Driver Profile',
    ownerTitle: language === 'hi' ? 'माई प्रोफ़ाइल' : 'My Profile',
    driverSubtitle: language === 'hi' ? 'चालक खाता' : 'Driver Account',
    ownerSubtitle: language === 'hi' ? 'फ्लीट ओनर खाता' : 'Fleet Owner Account',
    driverId: profile?.id ? `DRV-${profile.id.slice(0, 6).toUpperCase()}` : 'DRV-1042',
    onDutyActive: language === 'hi' ? 'ड्यूटी पर • सक्रिय' : 'On Duty • Active',
    hub: language === 'hi' ? 'हिंजेवाड़ी हब' : 'Hinjawadi Hub',
    fleetCategory: language === 'hi' ? 'श्रेणी: सेडान कैब' : 'Fleet Category: Sedan Cab',
    contactInfo: language === 'hi' ? 'संपर्क विवरण' : 'Contact Information',
    edit: language === 'hi' ? 'संशोधन' : 'Edit',
    mobileNumber: language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number',
    verified: language === 'hi' ? 'सत्यापित' : 'Verified',
    workEmail: language === 'hi' ? 'आधिकारिक ईमेल' : 'Work Email Address',
    drivingLicense: language === 'hi' ? 'ड्राइविंग लाइसेंस' : 'Driving License',
    locked: language === 'hi' ? 'सुरक्षित' : 'Locked',
    republicIndia: language === 'hi' ? 'भारतीय गणराज्य • डीएल' : 'REPUBLIC OF INDIA • DL',
    endorsed: language === 'hi' ? 'एलएमवी-टीआर अधिकृत' : 'LMV-TR Endorsed',
    holder: language === 'hi' ? `धारक: ${name || 'Rahul S. Patil'}` : `Holder: ${name || 'Rahul S. Patil'}`,
    validTill: language === 'hi' ? 'मान्य तिथि' : 'Valid Till',
    validTillDate: '14 Aug 2028',
    issuingAuth: language === 'hi' ? 'आरटीओ कार्यालय' : 'Issuing Authority',
    issuingAuthVal: 'RTO Pune (MH-12)',
    readOnlyNotice: language === 'hi'
      ? 'ऑपरेशन्स प्रबंधक द्वारा सत्यापित। दस्तावेज़ केवल पठनीय हैं।'
      : 'Verified by Operations Manager. Documents are read-only.',
    assignedVehicle: language === 'hi' ? 'आवंटित वाहन' : 'Assigned Vehicle',
    fastag: 'FASTag',
    fastagActive: language === 'hi' ? 'सक्रिय एवं जुड़ा' : 'Active & Linked',
    vehicleHealth: language === 'hi' ? 'वाहन स्थिति' : 'Vehicle Health',
    vehicleHealthGood: language === 'hi' ? 'उत्कृष्ट (सर्विस पूरा)' : 'Good (Serviced)',
    assignedDate: language === 'hi'
      ? '01 जनवरी 2024 को वाहन आवंटित किया गया'
      : 'Assigned by Fleet Ops on 01 Jan 2024',
    compensation: language === 'hi' ? 'वेतन एवं भत्ते' : 'Compensation & Salary',
    disbursedMonthly: language === 'hi' ? 'मासिक भुगतान' : 'Disbursed Monthly',
    baseSalary: language === 'hi' ? 'मूल वेतन' : 'Base Salary',
    perMonth: language === 'hi' ? 'प्रति माह' : 'Per calendar month',
    estPayout: language === 'hi' ? 'अनुमानित कुल आय' : 'Est. Total Payout',
    inclIncentives: language === 'hi' ? 'इंसेंटिव व भत्ते सहित' : 'Incl. incentives & TA',
    bankAccount: language === 'hi' ? 'बैंक खाता विवरण' : 'Bank Transfer Account',
    bankVal: 'Bank of Baroda •••• 4821',
    downloadSlip: language === 'hi' ? 'नवीनतम वेतन पर्ची डाउनलोड करें' : 'Download Latest Salary Slip',
    editContactBtn: language === 'hi' ? 'संपर्क विवरण बदलें' : 'Edit Contact Details',
    callManagerBtn: language === 'hi' ? 'फ्लीट प्रबंधक से संपर्क करें' : 'Call Fleet Manager / Support',
    signOut: language === 'hi' ? 'साइन आउट करें' : 'Sign Out of TravelDesk',
  };

  const baseSalaryVal = profile?.salary ? Number(profile.salary) : 18000;
  const estPayoutVal = (latestSalary as any)?.netPayable ? Number((latestSalary as any).netPayable) : 21800;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.avatarBadge,
                  {
                    backgroundColor: isDriver
                      ? theme.colors.primaryLight
                      : theme.colors.primaryLight,
                  },
                ]}
              >
                {isDriver ? (
                  <User size={20} color={theme.colors.primary} />
                ) : (
                  <ShieldCheck size={20} color={theme.colors.primary} />
                )}
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isDriver ? t.title : (isEditing ? 'Edit Profile' : t.ownerTitle)}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isDriver ? t.driverSubtitle : t.ownerSubtitle}
                </Text>
              </View>
            </View>

            {/* Language Toggle + Close Button */}
            <View style={styles.headerRight}>
              {isDriver && (
                <View style={styles.langToggleWrap}>
                  <TouchableOpacity
                    style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                    onPress={() => setLanguage('en')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        language === 'en' && styles.langBtnTextActive,
                      ]}
                    >
                      EN
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.langDivider}>|</Text>
                  <TouchableOpacity
                    style={[styles.langBtn, language === 'hi' && styles.langBtnActive]}
                    onPress={() => setLanguage('hi')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        language === 'hi' && styles.langBtnTextActive,
                      ]}
                    >
                      HI
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
              />
              <Text style={styles.loadingText}>Loading profile details...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollInner}
            >
              {isEditing ? (
                /* ================= EDIT FORM ================= */
                <View style={styles.editSection}>
                  <View style={styles.formHeaderRow}>
                    <Text style={styles.sectionHeading}>
                      {language === 'hi' ? 'व्यक्तिगत विवरण अपडेट करें' : 'Update Personal Details'}
                    </Text>
                    {isDriver && (
                      <Text style={styles.driverNote}>
                        {language === 'hi'
                          ? '(नाम, मोबाइल नंबर और ईमेल में बदलाव संभव)'
                          : '(Name, mobile number & email can be edited)'}
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
                        • Monthly Base Salary: ₹{baseSalaryVal.toLocaleString()} / month{'\n'}
                        • License Number: {profile?.licenseNumber || 'MH12 20180045892'}{'\n'}
                        • Vehicle Assignment: {profile?.assignedVehicle?.vehicleNumber || 'MH 12 AB 1234'}{'\n'}
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
                          backgroundColor: theme.colors.primary,
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
              ) : isDriver ? (
                /* ================= DRIVER PROFILE VIEW (Stitch UI Aligned) ================= */
                <View style={styles.driverContainer}>
                  {/* 1. Driver Overview Hero Card */}
                  <View style={styles.card}>
                    <View style={styles.heroRow}>
                      <View style={styles.avatarWrap}>
                        <View style={styles.driverAvatar}>
                          <Text style={styles.driverAvatarInitial}>
                            {(name || 'R').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </View>
                      </View>

                      <View style={styles.heroDetails}>
                        <Text style={styles.driverName}>{name || 'Rahul Patil'}</Text>
                        <Text style={styles.driverIdText}>ID: {t.driverId}</Text>
                        <View style={styles.heroPillsRow}>
                          <View style={styles.dutyPill}>
                            <View style={styles.dutyDot} />
                            <Text style={styles.dutyText}>{t.onDutyActive}</Text>
                          </View>
                          <Text style={styles.hubText}>{t.hub}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Category & Rating Sub-bar */}
                    <View style={styles.categoryRatingBar}>
                      <View style={styles.fleetCategoryWrap}>
                        <Car size={16} color={theme.colors.primary} />
                        <Text style={styles.fleetCategoryText}>{t.fleetCategory}</Text>
                      </View>
                      <View style={styles.ratingWrap}>
                        <Star size={14} color="#d97706" fill="#d97706" />
                        <Text style={styles.ratingText}>4.89</Text>
                      </View>
                    </View>
                  </View>

                  {/* 2. Contact Information Card */}
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <User size={18} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>{t.contactInfo}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editSmallBtn}
                        onPress={() => setIsEditing(true)}
                        activeOpacity={0.7}
                      >
                        <Edit3 size={13} color={theme.colors.primary} />
                        <Text style={styles.editSmallBtnText}>{t.edit}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Phone Block */}
                    <View style={styles.innerBlock}>
                      <View style={styles.innerBlockHeader}>
                        <Text style={styles.innerBlockLabel}>{t.mobileNumber}</Text>
                        <View style={styles.inlineVerified}>
                          <CheckCircle2 size={13} color={theme.colors.secondary} />
                          <Text style={styles.inlineVerifiedText}>{t.verified}</Text>
                        </View>
                      </View>
                      <View style={styles.phoneActionRow}>
                        <Text style={styles.phoneNumberText}>
                          {mobile || '+91 98765 43210'}
                        </Text>
                        <View style={styles.actionIconsRow}>
                          <TouchableOpacity
                            style={styles.chatIconBtn}
                            onPress={() => handleWhatsApp(mobile || '919876543210')}
                            activeOpacity={0.8}
                          >
                            <MessageCircle size={16} color={theme.colors.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.callIconBtn}
                            onPress={() => handleCall(mobile || '+919876543210')}
                            activeOpacity={0.8}
                          >
                            <Phone size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Email Block */}
                    <View style={styles.innerBlock}>
                      <Text style={styles.innerBlockLabel}>{t.workEmail}</Text>
                      <View style={styles.emailRow}>
                        <Text style={styles.emailText}>
                          {email || 'rahul.patil@fleetops.in'}
                        </Text>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => handleCopyEmail(email || 'rahul.patil@fleetops.in')}
                          activeOpacity={0.7}
                        >
                          {copiedEmail ? (
                            <Check size={16} color={theme.colors.secondary} />
                          ) : (
                            <Copy size={16} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 3. Official Driving License Card (Locked) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <FileBadge size={18} color={theme.colors.tertiary} />
                        <Text style={styles.cardTitle}>{t.drivingLicense}</Text>
                      </View>
                      <View style={styles.lockedPill}>
                        <Lock size={12} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.lockedPillText}>{t.locked}</Text>
                      </View>
                    </View>

                    {/* Visual License Card */}
                    <View style={styles.licenseBox}>
                      <View style={styles.licenseTopRow}>
                        <Text style={styles.licenseCountryText}>{t.republicIndia}</Text>
                        <View style={styles.endorsePill}>
                          <Text style={styles.endorsePillText}>{t.endorsed}</Text>
                        </View>
                      </View>

                      <View style={styles.licenseMid}>
                        <Text style={styles.licenseNumberText}>
                          {profile?.licenseNumber || 'MH12 20180045892'}
                        </Text>
                        <Text style={styles.licenseHolderText}>{t.holder}</Text>
                      </View>

                      <View style={styles.licenseBottomRow}>
                        <View>
                          <Text style={styles.licenseMetaLabel}>{t.validTill}</Text>
                          <Text style={styles.licenseMetaValue}>{t.validTillDate}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.licenseMetaLabel}>{t.issuingAuth}</Text>
                          <Text style={styles.licenseMetaValue}>{t.issuingAuthVal}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Read-Only Notice Bar */}
                    <View style={styles.readOnlyNotice}>
                      <ShieldCheck size={16} color={theme.colors.outline} />
                      <Text style={styles.readOnlyNoticeText}>{t.readOnlyNotice}</Text>
                    </View>
                  </View>

                  {/* 4. Assigned Vehicle Details Card */}
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Car size={18} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>{t.assignedVehicle}</Text>
                      </View>
                      <View style={styles.fleetIdPill}>
                        <Text style={styles.fleetIdText}>Fleet ID: CAB-08</Text>
                      </View>
                    </View>

                    {/* Vehicle Identity Row */}
                    <View style={styles.vehicleRow}>
                      <View style={styles.vehicleThumbnail}>
                        <Car size={32} color={theme.colors.primary} />
                      </View>
                      <View style={styles.vehicleDetails}>
                        <Text style={styles.vehicleRegNumber}>
                          {profile?.assignedVehicle?.vehicleNumber || 'MH 12 AB 1234'}
                        </Text>
                        <Text style={styles.vehicleModelText}>
                          {profile?.assignedVehicle?.model || 'Maruti Suzuki Dzire (2022)'}
                        </Text>
                        <Text style={styles.vehicleSpecsText}>
                          Fuel: {profile?.assignedVehicle?.fuelType || 'CNG + Petrol'} • White Sedan
                        </Text>
                      </View>
                    </View>

                    {/* FASTag & Vehicle Health Grid */}
                    <View style={styles.statusGrid}>
                      <View style={styles.statusCard}>
                        <View style={styles.statusCardIconWrap}>
                          <Sparkles size={16} color={theme.colors.secondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.statusCardLabel}>{t.fastag}</Text>
                          <Text style={[styles.statusCardVal, { color: theme.colors.secondary }]}>
                            {t.fastagActive}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.statusCard}>
                        <View style={styles.statusCardIconWrap}>
                          <ShieldCheck size={16} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.statusCardLabel}>{t.vehicleHealth}</Text>
                          <Text style={[styles.statusCardVal, { color: theme.colors.primary }]}>
                            {t.vehicleHealthGood}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.assignedDateText}>{t.assignedDate}</Text>
                  </View>

                  {/* 5. Compensation & Salary Card */}
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <IndianRupee size={18} color={theme.colors.secondary} />
                        <Text style={styles.cardTitle}>{t.compensation}</Text>
                      </View>
                      <View style={styles.disbursedPill}>
                        <Text style={styles.disbursedPillText}>{t.disbursedMonthly}</Text>
                      </View>
                    </View>

                    {/* Metric Duo */}
                    <View style={styles.salaryGrid}>
                      <View style={styles.salaryMetricBox}>
                        <Text style={styles.salaryMetricLabel}>{t.baseSalary}</Text>
                        <Text style={styles.salaryMetricAmount}>₹{baseSalaryVal.toLocaleString()}</Text>
                        <Text style={styles.salaryMetricSub}>{t.perMonth}</Text>
                      </View>

                      <View style={styles.salaryMetricBox}>
                        <Text style={styles.salaryMetricLabel}>{t.estPayout}</Text>
                        <Text style={[styles.salaryMetricAmount, { color: theme.colors.primary }]}>
                          ₹{estPayoutVal.toLocaleString()}
                        </Text>
                        <Text style={[styles.salaryMetricSub, { color: theme.colors.secondary }]}>
                          {t.inclIncentives}
                        </Text>
                      </View>
                    </View>

                    {/* Bank Details */}
                    <View style={styles.bankRow}>
                      <Building2 size={20} color={theme.colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bankLabel}>{t.bankAccount}</Text>
                        <Text style={styles.bankValText}>{t.bankVal}</Text>
                      </View>
                      <CheckCircle2 size={18} color={theme.colors.secondary} />
                    </View>

                    {/* Download Salary Slip Action */}
                    <TouchableOpacity
                      style={styles.salarySlipActionBtn}
                      onPress={handleDownloadSalarySlip}
                      activeOpacity={0.8}
                    >
                      <View style={styles.salarySlipActionLeft}>
                        <Receipt size={18} color={theme.colors.primary} />
                        <Text style={styles.salarySlipActionText}>{t.downloadSlip}</Text>
                      </View>
                      <Download size={16} color={theme.colors.outline} />
                    </TouchableOpacity>
                  </View>

                  {/* 6. Primary Action Buttons */}
                  <View style={styles.actionButtonsCol}>
                    <TouchableOpacity
                      style={styles.primaryEditBtn}
                      onPress={() => setIsEditing(true)}
                      activeOpacity={0.85}
                    >
                      <Edit3 size={18} color="#ffffff" />
                      <Text style={styles.primaryEditBtnText}>{t.editContactBtn}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.supportBtn}
                      onPress={handleContactManager}
                      activeOpacity={0.85}
                    >
                      <Headphones size={18} color={theme.colors.primary} />
                      <Text style={styles.supportBtnText}>{t.callManagerBtn}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.driverLogoutBtn}
                      onPress={handleLogout}
                      activeOpacity={0.8}
                    >
                      <LogOut size={16} color={theme.colors.error} />
                      <Text style={styles.driverLogoutBtnText}>{t.signOut}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ================= OWNER PROFILE VIEW (Original Layout Kept Pristine) ================= */
                <View style={styles.viewSection}>
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
                              backgroundColor: theme.colors.primaryLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              {
                                color: theme.colors.primaryContainer,
                              },
                            ]}
                          >
                            Fleet Owner
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Owner Stats Section */}
                  {profile?.stats && (
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
                      <Text style={styles.detailLabel}>Phone Number</Text>
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
                        backgroundColor: theme.colors.primaryContainer,
                      },
                    ]}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.85}
                  >
                    <Edit3 size={18} color="#ffffff" />
                    <Text style={styles.editActionBtnText}>Edit Profile Details</Text>
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
    backgroundColor: '#faf8ff',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '94%',
    ...theme.shadows.level2,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainer,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.titleLg,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  langToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  langBtnActive: {
    backgroundColor: '#ffffff',
    ...theme.shadows.level1,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  langBtnTextActive: {
    color: theme.colors.primary,
  },
  langDivider: {
    fontSize: 10,
    color: theme.colors.outlineVariant,
    paddingHorizontal: 2,
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

  /* Driver Stitch Screen Components */
  driverContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...theme.shadows.level1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  driverAvatar: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  driverIdText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  heroPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  dutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  dutyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
  },
  dutyText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  hubText: {
    fontSize: 11,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  categoryRatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: 12,
  },
  fleetCategoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fleetCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },

  /* Card Header */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  editSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  editSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  /* Inner Blocks (Contact Info) */
  innerBlock: {
    backgroundColor: theme.colors.surfaceLow,
    padding: 10,
    borderRadius: theme.radius.md,
    marginBottom: 8,
  },
  innerBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerBlockLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  inlineVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  phoneNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
    flex: 1,
  },
  copyBtn: {
    padding: 4,
  },

  /* License Visual Card */
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  lockedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  licenseBox: {
    backgroundColor: '#f3f4fd',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e2f5',
    gap: 8,
  },
  licenseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  licenseCountryText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  endorsePill: {
    backgroundColor: 'rgba(0, 108, 73, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endorsePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  licenseMid: {
    marginTop: 2,
  },
  licenseNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  licenseHolderText: {
    fontSize: 11,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  licenseBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  licenseMetaLabel: {
    fontSize: 9,
    color: theme.colors.outline,
    textTransform: 'uppercase',
  },
  licenseMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 1,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginTop: 10,
  },
  readOnlyNoticeText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },

  /* Assigned Vehicle Card */
  fleetIdPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  fleetIdText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleRegNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  vehicleModelText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  vehicleSpecsText: {
    fontSize: 11,
    color: theme.colors.outline,
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceLow,
    padding: 8,
    borderRadius: theme.radius.md,
  },
  statusCardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardLabel: {
    fontSize: 10,
    color: theme.colors.outline,
  },
  statusCardVal: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  assignedDateText: {
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'right',
    marginTop: 8,
  },

  /* Compensation & Salary */
  disbursedPill: {
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  disbursedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  salaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  salaryMetricBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLow,
    padding: 10,
    borderRadius: theme.radius.md,
  },
  salaryMetricLabel: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  salaryMetricAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginTop: 3,
  },
  salaryMetricSub: {
    fontSize: 10,
    color: theme.colors.outline,
    marginTop: 2,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceContainer,
    padding: 10,
    borderRadius: theme.radius.md,
    marginTop: 10,
  },
  bankLabel: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  bankValText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 1,
  },
  salarySlipActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceHigh,
    padding: 10,
    borderRadius: theme.radius.md,
    marginTop: 8,
  },
  salarySlipActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salarySlipActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  /* Primary Action Buttons */
  actionButtonsCol: {
    gap: 10,
    marginTop: 4,
  },
  primaryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.radius.lg,
    ...theme.shadows.level1,
  },
  primaryEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  supportBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  driverLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorLight,
    marginTop: 2,
  },
  driverLogoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },

  /* View Section (Owner) */
  viewSection: {
    gap: 12,
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

  /* Edit Form Section */
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
