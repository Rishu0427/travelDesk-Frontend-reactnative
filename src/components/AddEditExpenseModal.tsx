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
import type { Expense, ExpenseCategory, Vehicle, Driver } from '../types';
import {
  X,
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

// 6 Clean categories without duplicate fuel types in the main grid
const DRIVER_CATEGORIES: CategoryOption[] = [
  { label: 'Fuel', hindiLabel: 'डीजल / पेट्रोल / CNG', value: 'PETROL', icon: '⛽', type: 'fuel' },
  { label: 'Toll / Fastag', hindiLabel: 'टोल टैक्स', value: 'TOLL', icon: '🛣️' },
  { label: 'Parking', hindiLabel: 'पार्किंग', value: 'PARKING', icon: '🅿️' },
  { label: 'Repairs', hindiLabel: 'मरम्मत/पंचर', value: 'MAINTENANCE', icon: '🔧', type: 'maintenance' },
  { label: 'Food & Bata', hindiLabel: 'दैनिक भत्ता', value: 'DRIVER_EXPENSE', icon: '🍱', type: 'food' },
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
  // If isOwner is false (driver session), roleMode is ALWAYS locked to 'driver'
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

  // Synchronize initial state on open
  useEffect(() => {
    if (!visible) return;

    // Enforce role: non-owner sessions can NEVER be owner mode
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

  // Set default vehicle if vehicles list updates
  useEffect(() => {
    if (!visible || expenseToEdit) return;
    if (!vehicleId && vehicles.length > 0) {
      setVehicleId(vehicles[0].id);
    }
  }, [visible, expenseToEdit, vehicles, vehicleId]);

  const activeCategories = roleMode === 'driver' ? DRIVER_CATEGORIES : OWNER_CATEGORIES;

  // Single source of truth for fuel category
  const isFuelCategory =
    category === 'CNG' || category === 'PETROL' || category === 'DIESEL';

  const handleCategorySelect = (item: CategoryOption) => {
    if (item.type === 'fuel') {
      setCategory(fuelSubType);
    } else {
      setCategory(item.value);
    }

    // Auto-suggest deductible for Driver Expense if creating new
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
    // If driver paid from pocket, default deductible/reimbursement
    if (method === 'driver_pocket') {
      setDriverDeductible(true);
    }
  };

  // Find assigned vehicle details for display
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || (vehicles.length > 0 ? vehicles[0] : null);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Required Amount', 'Please enter a valid expense amount in ₹.');
      return;
    }

    setLoading(true);
    try {
      // Cleanly format notes with metadata so backend preserves fuel qty, odometer, receipt & payment mode
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
      onClose();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>

          {/* ── Modal Header with Title, Language Toggle & Close ── */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Fuel size={20} color={theme.colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.title}>
                  {expenseToEdit
                    ? language === 'EN' ? 'Edit Expense' : 'खर्च संपादित करें'
                    : language === 'EN' ? 'Add Expense' : 'खर्च जोड़ें'}
                </Text>
                <Text style={styles.subtitle}>
                  {!isOwner
                    ? (language === 'EN' ? 'Log Trip Expense / यात्रा खर्च' : 'यात्रा खर्च दर्ज करें')
                    : (roleMode === 'driver'
                        ? (language === 'EN' ? 'Driver View / चालक व्यय' : 'चालक व्यय दर्ज करें')
                        : (language === 'EN' ? 'Fleet Owner Mode / मालिक खाता' : 'मालिक खाता • फ्लीट बहीखाता'))}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Language Switcher */}
              <TouchableOpacity
                style={styles.langPill}
                onPress={() => setLanguage((prev) => (prev === 'EN' ? 'HI' : 'EN'))}
                activeOpacity={0.7}
              >
                <Text style={[styles.langText, language === 'EN' && styles.langTextActive]}>EN</Text>
                <Text style={styles.langDivider}>|</Text>
                <Text style={[styles.langText, language === 'HI' && styles.langTextActive]}>HI</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Role Switcher: ONLY shown in Owner session (NEVER in Driver session) ── */}
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

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Vehicle Attribution ── */}
            {roleMode === 'driver' ? (
              // Driver Assigned Vehicle Card
              <View style={styles.vehicleCardDriver}>
                <View style={styles.vehicleCardLeft}>
                  <View style={styles.vehicleIconBadge}>
                    <Car size={20} color={theme.colors.primaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleCardLabel}>
                      {language === 'EN' ? 'ASSIGNED VEHICLE' : 'आवंटित वाहन'}
                    </Text>
                    <Text style={styles.vehicleNumber}>
                      {selectedVehicle?.vehicleNumber || 'MH 12 AB 1234'}
                    </Text>
                    <Text style={styles.vehicleModel}>
                      {selectedVehicle ? `${selectedVehicle.model} • Active Trip` : 'Maruti Dzire • Active Trip'}
                    </Text>
                  </View>
                </View>
                <View style={styles.activeTripBadge}>
                  <Text style={styles.activeTripText}>Active Trip</Text>
                </View>
              </View>
            ) : (
              // Owner Vehicle / Overhead Selector
              <View style={styles.ownerVehicleCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {language === 'EN' ? 'Charge Expense To' : 'खर्च का खाता चुनें'}
                  </Text>
                  <View style={styles.pillFleet}>
                    <Text style={styles.pillFleetText}>Fleet Level</Text>
                  </View>
                </View>

                {/* Horizontal list of vehicles */}
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

                {/* Driver attribution if drivers exist */}
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

            {/* ── Step 1: Select Category ── */}
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

            {/* 6 balanced category cards (Single Fuel card) */}
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

            {/* ── Step 2: Amount & Details ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
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

            {/* Amount Box with Quick increment chips */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>
                {language === 'EN' ? 'Enter Amount / कुल राशि (₹)' : 'कुल राशि (₹)'}
              </Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={theme.colors.outlineVariant}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
              {/* Quick addition chips */}
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

            {/* Dynamic Fuel Section: Fuel Type Pills + Quantity + Odometer (ONLY shown when Fuel is selected) */}
            {isFuelCategory && (
              <View style={styles.fuelDetailsContainer}>
                <Text style={styles.inputMiniLabel}>
                  {language === 'EN' ? 'Fuel Type / ईंधन का प्रकार' : 'ईंधन का प्रकार'}
                </Text>
                {/* Single place where fuel subtypes are selected */}
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

                {/* Quantity & Odometer Inputs */}
                <View style={styles.dynamicRow}>
                  <View style={styles.dynamicHalfCol}>
                    <Text style={styles.inputMiniLabel}>
                      Quantity ({fuelSubType === 'CNG' ? 'kg' : 'Ltr'}) / मात्रा
                    </Text>
                    <View style={styles.miniInputWrap}>
                      <TextInput
                        style={styles.miniInput}
                        placeholder="e.g. 16.5"
                        placeholderTextColor={theme.colors.outline}
                        value={fuelQuantity}
                        onChangeText={setFuelQuantity}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>{fuelSubType === 'CNG' ? 'kg' : 'Ltr'}</Text>
                    </View>
                  </View>

                  <View style={styles.dynamicHalfCol}>
                    <Text style={styles.inputMiniLabel}>
                      Odometer (km) / मीटर
                    </Text>
                    <View style={styles.miniInputWrap}>
                      <TextInput
                        style={styles.miniInput}
                        placeholder="e.g. 45260"
                        placeholderTextColor={theme.colors.outline}
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
                  <Calendar size={18} color={theme.colors.primaryContainer} />
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
                <CheckCircle2 size={13} color={theme.colors.secondary} />
                <Text style={styles.verifiedTagText}>Auto Log</Text>
              </View>
            </View>

            {/* ── Step 3: Receipt & Payment Mode ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionTitle}>
                3. Receipt & Mode{' '}
                <Text style={styles.sectionSubTitle}>
                  {language === 'EN' ? '/ भुगतान व रसीद' : '/ रसीद'}
                </Text>
              </Text>
              <View style={[styles.stepBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text style={[styles.stepBadgeText, { color: theme.colors.onSecondaryContainer }]}>
                  {roleMode === 'driver' ? 'OCR Ready' : 'Compliance'}
                </Text>
              </View>
            </View>

            {/* Receipt Upload / OCR Zone */}
            <TouchableOpacity
              style={[styles.receiptZone, hasReceipt && styles.receiptZoneAttached]}
              onPress={() => setHasReceipt((prev) => !prev)}
              activeOpacity={0.8}
            >
              {hasReceipt ? (
                <View style={styles.receiptPreviewRow}>
                  <View style={styles.receiptFileIcon}>
                    <FileText size={22} color={theme.colors.primaryContainer} />
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
                    <X size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.receiptPrompt}>
                  <View style={styles.cameraIconBox}>
                    <Camera size={26} color={theme.colors.primaryContainer} />
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
                    <Sparkles size={12} color={theme.colors.primaryContainer} />
                    <Text style={styles.ocrChipText}>Instant AI OCR Extraction</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Payment Method / Paid By */}
            <Text style={styles.paymentMethodLabel}>
              {language === 'EN' ? 'Paid By / भुगतान का माध्यम' : 'भुगतान का माध्यम'}
            </Text>

            {roleMode === 'driver' ? (
              // Driver Payment Options
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
                          color={isSelected ? theme.colors.primaryContainer : theme.colors.onSurfaceVariant}
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
              // Owner Payment Options (Only visible if opened by Owner)
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
                          color={isSelected ? theme.colors.primaryContainer : theme.colors.onSurfaceVariant}
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

            {/* Notes / Vendor Details */}
            <Text style={styles.label}>
              {language === 'EN' ? 'Vendor / Station Notes (Optional)' : 'पेट्रोल पंप / विक्रेता विवरण'}
            </Text>
            <View style={styles.inputWrap}>
              <FileText size={16} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Indian Oil Petrol Pump, Mumbai Expressway Exit 4"
                placeholderTextColor={theme.colors.outline}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Footer Actions ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <CheckCircle2 size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {roleMode === 'driver'
                      ? (language === 'EN' ? 'Submit Expense / खर्च सबमिट करें' : 'खर्च सबमिट करें')
                      : (language === 'EN' ? 'Record & Approve / खर्च दर्ज करें' : 'खाते में दर्ज करें')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.submitHelperText}>
              {roleMode === 'driver'
                ? 'Logged to fleet operations for manager review & reimbursement'
                : 'Directly booked to fleet expense ledger and P&L statements'}
            </Text>
          </View>

        </View>
      </View>
    </Modal>
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
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    maxHeight: '92%',
    ...theme.shadows.level2,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.titleLg,
    fontSize: 18,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  langText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  langTextActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },
  langDivider: {
    fontSize: 11,
    color: theme.colors.outlineVariant,
    marginHorizontal: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceLow,
  },

  // ── Role Switcher ──
  roleSwitcherWrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  roleTabActive: {
    backgroundColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  roleTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roleTabSubtext: {
    fontSize: 9,
    color: theme.colors.outline,
  },
  roleTabSubtextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // ── Scrollable Body ──
  body: {
    maxHeight: 460,
  },

  // ── Vehicle Cards ──
  vehicleCardDriver: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  vehicleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  vehicleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  vehicleNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  vehicleModel: {
    fontSize: 11,
    color: theme.colors.outline,
  },
  activeTripBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  activeTripText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onSecondaryContainer,
  },

  ownerVehicleCard: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  vehicleChipsScroll: {
    marginTop: 6,
    marginBottom: 4,
  },
  pillFleet: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  pillFleetText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },

  // ── Section Headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
  },
  catSelectedBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  catSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },
  stepBadge: {
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },

  // ── Categories ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  categoryBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryIconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryIconText: {
    fontSize: 16,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  categoryTitleActive: {
    color: '#ffffff',
  },
  categoryHindi: {
    fontSize: 10,
    color: theme.colors.outline,
    textAlign: 'center',
    marginTop: 1,
  },
  categoryHindiActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // ── Fuel Details & Sub-Fuel Selection ──
  fuelDetailsContainer: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  subFuelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  subFuelBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  subFuelBtnActive: {
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryLight,
  },
  subFuelText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  subFuelTextActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },

  // ── Amount Box ──
  amountBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.onSurface,
    minWidth: 100,
    textAlign: 'center',
    paddingVertical: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurface,
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
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  miniInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  miniInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  unitText: {
    fontSize: 11,
    color: theme.colors.outline,
    fontWeight: '500',
  },

  // ── Date & Time Card ──
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  dateTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeLabel: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  dateTimeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 108, 73, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.secondary,
  },

  // ── Receipt Box ──
  receiptZone: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  receiptZoneAttached: {
    borderStyle: 'solid',
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryLight,
  },
  receiptPrompt: {
    alignItems: 'center',
  },
  cameraIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  receiptPromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  receiptPromptSubtitle: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  ocrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  ocrChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },
  receiptPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  receiptFileIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  receiptFileStatus: {
    fontSize: 10,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  receiptRemoveBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.errorLight,
  },

  // ── Payment Methods ──
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  paymentMethodsGroup: {
    gap: 6,
    marginBottom: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  paymentCardActive: {
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryLight,
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  paymentCardTitleActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },
  paymentCardSubtitle: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: theme.colors.primaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryContainer,
  },

  // ── Deductibles ──
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  checkboxCardActive: {
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryLight,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
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
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.full,
  },
  statusPillDeductible: {
    backgroundColor: theme.colors.errorLight,
  },
  statusPillNonDeductible: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusPillTextDeductible: {
    color: theme.colors.error,
  },
  statusPillTextNonDeductible: {
    color: theme.colors.onSurfaceVariant,
  },
  checkboxDescription: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 14,
  },

  // ── Inputs & Pills ──
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 6,
    backgroundColor: theme.colors.surface,
  },
  pillActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  pillText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  driverPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 6,
    backgroundColor: theme.colors.surface,
  },
  driverPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryContainer,
  },
  driverPillText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  driverPillTextActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },

  // ── Footer ──
  footer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  submitBtn: {
    height: 50,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.level1,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
  submitHelperText: {
    fontSize: 10,
    color: theme.colors.outline,
    textAlign: 'center',
    marginTop: 4,
  },
});
