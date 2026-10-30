import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Expense, ExpenseCategory, Vehicle, Driver } from '../types';
import {
  ArrowLeft,
  Fuel,
  IndianRupee,
  FileText,
  Check,
  Car,
  Camera,
  Calendar,
  CreditCard,
  Banknote,
  Wallet,
  Building,
  CheckCircle2,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';

interface AddEditExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  expenseToEdit?: Expense | null;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  isOwner?: boolean;
}

interface CategoryOption {
  label: string;
  hindiLabel: string;
  value: ExpenseCategory;
  icon: string;
  type?: 'fuel' | 'maintenance' | 'food' | 'other';
}

const DRIVER_CATEGORIES: CategoryOption[] = [
  { label: 'Fuel', hindiLabel: 'डीजल / पेट्रोल / CNG', value: 'PETROL', icon: '⛽', type: 'fuel' },
  { label: 'Toll / Fastag', hindiLabel: 'टोल टैक्स', value: 'TOLL', icon: '🛣️' },
  { label: 'Parking', hindiLabel: 'पार्किंग', value: 'PARKING', icon: '🅿️' },
  { label: 'Repairs', hindiLabel: 'मरम्मत/पंचर', value: 'MAINTENANCE', icon: '🔧', type: 'maintenance' },
  { label: 'Food & Allowance', hindiLabel: 'दैनिक भत्ता', value: 'DRIVER_EXPENSE', icon: '🍱', type: 'food' },
  { label: 'Other', hindiLabel: 'अन्य खर्च', value: 'OTHER', icon: '📦' },
];

const OWNER_CATEGORIES: CategoryOption[] = [
  { label: 'Fuel & Gas', hindiLabel: 'डीजल / पेट्रोल / CNG', value: 'PETROL', icon: '⛽', type: 'fuel' },
  { label: 'Fastag & Tolls', hindiLabel: 'फास्टैग रिचार्ज', value: 'TOLL', icon: '🛣️' },
  { label: 'Service & Spares', hindiLabel: 'सर्विस, टायर, पार्ट्स', value: 'MAINTENANCE', icon: '🔧', type: 'maintenance' },
  { label: 'Driver Salary & Bata', hindiLabel: 'वेतन व अग्रिम', value: 'DRIVER_EXPENSE', icon: '👤', type: 'food' },
  { label: 'Parking & Challan', hindiLabel: 'पार्किंग व चालान', value: 'PARKING', icon: '🅿️' },
  { label: 'General Overhead', hindiLabel: 'वर्कशॉप व अन्य', value: 'OTHER', icon: '🏢' },
];

const EMPTY_ARRAY: any[] = [];

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  expenseToEdit,
  vehicles = EMPTY_ARRAY,
  drivers = EMPTY_ARRAY,
  isOwner = false,
}) => {
  const [roleMode, setRoleMode] = useState<'driver' | 'owner'>(isOwner ? 'owner' : 'driver');
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');

  // Form Fields
  const [category, setCategory] = useState<ExpenseCategory>('PETROL');
  const [fuelSubType, setFuelSubType] = useState<'CNG' | 'PETROL' | 'DIESEL'>('CNG');
  const [amount, setAmount] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverDeductible, setDriverDeductible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('advance_cash');
  const [notes, setNotes] = useState('');
  const [hasReceipt, setHasReceipt] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleModalClose = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setLoading(false);
    setIsSuccess(false);
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      setLoading(false);
      setIsSuccess(false);
      return;
    }

    setLoading(false);
    setIsSuccess(false);
    setRoleMode(isOwner ? 'owner' : 'driver');

    if (expenseToEdit) {
      const cat = expenseToEdit.category || 'OTHER';
      setCategory(cat);
      if (cat === 'CNG' || cat === 'PETROL' || cat === 'DIESEL') {
        setFuelSubType(cat);
      }
      setAmount(expenseToEdit.amount ? expenseToEdit.amount.toString() : '');
      setNotes(expenseToEdit.notes || '');
      setVehicleId(expenseToEdit.vehicleId || (vehicles.length > 0 ? vehicles[0].id : ''));
      setDriverId(expenseToEdit.driverId || (drivers.length > 0 ? drivers[0].id : ''));
      setDriverDeductible(Boolean(expenseToEdit.driverDeductible ?? expenseToEdit.isDriverDeductible));
      setHasReceipt(Boolean(expenseToEdit.notes && expenseToEdit.notes.includes('[Receipt attached]')));
      setFuelQuantity('');
      setOdometer('');
    } else {
      setCategory('CNG');
      setFuelSubType('CNG');
      setAmount('');
      setFuelQuantity('');
      setOdometer('');
      setNotes('');
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : '');
      setDriverId(drivers.length > 0 ? drivers[0].id : '');
      setDriverDeductible(false);
      setPaymentMethod(isOwner ? 'bank_account' : 'advance_cash');
      setHasReceipt(false);
    }
  }, [expenseToEdit, visible, isOwner, vehicles, drivers]);

  useEffect(() => {
    if (!visible || expenseToEdit) return;
    if (!vehicleId && vehicles.length > 0) {
      setVehicleId(vehicles[0].id);
    }
  }, [visible, expenseToEdit, vehicles, vehicleId]);

  const activeCategories = roleMode === 'driver' ? DRIVER_CATEGORIES : OWNER_CATEGORIES;

  const isFuelCategory =
    category === 'CNG' || category === 'PETROL' || category === 'DIESEL';

  const handleCategorySelect = (item: CategoryOption) => {
    if (item.type === 'fuel') {
      setCategory(fuelSubType);
    } else {
      setCategory(item.value);
    }

    if (item.value === 'DRIVER_EXPENSE' && !expenseToEdit) {
      setDriverDeductible(true);
    }
  };

  const handleQuickAdd = (inc: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + inc).toString());
  };

  const handleTogglePaymentMethod = (method: string) => {
    setPaymentMethod(method);
    if (method === 'driver_pocket') {
      setDriverDeductible(true);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || (vehicles.length > 0 ? vehicles[0] : null);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        language === 'HI' ? 'राशि आवश्यक है' : 'Required Amount',
        language === 'HI' ? 'कृपया कुल राशि (₹) दर्ज करें।' : 'Please enter a valid expense amount in ₹.'
      );
      return;
    }

    setLoading(true);
    try {
      const metaParts: string[] = [];
      if (paymentMethod) {
        metaParts.push(`Mode: ${paymentMethod}`);
      }
      if (isFuelCategory) {
        metaParts.push(`Fuel: ${fuelSubType}`);
        if (fuelQuantity) metaParts.push(`Qty: ${fuelQuantity}${fuelSubType === 'CNG' ? 'kg' : 'L'}`);
        if (odometer) metaParts.push(`Odo: ${odometer}km`);
      }
      if (hasReceipt) {
        metaParts.push(`[Receipt attached]`);
      }

      const metaPrefix = metaParts.length > 0 ? `[${metaParts.join(' | ')}] ` : '';
      const finalNotes = `${metaPrefix}${notes.trim()}`.trim();

      const payload = {
        category: isFuelCategory ? fuelSubType : category,
        amount: numAmount,
        notes: finalNotes || undefined,
        vehicleId: vehicleId === 'OVERHEAD' ? undefined : (vehicleId || undefined),
        driverId: roleMode === 'owner' ? (driverId || undefined) : undefined,
        driverDeductible,
        date: new Date().toISOString(),
      };

      await onSubmit(payload);
      setIsSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setIsSuccess(false);
        setLoading(false);
        onClose();
      }, 700);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record expense.');
      setLoading(false);
      setIsSuccess(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.safeRoot}>

          {/* ── Top App Bar (Same header as Add Trip screen) ── */}
          <View style={styles.topAppBar}>
            <View style={styles.appBarLeft}>
              <TouchableOpacity
                accessibilityLabel="Go Back"
                style={styles.backBtn}
                onPress={handleModalClose}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#191b23" />
              </TouchableOpacity>
              <View>
                <Text style={styles.appBarTitle}>
                  {expenseToEdit
                    ? language === 'HI' ? 'खर्च संपादित करें' : 'Edit Expense'
                    : language === 'HI' ? 'खर्च जोड़ें' : 'Add Expense'}
                </Text>
                <Text style={styles.appBarSubtitle}>
                  {!isOwner
                    ? (language === 'HI' ? 'यात्रा खर्च विवरण' : 'Log Trip Expense')
                    : (roleMode === 'driver'
                      ? (language === 'HI' ? 'चालक व्यय' : 'Driver View')
                      : (language === 'HI' ? 'मालिक खाता' : 'Fleet Owner'))}
                </Text>
              </View>
            </View>

            <View style={styles.appBarRight}>
              {/* Language Switcher Pill */}
              <TouchableOpacity
                style={styles.langPill}
                activeOpacity={0.8}
                onPress={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}
              >
                <Text style={[styles.langText, language === 'EN' && styles.langActive]}>EN</Text>
                <Text style={styles.langDivider}>|</Text>
                <Text style={[styles.langText, language === 'HI' && styles.langActive]}>HI</Text>
              </TouchableOpacity>

              {/* Profile Avatar Badge */}
              <View style={styles.profileAvatar}>
                <User size={18} color="#ffffff" />
              </View>
            </View>
          </View>

          {/* ── Scrollable Screen Content ── */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.centerContainer}>

              {/* Role Switcher: ONLY in Owner Session */}
              {isOwner && (
                <View style={styles.roleSwitcherWrap}>
                  <TouchableOpacity
                    style={[styles.roleTab, roleMode === 'driver' && styles.roleTabActive]}
                    onPress={() => setRoleMode('driver')}
                    activeOpacity={0.8}
                  >
                    <Car size={15} color={roleMode === 'driver' ? '#ffffff' : theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={[styles.roleTabText, roleMode === 'driver' && styles.roleTabTextActive]}>
                        Driver Mode
                      </Text>
                      <Text style={[styles.roleTabSubtext, roleMode === 'driver' && styles.roleTabSubtextActive]}>
                        चालक मोड
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleTab, roleMode === 'owner' && styles.roleTabActive]}
                    onPress={() => setRoleMode('owner')}
                    activeOpacity={0.8}
                  >
                    <Building size={15} color={roleMode === 'owner' ? '#ffffff' : theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={[styles.roleTabText, roleMode === 'owner' && styles.roleTabTextActive]}>
                        Fleet Owner
                      </Text>
                      <Text style={[styles.roleTabSubtext, roleMode === 'owner' && styles.roleTabSubtextActive]}>
                        मालिक / मैनेजर
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Assigned Vehicle Card */}
              {roleMode === 'driver' ? (
                <View style={styles.vehicleCardDriver}>
                  <View style={styles.vehicleCardLeft}>
                    <View style={styles.vehicleIconBadge}>
                      <Car size={22} color="#004ac6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleCardLabel}>
                        {language === 'EN' ? 'ASSIGNED VEHICLE' : 'आवंटित वाहन'}
                      </Text>
                      <Text style={styles.vehicleNumber}>
                        {selectedVehicle?.vehicleNumber || 'MH 12 AB 1234'}
                      </Text>
                      <Text style={styles.vehicleModel}>
                        {selectedVehicle ? `${selectedVehicle.model} • Pune-Mumbai Trip` : 'Maruti Dzire • Pune-Mumbai Trip'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activeTripBadge}>
                    <Text style={styles.activeTripText}>Active Trip</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.ownerVehicleCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>
                      {language === 'EN' ? 'Charge Expense To' : 'खर्च का खाता चुनें'}
                    </Text>
                    <View style={styles.pillFleet}>
                      <Text style={styles.pillFleetText}>Fleet Level</Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleChipsScroll}>
                    {vehicles.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.pill, vehicleId === v.id && styles.pillActive]}
                        onPress={() => setVehicleId(v.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pillText, vehicleId === v.id && styles.pillTextActive]}>
                          {v.vehicleNumber} ({v.model})
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.pill, vehicleId === 'OVERHEAD' && styles.pillActive]}
                      onPress={() => setVehicleId('OVERHEAD')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, vehicleId === 'OVERHEAD' && styles.pillTextActive]}>
                        🏢 General Fleet Overhead
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  {drivers.length > 0 && vehicleId !== 'OVERHEAD' && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.sublabel}>
                        {language === 'EN' ? 'Driver / Beneficiary' : 'चालक / लाभार्थी'}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                        {drivers.map((d) => (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.driverPill, driverId === d.id && styles.driverPillActive]}
                            onPress={() => setDriverId(d.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.driverPillText, driverId === d.id && styles.driverPillTextActive]}>
                              {d.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Step 1: Select Category */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    1. Select Category{' '}
                    <Text style={styles.sectionSubTitle}>
                      {language === 'EN' ? '/ श्रेणी चुनें' : '/ श्रेणी'}
                    </Text>
                  </Text>
                  <View style={styles.catSelectedBadge}>
                    <Text style={styles.catSelectedBadgeText}>
                      {isFuelCategory ? `FUEL (${fuelSubType})` : category}
                    </Text>
                  </View>
                </View>

                <View style={styles.categoryGrid}>
                  {activeCategories.map((item) => {
                    const isFuelCard = item.type === 'fuel';
                    const isActive = isFuelCard ? isFuelCategory : category === item.value;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.categoryBtn, isActive && styles.categoryBtnActive]}
                        onPress={() => handleCategorySelect(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.categoryIconWrap, isActive && styles.categoryIconWrapActive]}>
                          <Text style={styles.categoryIconText}>{item.icon}</Text>
                        </View>
                        <Text style={[styles.categoryTitle, isActive && styles.categoryTitleActive]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.categoryHindi, isActive && styles.categoryHindiActive]}>
                          {item.hindiLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Step 2: Amount & Details */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    2. Expense Amount & Details{' '}
                    <Text style={styles.sectionSubTitle}>
                      {language === 'EN' ? '/ कुल राशि' : '/ राशि'}
                    </Text>
                  </Text>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step 2/3</Text>
                  </View>
                </View>

                {/* Amount Box */}
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>
                    {language === 'EN' ? 'Enter Amount / कुल राशि' : 'कुल राशि दर्ज करें'}
                  </Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0"
                      placeholderTextColor="#c3c6d7"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.quickChipsRow}>
                    {[500, 1000, 2000, 5000].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={styles.quickChip}
                        onPress={() => handleQuickAdd(val)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickChipText}>+ ₹{val.toLocaleString('en-IN')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Dynamic Fuel Box: ONLY if Fuel selected */}
                {isFuelCategory && (
                  <View style={styles.fuelDetailsContainer}>
                    <Text style={styles.inputMiniLabel}>
                      {language === 'EN' ? 'Fuel Type / ईंधन का प्रकार' : 'ईंधन का प्रकार'}
                    </Text>
                    <View style={styles.subFuelRow}>
                      {(['CNG', 'PETROL', 'DIESEL'] as const).map((fuel) => (
                        <TouchableOpacity
                          key={fuel}
                          style={[styles.subFuelBtn, fuelSubType === fuel && styles.subFuelBtnActive]}
                          onPress={() => {
                            setFuelSubType(fuel);
                            setCategory(fuel);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.subFuelText, fuelSubType === fuel && styles.subFuelTextActive]}>
                            {fuel === 'CNG' ? '🌿 CNG' : fuel === 'PETROL' ? '⛽ Petrol' : '🛢️ Diesel'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.dynamicRow}>
                      <View style={styles.dynamicHalfCol}>
                        <Text style={styles.inputMiniLabel}>
                          Quantity ({fuelSubType === 'CNG' ? 'kg' : 'Ltr'})
                        </Text>
                        <View style={styles.miniInputWrap}>
                          <TextInput
                            style={styles.miniInput}
                            placeholder="e.g. 16.5"
                            placeholderTextColor="#737686"
                            value={fuelQuantity}
                            onChangeText={setFuelQuantity}
                            keyboardType="numeric"
                          />
                          <Text style={styles.unitText}>{fuelSubType === 'CNG' ? 'kg' : 'Ltr'}</Text>
                        </View>
                      </View>

                      <View style={styles.dynamicHalfCol}>
                        <Text style={styles.inputMiniLabel}>
                          Odometer (km)
                        </Text>
                        <View style={styles.miniInputWrap}>
                          <TextInput
                            style={styles.miniInput}
                            placeholder="e.g. 45260"
                            placeholderTextColor="#737686"
                            value={odometer}
                            onChangeText={setOdometer}
                            keyboardType="numeric"
                          />
                          <Text style={styles.unitText}>km</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Date & Time Row */}
                <View style={styles.dateTimeCard}>
                  <View style={styles.dateTimeLeft}>
                    <View style={styles.calendarIconCircle}>
                      <Calendar size={18} color="#004ac6" />
                    </View>
                    <View>
                      <Text style={styles.dateTimeLabel}>
                        {language === 'EN' ? 'Date & Time / दिनांक व समय' : 'दिनांक व समय'}
                      </Text>
                      <Text style={styles.dateTimeValue}>
                        Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verifiedTag}>
                    <CheckCircle2 size={13} color="#006c49" />
                    <Text style={styles.verifiedTagText}>Auto Log</Text>
                  </View>
                </View>
              </View>

              {/* Step 3: Receipt & Mode */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    3. Receipt & Mode{' '}
                    <Text style={styles.sectionSubTitle}>
                      {language === 'EN' ? '/ भुगतान व रसीद' : '/ रसीद'}
                    </Text>
                  </Text>
                  <View style={[styles.stepBadge, { backgroundColor: '#6cf8bb' }]}>
                    <Text style={[styles.stepBadgeText, { color: '#00714d' }]}>
                      {roleMode === 'driver' ? 'OCR Ready' : 'Compliance'}
                    </Text>
                  </View>
                </View>

                {/* Receipt Upload Zone */}
                <TouchableOpacity
                  style={[styles.receiptZone, hasReceipt && styles.receiptZoneAttached]}
                  onPress={() => setHasReceipt((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  {hasReceipt ? (
                    <View style={styles.receiptPreviewRow}>
                      <View style={styles.receiptFileIcon}>
                        <FileText size={22} color="#004ac6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptFileName}>fuel_receipt_scan.jpg</Text>
                        <Text style={styles.receiptFileStatus}>AI OCR Verified • Matched ₹{amount || '0'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setHasReceipt(false)}
                        style={styles.receiptRemoveBtn}
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#ba1a1a" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.receiptPrompt}>
                      <View style={styles.cameraIconBox}>
                        <Camera size={26} color="#004ac6" />
                      </View>
                      <Text style={styles.receiptPromptTitle}>
                        {roleMode === 'driver'
                          ? 'Take Photo of Bill or Meter'
                          : 'Upload Tax Invoice / Bill (PDF/Photo)'}
                      </Text>
                      <Text style={styles.receiptPromptSubtitle}>
                        {language === 'EN'
                          ? 'रसीद या मीटर की स्पष्ट फोटो खींचें'
                          : 'बिल की फोटो या रसीद संलग्न करें'}
                      </Text>
                      <View style={styles.ocrChip}>
                        <Sparkles size={12} color="#004ac6" />
                        <Text style={styles.ocrChipText}>Instant AI OCR Extraction</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Payment Methods */}
                <Text style={styles.paymentMethodLabel}>
                  {language === 'EN' ? 'Paid By / भुगतान का माध्यम' : 'भुगतान का माध्यम'}
                </Text>

                {roleMode === 'driver' ? (
                  <View style={styles.paymentMethodsGroup}>
                    {[
                      {
                        id: 'advance_cash',
                        title: 'Paid by Cash (Advance)',
                        subtitle: 'कंपनी अग्रिम नकदी से',
                        icon: Banknote,
                      },
                      {
                        id: 'driver_pocket',
                        title: 'Driver Pocket (Reimburse)',
                        subtitle: 'ड्राइवर की जेब से (रिफंड मिलेगा)',
                        icon: Wallet,
                      },
                      {
                        id: 'fleet_card',
                        title: 'Fastag / Fleet Card',
                        subtitle: 'फास्टैग / कंपनी कार्ड',
                        icon: CreditCard,
                      },
                    ].map((item) => {
                      const isSelected = paymentMethod === item.id;
                      const IconComp = item.icon;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.paymentCard, isSelected && styles.paymentCardActive]}
                          onPress={() => handleTogglePaymentMethod(item.id)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.paymentCardLeft}>
                            <IconComp
                              size={18}
                              color={isSelected ? '#004ac6' : '#434655'}
                            />
                            <View>
                              <Text style={[styles.paymentCardTitle, isSelected && styles.paymentCardTitleActive]}>
                                {item.title}
                              </Text>
                              <Text style={styles.paymentCardSubtitle}>{item.subtitle}</Text>
                            </View>
                          </View>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.paymentMethodsGroup}>
                    {[
                      {
                        id: 'bank_account',
                        title: 'Fleet Current Bank (HDFC NetBanking)',
                        subtitle: 'कंपनी बैंक खाता / एनईएफटी',
                        icon: Building,
                      },
                      {
                        id: 'upi',
                        title: 'Company Business UPI / QR',
                        subtitle: 'Google Pay / PhonePe / Paytm',
                        icon: Wallet,
                      },
                      {
                        id: 'corporate_card',
                        title: 'Corporate Fleet Fuel Card',
                        subtitle: 'एचपीसीएल / बीपीसीएल फ्लीट कार्ड',
                        icon: CreditCard,
                      },
                      {
                        id: 'petty_cash',
                        title: 'Office Petty Cash',
                        subtitle: 'दुकान / वर्कशॉप नकद दराज',
                        icon: Banknote,
                      },
                    ].map((item) => {
                      const isSelected = paymentMethod === item.id;
                      const IconComp = item.icon;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.paymentCard, isSelected && styles.paymentCardActive]}
                          onPress={() => handleTogglePaymentMethod(item.id)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.paymentCardLeft}>
                            <IconComp
                              size={18}
                              color={isSelected ? '#004ac6' : '#434655'}
                            />
                            <View>
                              <Text style={[styles.paymentCardTitle, isSelected && styles.paymentCardTitleActive]}>
                                {item.title}
                              </Text>
                              <Text style={styles.paymentCardSubtitle}>{item.subtitle}</Text>
                            </View>
                          </View>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Driver Deductible Option Card */}
                <TouchableOpacity
                  style={[styles.checkboxCard, driverDeductible && styles.checkboxCardActive]}
                  activeOpacity={0.75}
                  onPress={() => setDriverDeductible((prev) => !prev)}
                >
                  <View style={[styles.checkboxBox, driverDeductible && styles.checkboxBoxActive]}>
                    {driverDeductible && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <View style={styles.checkboxInfo}>
                    <View style={styles.checkboxHeadingRow}>
                      <Text style={styles.checkboxTitle}>Driver Deductible / वेतन से कटौती</Text>
                      <View
                        style={[
                          styles.statusPill,
                          driverDeductible ? styles.statusPillDeductible : styles.statusPillNonDeductible,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            driverDeductible ? styles.statusPillTextDeductible : styles.statusPillTextNonDeductible,
                          ]}
                        >
                          {driverDeductible ? '✂️ Deductible' : 'Non-deductible'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.checkboxDescription}>
                      {driverDeductible
                        ? 'Will be deducted from driver salary payout & monthly settlement.'
                        : 'Company / fleet expense (will NOT be deducted from driver).'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Notes Input */}
                <Text style={styles.label}>
                  {language === 'EN' ? 'Vendor / Station Notes (Optional)' : 'पेट्रोल पंप / विक्रेता विवरण'}
                </Text>
                <View style={styles.inputWrap}>
                  <FileText size={16} color="#737686" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Indian Oil Petrol Pump, Mumbai Expressway Exit 4"
                    placeholderTextColor="#737686"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>

              {/* Action Buttons (Submit & Cancel) */}
              <View style={styles.actionButtonsWrap}>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    isSuccess && { backgroundColor: '#006c49' },
                    loading && { opacity: 0.85 },
                  ]}
                  activeOpacity={0.88}
                  disabled={loading}
                  onPress={handleSubmit}
                >
                  {loading ? (
                    <View style={styles.btnContentRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {language === 'HI' ? 'खर्च दर्ज हो रहा है...' : 'Saving Expense...'}
                      </Text>
                    </View>
                  ) : isSuccess ? (
                    <View style={styles.btnContentRow}>
                      <CheckCircle2 size={22} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {language === 'HI' ? 'खर्च सफलतापूर्वक दर्ज हुआ!' : 'Expense Logged Successfully!'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnContentRow}>
                      <CheckCircle2 size={22} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {roleMode === 'driver'
                          ? (language === 'EN' ? 'Submit Expense / खर्च सबमिट करें' : 'खर्च सबमिट करें')
                          : (language === 'EN' ? 'Record & Approve / खर्च दर्ज करें' : 'खाते में दर्ज करें')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                  onPress={handleModalClose}
                  disabled={loading}
                >
                  <X size={18} color="#434655" />
                  <Text style={styles.cancelBtnText}>
                    {language === 'HI' ? 'रद्द करें' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeRoot: {
    width: '100%',
    height: '100%',
    maxWidth: 640,
    backgroundColor: '#faf8ff',
    alignSelf: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        maxHeight: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      } as any,
    }),
  },

  // ── Top App Bar (Matches Add Trip Screen) ──
  topAppBar: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ededf9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      },
    }),
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#191b23',
    lineHeight: 22,
  },
  appBarSubtitle: {
    fontSize: 11,
    color: '#737686',
    lineHeight: 14,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ededf9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  langText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#434655',
  },
  langActive: {
    color: '#004ac6',
    fontWeight: '700',
  },
  langDivider: {
    fontSize: 12,
    color: '#737686',
    marginHorizontal: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004ac6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scrollable View ──
  scrollView: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    width: '100%',
    gap: 16,
  },

  // ── Card Container ──
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ededf9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      },
    }),
  },

  // ── Role Switcher ──
  roleSwitcherWrap: {
    flexDirection: 'row',
    backgroundColor: '#f3f3fe',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  roleTabActive: {
    backgroundColor: '#004ac6',
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#434655',
  },
  roleTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roleTabSubtext: {
    fontSize: 9,
    color: '#737686',
  },
  roleTabSubtextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // ── Vehicle Cards ──
  vehicleCardDriver: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  vehicleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#737686',
    letterSpacing: 0.5,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  vehicleModel: {
    fontSize: 12,
    color: '#737686',
  },
  activeTripBadge: {
    backgroundColor: '#6cf8bb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activeTripText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00714d',
  },

  ownerVehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  vehicleChipsScroll: {
    marginTop: 8,
    marginBottom: 4,
  },
  pillFleet: {
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  pillFleetText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#004ac6',
  },

  // ── Section Headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191b23',
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#434655',
  },
  catSelectedBadge: {
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  catSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004ac6',
  },
  stepBadge: {
    backgroundColor: '#f3f3fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#434655',
  },

  // ── Categories ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  categoryBtnActive: {
    backgroundColor: '#004ac6',
    borderColor: '#004ac6',
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f3fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#191b23',
    textAlign: 'center',
  },
  categoryTitleActive: {
    color: '#ffffff',
  },
  categoryHindi: {
    fontSize: 10,
    color: '#737686',
    textAlign: 'center',
    marginTop: 2,
  },
  categoryHindiActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // ── Fuel Details & Sub-Fuel Selection ──
  fuelDetailsContainer: {
    backgroundColor: '#f3f3fe',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ededf9',
    marginTop: 12,
    marginBottom: 10,
  },
  subFuelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  subFuelBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c3c6d7',
    backgroundColor: '#ffffff',
  },
  subFuelBtnActive: {
    borderColor: '#004ac6',
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
  },
  subFuelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#434655',
  },
  subFuelTextActive: {
    color: '#004ac6',
    fontWeight: '700',
  },

  // ── Amount Box ──
  amountBox: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#434655',
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 30,
    fontWeight: '700',
    color: '#004ac6',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '700',
    color: '#191b23',
    minWidth: 110,
    textAlign: 'center',
    paddingVertical: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#c3c6d7',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#191b23',
  },

  // ── Dynamic Inputs ──
  dynamicRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dynamicHalfCol: {
    flex: 1,
  },
  inputMiniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#434655',
    marginBottom: 4,
  },
  miniInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#c3c6d7',
  },
  miniInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#191b23',
  },
  unitText: {
    fontSize: 11,
    color: '#737686',
    fontWeight: '500',
  },

  // ── Date & Time Card ──
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3fe',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ededf9',
    marginTop: 12,
  },
  dateTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeLabel: {
    fontSize: 11,
    color: '#737686',
  },
  dateTimeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191b23',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 108, 73, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#006c49',
  },

  // ── Receipt Box ──
  receiptZone: {
    backgroundColor: '#f3f3fe',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#c3c6d7',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  receiptZoneAttached: {
    borderStyle: 'solid',
    borderColor: '#004ac6',
    backgroundColor: 'rgba(0, 74, 198, 0.06)',
  },
  receiptPrompt: {
    alignItems: 'center',
  },
  cameraIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
    textAlign: 'center',
  },
  receiptPromptSubtitle: {
    fontSize: 12,
    color: '#737686',
    marginTop: 2,
  },
  ocrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  ocrChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004ac6',
  },
  receiptPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  receiptFileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191b23',
  },
  receiptFileStatus: {
    fontSize: 11,
    color: '#006c49',
    fontWeight: '600',
  },
  receiptRemoveBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },

  // ── Payment Methods ──
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191b23',
    marginBottom: 8,
  },
  paymentMethodsGroup: {
    gap: 8,
    marginBottom: 14,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  paymentCardActive: {
    borderColor: '#004ac6',
    backgroundColor: 'rgba(0, 74, 198, 0.06)',
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191b23',
  },
  paymentCardTitleActive: {
    color: '#004ac6',
    fontWeight: '700',
  },
  paymentCardSubtitle: {
    fontSize: 11,
    color: '#737686',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#737686',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#004ac6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#004ac6',
  },

  // ── Deductibles ──
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ededf9',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  checkboxCardActive: {
    borderColor: '#004ac6',
    backgroundColor: 'rgba(0, 74, 198, 0.04)',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#737686',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxBoxActive: {
    backgroundColor: '#004ac6',
    borderColor: '#004ac6',
  },
  checkboxInfo: {
    flex: 1,
  },
  checkboxHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  checkboxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191b23',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusPillDeductible: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  statusPillNonDeductible: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextDeductible: {
    color: '#ba1a1a',
  },
  statusPillTextNonDeductible: {
    color: '#434655',
  },
  checkboxDescription: {
    fontSize: 11,
    color: '#737686',
    lineHeight: 15,
  },

  // ── Inputs & Pills ──
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191b23',
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#434655',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#ededf9',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#191b23',
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#c3c6d7',
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  pillActive: {
    backgroundColor: '#004ac6',
    borderColor: '#004ac6',
  },
  pillText: {
    fontSize: 12,
    color: '#434655',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  driverPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#c3c6d7',
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  driverPillActive: {
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    borderColor: '#004ac6',
  },
  driverPillText: {
    fontSize: 11,
    color: '#434655',
  },
  driverPillTextActive: {
    color: '#004ac6',
    fontWeight: '700',
  },

  // ── Action Buttons ──
  actionButtonsWrap: {
    gap: 10,
    marginTop: 8,
  },
  submitBtn: {
    height: 52,
    backgroundColor: '#004ac6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 74, 198, 0.25)',
      },
    }),
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelBtn: {
    height: 48,
    backgroundColor: '#ededf9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#434655',
  },
});
