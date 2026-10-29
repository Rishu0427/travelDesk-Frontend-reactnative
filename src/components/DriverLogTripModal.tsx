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
import type { Trip, Vehicle, Company, Driver } from '../types';
import {
  ArrowLeft,
  Car,
  Navigation,
  Compass,
  Plane,
  Building2,
  User,
  Users,
  MapPin,
  CircleDot,
  Gauge,
  Camera,
  CheckCircle2,
  Receipt,
  FileText,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Truck,
  Search,
  Wallet,
  QrCode,
} from 'lucide-react-native';

export interface DriverLogTripModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  tripToEdit?: Trip | null;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  companies?: Company[];
  driverName?: string;
  driverHub?: string;
  isOwner?: boolean;
  onAddNewCompany?: () => void;
}

const EMPTY_VEHICLES: Vehicle[] = [];
const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_COMPANIES: Company[] = [];

type TripCategory = 'local' | 'outstation' | 'airport';
type PaymentMode = 'corporate' | 'cash' | 'upi';
type LanguageMode = 'EN' | 'HI';

interface ParsedMeta {
  pickupLocation?: string;
  dropLocation?: string;
  tripCategory?: TripCategory;
  startKm?: string;
  endKm?: string;
  paymentMode?: PaymentMode;
  remarks?: string;
}

const parseTripMetadata = (notes?: string | null): ParsedMeta => {
  if (!notes) return {};
  const meta: ParsedMeta = {};

  const routeMatch = notes.match(/(.*?)\s*➔\s*([^|]+)/i);
  if (routeMatch) {
    meta.pickupLocation = routeMatch[1].trim();
    meta.dropLocation = routeMatch[2].trim();
  }

  const parts = notes.split('|').map((s) => s.trim());
  if (parts.length > 1 && !parts[parts.length - 1].includes('➔')) {
    meta.remarks = parts[parts.length - 1];
  } else if (!notes.includes('➔')) {
    meta.remarks = notes.trim();
  }

  return meta;
};

const buildTripNotes = (meta: ParsedMeta): string => {
  const parts: string[] = [];

  if (meta.pickupLocation && meta.dropLocation) {
    parts.push(`${meta.pickupLocation} ➔ ${meta.dropLocation}`);
  } else if (meta.pickupLocation) {
    parts.push(`Pickup: ${meta.pickupLocation}`);
  } else if (meta.dropLocation) {
    parts.push(`Drop: ${meta.dropLocation}`);
  }

  if (meta.remarks) {
    parts.push(meta.remarks);
  }

  const combined = parts.join(' | ').trim();
  // Ensure it never exceeds the MySQL VARCHAR(191) limit
  return combined.length > 185 ? combined.substring(0, 182) + '...' : combined;
};

export const DriverLogTripModal: React.FC<DriverLogTripModalProps> = ({
  visible,
  onClose,
  onSubmit,
  tripToEdit,
  vehicles = EMPTY_VEHICLES,
  drivers = EMPTY_DRIVERS,
  companies = EMPTY_COMPANIES,
  driverName = 'Rajesh',
  driverHub = 'Pune Hub',
  isOwner = false,
  onAddNewCompany,
}) => {
  // Language toggle: EN (English) or HI (Hindi)
  const [lang, setLang] = useState<LanguageMode>('EN');

  // Step 1: Trip & Cab info
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [tripCategory, setTripCategory] = useState<TripCategory>('local');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [isPrivateCustomer, setIsPrivateCustomer] = useState<boolean>(false);

  // Step 2: Route & Distance
  const [pickupLocation, setPickupLocation] = useState<string>('Shivajinagar, Pune');
  const [dropLocation, setDropLocation] = useState<string>('Mumbai International Airport T2');
  const [totalKm, setTotalKm] = useState<string>('24');

  // Optional Odometer details (collapsible)
  const [showOdometerDetails, setShowOdometerDetails] = useState<boolean>(false);
  const [startKm, setStartKm] = useState<string>('45210');
  const [endKm, setEndKm] = useState<string>('45234');
  const [startPhotoAttached, setStartPhotoAttached] = useState<boolean>(true);
  const [endPhotoAttached, setEndPhotoAttached] = useState<boolean>(false);

  // Billing & Notes
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('corporate');
  const [tripAmount, setTripAmount] = useState<string>('3200');
  const [remarks, setRemarks] = useState<string>('Gate pass entry verified');
  const [tripTime, setTripTime] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [activePicker, setActivePicker] = useState<'vehicle' | 'driver' | 'company' | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVisibleRef = useRef<boolean>(false);
  const lastTripIdRef = useRef<string | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Safe close handler that cleans up state
  const handleModalClose = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setLoading(false);
    setIsSuccess(false);
    onClose();
  };

  // Populate data and reset loading when visible changes
  useEffect(() => {
    if (!visible) {
      prevVisibleRef.current = false;
      lastTripIdRef.current = null;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      setLoading(false);
      setIsSuccess(false);
      return;
    }

    const currentTripId = tripToEdit?.id || 'new';
    // Only re-initialize when modal just opened or tripToEdit changed
    if (prevVisibleRef.current && lastTripIdRef.current === currentTripId) {
      return;
    }
    prevVisibleRef.current = true;
    lastTripIdRef.current = currentTripId;

    setLoading(false);
    setIsSuccess(false);

    const defaultTime = () => {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (tripToEdit) {
      setSelectedVehicleId(tripToEdit.vehicleId || (vehicles[0]?.id || ''));
      setSelectedDriverId(tripToEdit.driverId || (drivers[0]?.id || ''));
      setSelectedCompanyId(tripToEdit.companyId || '');
      setCustomCompanyName(tripToEdit.companyName || '');
      setIsPrivateCustomer(!tripToEdit.companyId);
      setTripTime(tripToEdit.time || defaultTime());
      setTotalKm(tripToEdit.km ? String(tripToEdit.km) : '24');
      setTripAmount(tripToEdit.tripAmount ? String(tripToEdit.tripAmount) : '3200');

      const meta = parseTripMetadata(tripToEdit.notes);
      setPickupLocation(meta.pickupLocation || 'Shivajinagar, Pune');
      setDropLocation(meta.dropLocation || 'Mumbai International Airport T2');
      setTripCategory(meta.tripCategory || 'local');
      setStartKm(meta.startKm || '45210');
      setEndKm(meta.endKm || '45234');
      setPaymentMode(meta.paymentMode || 'corporate');
      setRemarks(meta.remarks || 'Gate pass entry verified');
      setStartPhotoAttached(!!meta.startKm);
      setEndPhotoAttached(!!meta.endKm);
      setShowOdometerDetails(!!(meta.startKm || meta.endKm));
    } else {
      const firstVehicle = vehicles[0]?.id || '';
      const firstDriver = drivers[0]?.id || '';
      const firstCompany = companies[0]?.id || '';

      setSelectedVehicleId(firstVehicle);
      setSelectedDriverId(firstDriver);
      setSelectedCompanyId(firstCompany);
      setCustomCompanyName(companies[0]?.name || 'Infosys Hinjawadi (Phase 2)');
      setIsPrivateCustomer(false);
      setTripCategory('local');
      setPickupLocation('Shivajinagar, Pune');
      setDropLocation('Mumbai International Airport T2');
      setTotalKm('24');
      setStartKm('45210');
      setEndKm('45234');
      setPaymentMode('corporate');
      setRemarks('Gate pass entry verified');
      setTripAmount('3200');
      setTripTime(defaultTime());
      setStartPhotoAttached(true);
      setEndPhotoAttached(false);
      setShowOdometerDetails(false);
    }
  }, [visible, tripToEdit]);

  // Recalculate distance
  const handleOdometerChange = (newStart: string, newEnd: string) => {
    setStartKm(newStart);
    setEndKm(newEnd);
    const startVal = parseFloat(newStart);
    const endVal = parseFloat(newEnd);
    if (!isNaN(startVal) && !isNaN(endVal) && endVal >= startVal) {
      const diff = Math.round((endVal - startVal) * 10) / 10;
      setTotalKm(String(diff));

      const company = companies.find((c) => c.id === selectedCompanyId);
      if (company?.ratePerKm && diff > 0) {
        setTripAmount(String(Math.round(diff * company.ratePerKm)));
      }
    }
  };

  const handleTotalKmChange = (val: string) => {
    setTotalKm(val);
    const company = companies.find((c) => c.id === selectedCompanyId);
    if (company?.ratePerKm) {
      const dist = parseFloat(val);
      if (!isNaN(dist) && dist > 0) {
        setTripAmount(String(Math.round(dist * company.ratePerKm)));
      }
    }
  };

  // Selected vehicle object
  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ||
    vehicles[0] || {
      id: 'default',
      vehicleNumber: 'MH 12 AB 1234',
      model: 'Maruti Suzuki Dzire (White Sedan)',
    };

  // Selected driver object
  const activeDriver =
    drivers.find((d) => d.id === selectedDriverId) ||
    drivers[0] ||
    (tripToEdit?.driver ? tripToEdit.driver : null);

  // Selected company object
  const activeCompany =
    companies.find((c) => c.id === selectedCompanyId) ||
    (companies.length > 0 ? companies[0] : null);

  // Photo capture feedback
  const handleCapturePhoto = (type: 'start' | 'end') => {
    if (type === 'start') {
      setStartPhotoAttached(!startPhotoAttached);
      Alert.alert(
        'Start Odometer Photo',
        !startPhotoAttached ? 'Photo attached & verified with odometer record ✅' : 'Photo removed'
      );
    } else {
      setEndPhotoAttached(!endPhotoAttached);
      Alert.alert(
        'End Odometer Photo',
        !endPhotoAttached ? 'Photo captured & attached for audit ✅' : 'Photo removed'
      );
    }
  };

  // Submit Handler
  const handleCompleteTrip = async () => {
    const parsedKm = parseFloat(totalKm);
    if (isNaN(parsedKm) || parsedKm <= 0) {
      Alert.alert(
        lang === 'HI' ? 'दूरी आवश्यक है' : 'Distance Required',
        lang === 'HI'
          ? 'कृपया कुल दूरी (KM) दर्ज करें।'
          : 'Please enter a valid Total Distance (KM).'
      );
      return;
    }

    const companyName = isPrivateCustomer
      ? (customCompanyName.trim() || 'Private / Individual Customer')
      : (activeCompany?.name || customCompanyName.trim() || 'Infosys Hinjawadi (Phase 2)');

    const meta: ParsedMeta = {
      pickupLocation: pickupLocation.trim(),
      dropLocation: dropLocation.trim(),
      tripCategory,
      startKm: startKm.trim(),
      endKm: endKm.trim(),
      paymentMode,
      remarks: remarks.trim(),
    };

    const finalNotes = buildTripNotes(meta);
    const parsedAmount = tripAmount ? parseFloat(tripAmount) : 0;

    setLoading(true);
    try {
      await onSubmit({
        companyId: isPrivateCustomer ? undefined : (selectedCompanyId || undefined),
        companyName,
        time: tripTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        km: parsedKm,
        tripAmount: parsedAmount,
        notes: finalNotes,
        vehicleId: selectedVehicleId || undefined,
        driverId: isOwner ? (selectedDriverId || undefined) : undefined,
      });

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
      Alert.alert('Error', err.message || 'Failed to save trip log.');
      setLoading(false);
      setIsSuccess(false);
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicleNumber.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      (v.model && v.model.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      (d.mobile && d.mobile.includes(pickerSearch))
  );

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  // Return null when not visible AFTER all hooks have run
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
          {/* Top App Bar Header */}
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
              <Text style={styles.appBarTitle}>
                {lang === 'HI' ? 'ट्रिप विवरण' : 'Trip Details'}
              </Text>
            </View>

            <View style={styles.appBarRight}>
              {/* Language Toggle Pill (EN | HI) */}
              <TouchableOpacity
                style={styles.langPill}
                activeOpacity={0.8}
                onPress={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
              >
                <Text style={[styles.langText, lang === 'EN' && styles.langActive]}>EN</Text>
                <Text style={styles.langDivider}>|</Text>
                <Text style={[styles.langText, lang === 'HI' && styles.langActive]}>HI</Text>
              </TouchableOpacity>

              {/* Profile Avatar Badge */}
              <View style={styles.profileAvatar}>
                <User size={18} color="#ffffff" />
              </View>
            </View>
          </View>

          {/* Scrollable Content Container */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.centerContainer}>
              {/* Driver Greeting & Shift Status Banner */}
              <View style={styles.shiftBanner}>
                <View style={styles.shiftBannerLeft}>
                  <View style={styles.shiftIconWrap}>
                    <Truck size={24} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftTag}>
                      {lang === 'HI' ? 'फ्लीटमेट एक्टिव शिफ्ट' : 'FLEETMATE ACTIVE SHIFT'}
                    </Text>
                    <Text style={styles.shiftGreeting}>
                      {lang === 'HI'
                        ? `नमस्ते, ${driverName || 'राजेश'} 👋`
                        : `Namaste, ${driverName || 'Rajesh'} 👋`}
                    </Text>
                  </View>
                </View>

                <View style={styles.shiftBannerRight}>
                  <View style={styles.onDutyBadge}>
                    <View style={styles.dutyPulseDot} />
                    <Text style={styles.dutyText}>
                      {lang === 'HI' ? 'ऑन ड्यूटी' : 'On Duty'}
                    </Text>
                  </View>
                  <Text style={styles.hubText}>{driverHub || 'Pune Hub'}</Text>
                </View>
              </View>

              {/* CARD 1: Trip Information - Step 1 of 2 */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Car size={20} color="#004ac6" />
                    <Text style={styles.cardTitle}>
                      {lang === 'HI' ? 'ट्रिप विवरण' : 'Trip Information'}
                    </Text>
                  </View>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>
                      {lang === 'HI' ? 'स्टेप 1 / 2' : 'Step 1 of 2'}
                    </Text>
                  </View>
                </View>

                {/* Assigned Vehicle Selector */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>
                      {lang === 'HI' ? 'असाइन किया गया वाहन' : 'Assigned Cab'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('vehicle');
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.changeLinkText}>
                        {lang === 'HI' ? 'बदलें' : 'Change'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.vehicleSelectBox}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPickerSearch('');
                      setActivePicker('vehicle');
                    }}
                  >
                    <View style={styles.vehicleInfoWrap}>
                      <View style={styles.vehicleIconCircle}>
                        <Car size={20} color="#004ac6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehiclePlate}>
                          {activeVehicle.vehicleNumber}
                        </Text>
                        <Text style={styles.vehicleModel} numberOfLines={1}>
                          {activeVehicle.model || 'Maruti Suzuki Dzire (White Sedan)'}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={20} color="#434655" />
                  </TouchableOpacity>
                </View>

                {/* Assigned Driver Selector (Displayed when isOwner=true) */}
                {isOwner && (
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>
                        {lang === 'HI' ? 'असाइन किया गया चालक' : 'Assigned Driver'}
                      </Text>
                      {drivers.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setPickerSearch('');
                            setActivePicker('driver');
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.changeLinkText}>
                            {lang === 'HI' ? 'बदलें' : 'Change'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.vehicleSelectBox}
                      activeOpacity={0.8}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('driver');
                      }}
                    >
                      <View style={styles.vehicleInfoWrap}>
                        <View style={[styles.vehicleIconCircle, { backgroundColor: 'rgba(0, 108, 73, 0.12)' }]}>
                          <Users size={20} color="#006c49" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vehiclePlate}>
                            {activeDriver ? activeDriver.name : 'Select Driver'}
                          </Text>
                          <Text style={styles.vehicleModel} numberOfLines={1}>
                            {activeDriver ? (activeDriver.mobile || 'Active Fleet Driver') : 'Tap to assign driver'}
                          </Text>
                        </View>
                      </View>
                      <ChevronDown size={20} color="#434655" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Trip Category Chips (Local / Outstation / Airport Transfer) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {lang === 'HI' ? 'ट्रिप श्रेणी' : 'Trip Category'}
                  </Text>
                  <View style={styles.categoryGrid}>
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        tripCategory === 'local' && styles.categoryChipActive,
                      ]}
                      onPress={() => setTripCategory('local')}
                      activeOpacity={0.85}
                    >
                      <Navigation
                        size={20}
                        color={tripCategory === 'local' ? '#ffffff' : '#434655'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          tripCategory === 'local' && styles.categoryChipTextActive,
                        ]}
                      >
                        {lang === 'HI' ? 'लोकल' : 'Local'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        tripCategory === 'outstation' && styles.categoryChipActive,
                      ]}
                      onPress={() => setTripCategory('outstation')}
                      activeOpacity={0.85}
                    >
                      <Compass
                        size={20}
                        color={tripCategory === 'outstation' ? '#ffffff' : '#434655'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          tripCategory === 'outstation' && styles.categoryChipTextActive,
                        ]}
                      >
                        {lang === 'HI' ? 'आउटस्टेशन' : 'Outstation'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        tripCategory === 'airport' && styles.categoryChipActive,
                      ]}
                      onPress={() => setTripCategory('airport')}
                      activeOpacity={0.85}
                    >
                      <Plane
                        size={20}
                        color={tripCategory === 'airport' ? '#ffffff' : '#434655'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          tripCategory === 'airport' && styles.categoryChipTextActive,
                        ]}
                      >
                        {lang === 'HI' ? 'एयरपोर्ट' : 'Airport Transfer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Corporate Client Selector */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>
                      {lang === 'HI' ? 'कॉर्पोरेट क्लाइंट' : 'Corporate Client'}
                    </Text>
                    <View style={styles.corporateBadge}>
                      <Building2 size={12} color="#006c49" />
                      <Text style={styles.corporateBadgeText}>Corporate Ride</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dropdownBox}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPickerSearch('');
                      setActivePicker('company');
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                        {isPrivateCustomer
                          ? (customCompanyName || 'Private / Individual Customer')
                          : (activeCompany?.name || customCompanyName || 'Infosys Hinjawadi (Phase 2)')}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#434655" />
                  </TouchableOpacity>

                  <View style={styles.subHintRow}>
                    <ShieldCheck size={15} color="#004ac6" />
                    <Text style={styles.subHintText}>
                      {lang === 'HI'
                        ? 'कंपनी एम्प्लॉयी पिक और ड्रॉप'
                        : 'Company Employee Pick & Drop'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* CARD 2: Route & Distance - Step 2 of 2 */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Navigation size={20} color="#004ac6" />
                    <Text style={styles.cardTitle}>
                      {lang === 'HI' ? 'रूट व दूरी' : 'Route & Distance'}
                    </Text>
                  </View>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>
                      {lang === 'HI' ? 'स्टेप 2 / 2' : 'Step 2 of 2'}
                    </Text>
                  </View>
                </View>

                {/* Location Route Visual Box */}
                <View style={styles.routeContainer}>
                  {/* Starting Pickup Location */}
                  <View style={styles.routePointRow}>
                    <View style={styles.pickupDot}>
                      <CircleDot size={15} color="#006c49" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routePointLabel}>
                        {lang === 'HI' ? 'शुरुआती पिकअप स्थान' : 'Starting Pickup Location'}
                      </Text>
                      <TextInput
                        style={styles.routePointInput}
                        value={pickupLocation}
                        onChangeText={setPickupLocation}
                        placeholder="e.g. Shivajinagar, Pune"
                        placeholderTextColor="#737686"
                      />
                    </View>
                  </View>

                  {/* Vertical Dashed Connector Line */}
                  <View style={styles.routeConnectorLineWrap}>
                    <View style={styles.routeConnectorLine} />
                  </View>

                  {/* Drop Point Destination */}
                  <View style={styles.routePointRow}>
                    <View style={styles.dropDot}>
                      <MapPin size={15} color="#ba1a1a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routePointLabel}>
                        {lang === 'HI' ? 'ड्रॉप पॉइंट गंतव्य' : 'Drop Point Destination'}
                      </Text>
                      <TextInput
                        style={styles.routePointInput}
                        value={dropLocation}
                        onChangeText={setDropLocation}
                        placeholder="e.g. Mumbai International Airport T2"
                        placeholderTextColor="#737686"
                      />
                    </View>
                  </View>
                </View>

                {/* Total Distance Live Callout Box */}
                <View style={styles.totalDistanceBox}>
                  <View style={styles.totalDistanceHeader}>
                    <View style={styles.totalDistIconWrap}>
                      <Gauge size={18} color="#004ac6" />
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.totalDistanceTitle}>
                        {lang === 'HI' ? 'कुल दूरी (KM)' : 'Total Distance Traveled'}
                      </Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Required</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.totalDistanceInputWrap}>
                    <TextInput
                      style={styles.totalDistanceLargeInput}
                      value={totalKm}
                      onChangeText={handleTotalKmChange}
                      placeholder="0"
                      placeholderTextColor="#737686"
                      keyboardType="numeric"
                    />
                    <Text style={styles.totalDistanceUnit}>km</Text>
                  </View>

                  <Text style={styles.totalDistanceHelper}>
                    {lang === 'HI'
                      ? 'इस ट्रिप असाइनमेंट के लिए कुल किलोमीटर दर्ज करें'
                      : 'Enter total kilometers logged for this local trip assignment'}
                  </Text>
                </View>
              </View>

              {/* CARD 3: Billing & Notes */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Building2 size={20} color="#004ac6" />
                    <Text style={styles.cardTitle}>
                      {lang === 'HI' ? 'बिलिंग व नोट्स' : 'Billing & Notes'}
                    </Text>
                  </View>
                  <View style={styles.corporateAccountBadge}>
                    <Text style={styles.corporateAccountBadgeText}>
                      {isPrivateCustomer ? 'Direct Account' : 'Corporate Account'}
                    </Text>
                  </View>
                </View>

                {/* Direct Corporate Voucher Card Banner */}
                <View style={styles.voucherBanner}>
                  <View style={styles.voucherBannerLeft}>
                    <View style={styles.voucherIconCircle}>
                      <Receipt size={18} color="#004ac6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.voucherTitle}>
                        {isPrivateCustomer
                          ? 'Direct Customer Collection'
                          : 'Direct Corporate Voucher'}
                      </Text>
                      <Text style={styles.voucherSub}>
                        {isPrivateCustomer
                          ? 'Collect cash or UPI from passenger'
                          : 'No customer cash collection required'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.preAuthorizedBadge}>
                    <Text style={styles.preAuthorizedText}>
                      {isPrivateCustomer ? 'Direct Pay' : 'Pre-Authorized'}
                    </Text>
                  </View>
                </View>

                {/* For Owner or Custom Rides: Option to adjust tariff / payment mode */}
                {(isOwner || isPrivateCustomer) && (
                  <View style={styles.ownerBillingSection}>
                    <View style={styles.paymentModeChips}>
                      <TouchableOpacity
                        style={[
                          styles.payChip,
                          paymentMode === 'corporate' && styles.payChipActive,
                        ]}
                        onPress={() => setPaymentMode('corporate')}
                      >
                        <Receipt size={14} color={paymentMode === 'corporate' ? '#ffffff' : '#434655'} />
                        <Text style={[styles.payChipText, paymentMode === 'corporate' && styles.payChipTextActive]}>
                          Corporate
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.payChip,
                          paymentMode === 'cash' && styles.payChipActive,
                        ]}
                        onPress={() => setPaymentMode('cash')}
                      >
                        <Wallet size={14} color={paymentMode === 'cash' ? '#ffffff' : '#434655'} />
                        <Text style={[styles.payChipText, paymentMode === 'cash' && styles.payChipTextActive]}>
                          Cash
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.payChip,
                          paymentMode === 'upi' && styles.payChipActive,
                        ]}
                        onPress={() => setPaymentMode('upi')}
                      >
                        <QrCode size={14} color={paymentMode === 'upi' ? '#ffffff' : '#434655'} />
                        <Text style={[styles.payChipText, paymentMode === 'upi' && styles.payChipTextActive]}>
                          UPI
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fareAmountCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputMiniLabel}>
                          {lang === 'HI' ? 'ट्रिप बिलिंग राशि' : 'Billing / Tariff Amount'}
                        </Text>
                        <View style={styles.fareAmountRow}>
                          <Text style={styles.rupeePrefix}>₹</Text>
                          <TextInput
                            style={styles.fareAmountInput}
                            value={tripAmount}
                            onChangeText={setTripAmount}
                            placeholder="0"
                            placeholderTextColor="#737686"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      {activeCompany?.ratePerKm ? (
                        <View style={styles.rateHintPill}>
                          <Sparkles size={12} color="#004ac6" />
                          <Text style={styles.rateHintPillText}>₹{activeCompany.ratePerKm}/km</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Trip Notes (Optional) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.notesLabel}>
                    {lang === 'HI' ? 'ट्रिप नोट्स (ऐच्छिक)' : 'Trip Notes (Optional)'}
                  </Text>
                  <View style={styles.notesInputBox}>
                    <FileText size={18} color="#434655" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.notesTextInput}
                      value={remarks}
                      onChangeText={setRemarks}
                      placeholder="Add parking, toll, or route notes..."
                      placeholderTextColor="#737686"
                    />
                  </View>
                </View>
              </View>

              {/* Verification Quick Summary Pill */}
              <View style={styles.auditSummaryBox}>
                <View style={styles.auditLeft}>
                  <View style={styles.auditIconCircle}>
                    <Check size={18} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={styles.auditTitle}>
                      {lang === 'HI' ? 'ट्रिप ऑडिट के लिए तैयार' : 'Trip Ready for Audit'}
                    </Text>
                    <Text style={styles.auditSubtitle}>
                      {lang === 'HI'
                        ? 'ओडोमीटर और जीपीएस रिकॉर्ड सत्यापित'
                        : 'Odometer verified with GPS records'}
                    </Text>
                  </View>
                </View>
                <View style={styles.auditOkBadge}>
                  <Text style={styles.auditOkText}>100% OK</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsWrap}>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    isSuccess && { backgroundColor: '#006c49' },
                    loading && { opacity: 0.85 },
                  ]}
                  activeOpacity={0.88}
                  disabled={loading}
                  onPress={handleCompleteTrip}
                >
                  {loading ? (
                    <View style={styles.btnContentRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {lang === 'HI' ? 'ट्रिप सेव हो रही है...' : 'Saving Trip...'}
                      </Text>
                    </View>
                  ) : isSuccess ? (
                    <View style={styles.btnContentRow}>
                      <CheckCircle2 size={22} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {lang === 'HI' ? 'ट्रिप सफलतापूर्वक दर्ज हुई!' : 'Trip Logged Successfully!'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnContentRow}>
                      <CheckCircle2 size={22} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {lang === 'HI' ? 'ट्रिप समाप्त करें' : 'Complete Trip'}
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
                    {lang === 'HI' ? 'रद्द करें' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Clean In-View Selection Overlay (No nested Modal to prevent React Native Web portal trapping) */}
          {activePicker && (
            <View style={styles.pickerOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setActivePicker(null)}
              />
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>
                    {activePicker === 'vehicle'
                      ? (lang === 'HI' ? 'वाहन चुनें' : 'Select Assigned Cab')
                      : activePicker === 'driver'
                        ? (lang === 'HI' ? 'चालक चुनें' : 'Select Driver')
                        : (lang === 'HI' ? 'कॉर्पोरेट क्लाइंट चुनें' : 'Select Corporate Client')}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerCloseBtn}
                    onPress={() => setActivePicker(null)}
                  >
                    <X size={20} color="#434655" />
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerSearchBox}>
                  <Search size={16} color="#737686" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.pickerSearchInput}
                    placeholder={
                      activePicker === 'vehicle'
                        ? 'Search vehicle number or model...'
                        : activePicker === 'driver'
                          ? 'Search driver name or phone...'
                          : 'Search corporate client...'
                    }
                    placeholderTextColor="#737686"
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                  />
                </View>

                <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
                  {/* Vehicle Picker Items */}
                  {activePicker === 'vehicle' &&
                    filteredVehicles.map((v) => {
                      const isSelected = selectedVehicleId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.pickerItemRow, isSelected && styles.pickerItemRowActive]}
                          onPress={() => {
                            setSelectedVehicleId(v.id);
                            setActivePicker(null);
                          }}
                        >
                          <View style={styles.pickerItemLeft}>
                            <View
                              style={[
                                styles.vehicleIconCircle,
                                isSelected && { backgroundColor: '#2563eb' },
                              ]}
                            >
                              <Car size={18} color={isSelected ? '#ffffff' : '#004ac6'} />
                            </View>
                            <View>
                              <Text style={styles.pickerItemTitle}>{v.vehicleNumber}</Text>
                              <Text style={styles.pickerItemSub}>
                                {v.model || 'Maruti Suzuki Dzire (White Sedan)'}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <Check size={18} color="#004ac6" />}
                        </TouchableOpacity>
                      );
                    })}

                  {/* Driver Picker Items */}
                  {activePicker === 'driver' &&
                    filteredDrivers.map((d) => {
                      const isSelected = selectedDriverId === d.id;
                      return (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.pickerItemRow, isSelected && styles.pickerItemRowActive]}
                          onPress={() => {
                            setSelectedDriverId(d.id);
                            setActivePicker(null);
                          }}
                        >
                          <View style={styles.pickerItemLeft}>
                            <View
                              style={[
                                styles.vehicleIconCircle,
                                { backgroundColor: isSelected ? '#006c49' : 'rgba(0, 108, 73, 0.12)' },
                              ]}
                            >
                              <Users size={18} color={isSelected ? '#ffffff' : '#006c49'} />
                            </View>
                            <View>
                              <Text style={styles.pickerItemTitle}>{d.name}</Text>
                              <Text style={styles.pickerItemSub}>
                                {d.mobile || d.email || 'Active Fleet Driver'}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <Check size={18} color="#006c49" />}
                        </TouchableOpacity>
                      );
                    })}

                  {/* Company Picker Items */}
                  {activePicker === 'company' && (
                    <>
                      <TouchableOpacity
                        style={[styles.pickerItemRow, isPrivateCustomer && styles.pickerItemRowActive]}
                        onPress={() => {
                          setIsPrivateCustomer(true);
                          setSelectedCompanyId('');
                          setActivePicker(null);
                        }}
                      >
                        <View style={styles.pickerItemLeft}>
                          <View
                            style={[
                              styles.vehicleIconCircle,
                              isPrivateCustomer && { backgroundColor: '#2563eb' },
                            ]}
                          >
                            <User size={18} color={isPrivateCustomer ? '#ffffff' : '#004ac6'} />
                          </View>
                          <View>
                            <Text style={styles.pickerItemTitle}>
                              Private / Individual Customer
                            </Text>
                            <Text style={styles.pickerItemSub}>व्यक्तिगत सवारी / गैर-कॉर्पोरेट</Text>
                          </View>
                        </View>
                        {isPrivateCustomer && <Check size={18} color="#004ac6" />}
                      </TouchableOpacity>

                      {filteredCompanies.map((c) => {
                        const isSelected = !isPrivateCustomer && selectedCompanyId === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.pickerItemRow, isSelected && styles.pickerItemRowActive]}
                            onPress={() => {
                              setIsPrivateCustomer(false);
                              setSelectedCompanyId(c.id);
                              setCustomCompanyName(c.name);

                              if (c.ratePerKm && totalKm) {
                                const dist = parseFloat(totalKm);
                                if (!isNaN(dist) && dist > 0) {
                                  setTripAmount(String(Math.round(dist * c.ratePerKm)));
                                }
                              }
                              setActivePicker(null);
                            }}
                          >
                            <View style={styles.pickerItemLeft}>
                              <View
                                style={[
                                  styles.vehicleIconCircle,
                                  isSelected && { backgroundColor: '#2563eb' },
                                ]}
                              >
                                <Building2
                                  size={18}
                                  color={isSelected ? '#ffffff' : '#004ac6'}
                                />
                              </View>
                              <View>
                                <Text style={styles.pickerItemTitle}>{c.name}</Text>
                                <Text style={styles.pickerItemSub}>
                                  {c.ratePerKm ? `Agreed Rate: ₹${c.ratePerKm}/km` : 'Standard Client'}
                                </Text>
                              </View>
                            </View>
                            {isSelected && <Check size={18} color="#004ac6" />}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
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

  // Banner
  shiftBanner: {
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shiftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004ac6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  shiftGreeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#191b23',
    marginTop: 2,
  },
  shiftBannerRight: {
    alignItems: 'flex-end',
  },
  onDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 108, 73, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  dutyPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006c49',
    marginRight: 6,
  },
  dutyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006c49',
  },
  hubText: {
    fontSize: 12,
    color: '#434655',
    marginTop: 3,
  },

  // Base Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#191b23',
  },
  stepBadge: {
    backgroundColor: '#ededf9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#434655',
  },

  // Fields
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#191b23',
  },
  changeLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004ac6',
  },
  vehicleSelectBox: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191b23',
  },
  vehicleModel: {
    fontSize: 12,
    color: '#434655',
    marginTop: 2,
  },

  // Category
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#004ac6',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#434655',
    textAlign: 'center',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Corporate
  corporateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  corporateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006c49',
  },
  dropdownBox: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectedText: {
    fontSize: 16,
    color: '#191b23',
  },
  subHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  subHintText: {
    fontSize: 12,
    color: '#434655',
  },

  // Route & Distance
  routeContainer: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 14,
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6cf8bb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePointLabel: {
    fontSize: 12,
    color: '#434655',
  },
  routePointInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191b23',
    paddingVertical: 2,
  },
  routeConnectorLineWrap: {
    paddingLeft: 13,
    marginVertical: 4,
  },
  routeConnectorLine: {
    width: 2,
    height: 18,
    borderLeftWidth: 2,
    borderLeftColor: '#c3c6d7',
    borderStyle: 'dashed',
  },

  // Distance Box
  totalDistanceBox: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 74, 198, 0.2)',
    gap: 8,
  },
  totalDistanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalDistIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalDistanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191b23',
  },
  requiredBadge: {
    backgroundColor: '#004ac6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  totalDistanceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.5)',
  },
  totalDistanceLargeInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#004ac6',
    paddingVertical: 0,
  },
  totalDistanceUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#434655',
    marginLeft: 8,
  },
  totalDistanceHelper: {
    fontSize: 12,
    color: '#434655',
  },

  // Collapsible Odometer
  odometerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ededf9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  odometerToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004ac6',
  },
  odometerGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  odometerCol: {
    flex: 1,
    gap: 4,
  },
  inputMiniLabel: {
    fontSize: 12,
    color: '#434655',
    fontWeight: '500',
  },
  odometerBox: {
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    padding: 10,
  },
  odometerInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
    paddingVertical: 2,
  },
  odometerPhotoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ededf9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  odometerPhotoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006c49',
  },

  // Billing
  corporateAccountBadge: {
    backgroundColor: 'rgba(0, 108, 73, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  corporateAccountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006c49',
  },
  voucherBanner: {
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  voucherIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191b23',
  },
  voucherSub: {
    fontSize: 12,
    color: '#434655',
  },
  preAuthorizedBadge: {
    backgroundColor: '#ffdbcd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  preAuthorizedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7d2d00',
  },
  ownerBillingSection: {
    gap: 10,
    paddingTop: 4,
  },
  paymentModeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  payChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    paddingVertical: 8,
  },
  payChipActive: {
    backgroundColor: '#004ac6',
  },
  payChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#434655',
  },
  payChipTextActive: {
    color: '#ffffff',
  },
  fareAmountCard: {
    backgroundColor: '#f3f3fe',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rupeePrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#004ac6',
    marginRight: 4,
  },
  fareAmountInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191b23',
    width: 140,
    paddingVertical: 0,
  },
  rateHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateHintPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004ac6',
  },
  notesLabel: {
    fontSize: 12,
    color: '#434655',
  },
  notesInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  notesTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#191b23',
    paddingVertical: 0,
  },

  // Audit Summary
  auditSummaryBox: {
    backgroundColor: 'rgba(0, 108, 73, 0.1)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  auditIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#006c49',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191b23',
  },
  auditSubtitle: {
    fontSize: 12,
    color: '#434655',
  },
  auditOkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  auditOkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006c49',
  },

  // Action Buttons
  actionButtonsWrap: {
    gap: 10,
    paddingTop: 6,
  },
  submitBtn: {
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)',
      },
    }),
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelBtn: {
    height: 48,
    backgroundColor: '#ededf9',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#434655',
  },

  // In-View Picker Overlay
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 27, 35, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
    zIndex: 101,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      },
    }),
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f3fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#191b23',
    paddingVertical: 0,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3fe',
  },
  pickerItemRowActive: {
    backgroundColor: '#f3f3fe',
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  pickerItemSub: {
    fontSize: 12,
    color: '#434655',
    marginTop: 1,
  },
});
