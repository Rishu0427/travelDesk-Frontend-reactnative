import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Salary, Driver, DriverSummary, UserProfile, Trip } from '../types';
import {
  downloadSalarySlipPdf,
  shareSalarySlipOnWhatsApp,
  formatRupee,
  calculateNetPayable,
} from '../utils/salarySlip';
import {
  ArrowLeft,
  CheckCircle2,
  Check,
  User,
  ShieldCheck,
  Calendar,
  Truck,
  Moon,
  Clock,
  Receipt,
  PlusCircle,
  MinusCircle,
  Building2,
  Share2,
  Phone,
  Download,
  Languages,
  AlertCircle,
  HelpCircle,
  Wallet,
} from 'lucide-react-native';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
];

const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_SHORT_HI = [
  'जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून',
  'जुला', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं',
];

export interface SalarySlipModalProps {
  visible: boolean;
  onClose: () => void;
  salary: Salary | null;
  driver?: Driver | DriverSummary | UserProfile | any | null;
  salaries?: Salary[];
  trips?: Trip[];
  fleetManagerName?: string;
  fleetManagerPhone?: string;
  initialLanguage?: 'en' | 'hi';
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  visible,
  onClose,
  salary,
  driver,
  salaries = [],
  trips = [],
  fleetManagerName = 'Rajesh Sharma',
  fleetManagerPhone = '+919822012345',
  initialLanguage = 'en',
}) => {
  const [language, setLanguage] = useState<'en' | 'hi'>(initialLanguage);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Month selector setup: Show available months from API records and recent 4 months
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentYear = now.getFullYear();

  const monthOptions = useMemo(() => {
    const list: { month: number; year: number; isCurrent: boolean; key: string; hasRecord: boolean }[] = [];
    const seenKeys = new Set<string>();

    // 1. First include any months that actually exist in the fetched API salaries
    salaries.forEach((s) => {
      const key = `${s.year}-${s.month}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          month: s.month,
          year: s.year,
          isCurrent: s.month === currentMonthIdx + 1 && s.year === currentYear,
          key,
          hasRecord: true,
        });
      }
    });

    // 2. Also ensure recent 4 months are present for navigation
    for (let i = 0; i < 4; i++) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${m}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const hasRec = salaries.some((s) => s.month === m && s.year === y);
        list.push({
          month: m,
          year: y,
          isCurrent: i === 0,
          key,
          hasRecord: hasRec,
        });
      }
    }

    // Sort descending by year and month
    list.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
    return list;
  }, [salaries, currentMonthIdx, currentYear]);

  // Initial selected month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    salary ? `${salary.year}-${salary.month}` : monthOptions[0]?.key || `${currentYear}-${currentMonthIdx + 1}`
  );

  useEffect(() => {
    if (salary) {
      setSelectedMonthKey(`${salary.year}-${salary.month}`);
    } else if (salaries.length > 0) {
      setSelectedMonthKey(`${salaries[0].year}-${salaries[0].month}`);
    } else if (monthOptions.length > 0) {
      setSelectedMonthKey(monthOptions[0].key);
    }
  }, [salary, salaries, monthOptions]);

  // Resolve current active salary record strictly from API data (or null if new driver with no records)
  const activeSalary: Salary | null = useMemo(() => {
    const [selYearStr, selMonthStr] = selectedMonthKey.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10);

    // 1. Try to find matching record in salaries array
    const matched = salaries.find((s) => s.month === selMonth && s.year === selYear);
    if (matched) return matched;

    // 2. If single salary prop matches selected month
    if (salary && salary.month === selMonth && salary.year === selYear) {
      return salary;
    }

    // 3. Otherwise no record in DB for this month (e.g. new driver)
    return null;
  }, [selectedMonthKey, salaries, salary]);

  // Selected month metadata
  const [selectedYear, selectedMonth] = useMemo(() => {
    const [y, m] = selectedMonthKey.split('-');
    return [parseInt(y, 10) || currentYear, parseInt(m, 10) || currentMonthIdx + 1];
  }, [selectedMonthKey, currentYear, currentMonthIdx]);

  const selectedMonthName =
    language === 'hi' ? MONTH_NAMES_HI[selectedMonth - 1] : MONTH_NAMES_EN[selectedMonth - 1];

  // Trips in the selected month
  const monthTrips = useMemo(() => {
    return trips.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  }, [selectedYear, selectedMonth, trips]);

  const monthTripsCount = monthTrips.length;
  const monthKm = monthTrips.reduce((acc, t) => acc + (t.km || 0), 0);

  // Driver details from real profile/user
  const driverName =
    driver?.name ||
    activeSalary?.driver?.name ||
    'Fleet Driver';
  const driverMobile =
    driver?.mobile ||
    activeSalary?.driver?.mobile ||
    '';
  const driverIdText =
    driver?.licenseNumber ||
    (driver?.id ? `DRV-${String(driver.id).slice(-4)}` : 'DRV-NEW');
  const fleetCode = driver?.assignedVehicle?.vehicleNumber || 'MH-12 Fleet';

  // Calculations from real Salary record
  const baseMonthlyWage = activeSalary ? activeSalary.monthlySalary || 0 : (driver?.salary || 0);
  const workingDays = activeSalary?.workingDays || 26;
  const presentDays = activeSalary ? activeSalary.presentDays : 0;
  const leaveDays = activeSalary ? activeSalary.leaveDays : 0;
  const halfDays = activeSalary ? activeSalary.halfDays : 0;
  const effectivePresent = presentDays + halfDays * 0.5;

  const perDayRate = workingDays > 0 ? baseMonthlyWage / workingDays : 0;
  const earnedBase = Math.round(perDayRate * effectivePresent);
  const bonus = activeSalary ? activeSalary.bonus || 0 : 0;
  const grossEarnings = activeSalary ? Math.round(earnedBase + bonus) : 0;

  const totalDeductions = activeSalary ? activeSalary.deduction || 0 : 0;
  const netDisbursedAmount = activeSalary ? calculateNetPayable(activeSalary) : 0;
  const salaryPaid = activeSalary ? activeSalary.salaryPaid || 0 : 0;
  const pendingSalary = activeSalary ? Math.max(0, netDisbursedAmount - salaryPaid) : 0;

  const isPaid = activeSalary?.paymentStatus === 'PAID';
  const isPartial = activeSalary?.paymentStatus === 'PARTIALLY_PAID';

  // Disbursed date formatting from API
  const disbursedDateStr = useMemo(() => {
    if (!activeSalary) return '';

    if (activeSalary.paidDate) {
      const d = new Date(activeSalary.paidDate);
      const day = String(d.getDate()).padStart(2, '0');
      const mShort = language === 'hi' ? MONTH_SHORT_HI[d.getMonth()] : MONTH_SHORT_EN[d.getMonth()];
      const yr = d.getFullYear();
      return language === 'hi'
        ? `${day} ${mShort} ${yr} को भुगतान किया गया`
        : `Disbursed on ${day} ${mShort} ${yr}`;
    }

    if (isPaid) {
      return language === 'hi'
        ? `${selectedMonthName} ${selectedYear} को भुगतान संपन्न`
        : `Disbursed for ${selectedMonthName} ${selectedYear}`;
    }

    return language === 'hi' ? 'भुगतान प्रक्रियाधीन है' : 'Payment Processing';
  }, [activeSalary, isPaid, language, selectedMonthName, selectedYear]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const handleDownloadPdf = async () => {
    if (!activeSalary) {
      Alert.alert(
        language === 'hi' ? 'पर्ची अनुपलब्ध' : 'Slip Unavailable',
        language === 'hi'
          ? 'इस महीने के लिए अभी कोई वेतन पर्ची तैयार नहीं की गई है।'
          : 'No salary slip has been generated for this month yet.'
      );
      return;
    }

    setDownloading(true);
    try {
      await downloadSalarySlipPdf(activeSalary, driver);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 2500);
    } catch (err: any) {
      Alert.alert(
        language === 'hi' ? 'पीडीएफ त्रुटि' : 'PDF Error',
        err.message || 'Failed to generate PDF salary slip.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleShareSlip = async () => {
    if (!activeSalary) {
      Alert.alert(
        language === 'hi' ? 'पर्ची अनुपलब्ध' : 'Slip Unavailable',
        language === 'hi'
          ? 'शेयर करने के लिए कोई वेतन रिकॉर्ड नहीं है।'
          : 'No salary record available to share.'
      );
      return;
    }

    const summaryText =
      language === 'hi'
        ? `फ्लीटमेट वेतन पर्ची: ${driverName} (${driverIdText})\nमहीना: ${selectedMonthName} ${selectedYear}\nकुल इन-हैंड वेतन: ₹${netDisbursedAmount.toLocaleString('en-IN')}\nस्थिति: ${isPaid ? 'भुगतान संपन्न' : 'लंबित'}`
        : `FleetMate Salary Slip: ${driverName} (${driverIdText})\nMonth: ${selectedMonthName} ${selectedYear}\nTotal Net Pay: ₹${netDisbursedAmount.toLocaleString('en-IN')}\nStatus: ${isPaid ? 'Paid' : 'Pending'}`;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: `Salary Slip - ${driverName}`,
          text: summaryText,
          url: window.location.href,
        });
      } else {
        await Share.share({
          title: `Salary Slip - ${driverName}`,
          message: summaryText,
        });
      }
    } catch {
      await shareSalarySlipOnWhatsApp(activeSalary, driver);
    }
  };

  const handleCallManager = () => {
    Linking.openURL(`tel:${fleetManagerPhone}`).catch(() => {
      Alert.alert('Call', `Please dial ${fleetManagerPhone}`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.safeArea}>
        {/* ── 1. Top Navigation Bar ────────────────────────────────────────── */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color="#191b23" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {language === 'hi' ? 'मासिक वेतन' : 'MonthlySalary'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {/* EN | HI Switcher */}
            <TouchableOpacity
              style={styles.langTogglePill}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langOption,
                  language === 'en' && styles.langOptionActive,
                ]}
              >
                EN
              </Text>
              <Text style={styles.langDivider}>|</Text>
              <Text
                style={[
                  styles.langOption,
                  language === 'hi' && styles.langOptionActive,
                ]}
              >
                HI
              </Text>
            </TouchableOpacity>

            <View style={styles.profileCircle}>
              <User size={16} color="#ffffff" />
            </View>
          </View>
        </View>

        {/* ── Scrollable Body ──────────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 2. Real Driver Profile Header Card ─────────────────────────── */}
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <View style={styles.driverAvatarWrap}>
                <View style={styles.driverAvatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {driverName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.driverName}>{driverName}</Text>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={12} color="#006c49" />
                    <Text style={styles.verifiedText}>
                      {language === 'hi' ? 'सत्यापित' : 'Verified'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.driverSubtitle}>
                  {driverMobile ? `📱 ${driverMobile} • ` : ''}
                  {driverIdText} • {fleetCode}
                </Text>
              </View>
            </View>

            {/* In-page Language Switcher Badge */}
            <TouchableOpacity
              style={styles.inPageLangBtn}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <Languages size={14} color="#004ac6" />
              <Text style={styles.inPageLangText}>
                {language === 'en' ? 'हिन्दी में देखें' : 'View in English'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 3. Month Horizontal Pill Selector ──────────────────────────── */}
          <View style={styles.monthScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthScrollContent}
            >
              {monthOptions.map((opt) => {
                const isSelected = selectedMonthKey === opt.key;
                const mName =
                  language === 'hi'
                    ? MONTH_SHORT_HI[opt.month - 1]
                    : MONTH_SHORT_EN[opt.month - 1];
                const fullMName =
                  language === 'hi'
                    ? MONTH_NAMES_HI[opt.month - 1]
                    : MONTH_NAMES_EN[opt.month - 1];

                const label = opt.isCurrent
                  ? language === 'hi'
                    ? `${fullMName} ${opt.year} (वर्तमान)`
                    : `${mName} ${opt.year} (Current)`
                  : `${mName} ${opt.year}`;

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.monthPill,
                      isSelected && styles.monthPillActive,
                    ]}
                    onPress={() => setSelectedMonthKey(opt.key)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text
                        style={[
                          styles.monthPillText,
                          isSelected && styles.monthPillTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                      {opt.hasRecord && (
                        <View
                          style={[
                            styles.dotIndicator,
                            isSelected && { backgroundColor: '#6cf8bb' },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Condition: Real Record vs Empty State (New Driver) ─────────── */}
          {activeSalary ? (
            <>
              {/* ── 4. Hero Take-Home Salary Highlight Card ────────────────── */}
              <View style={styles.heroCard}>
                <View style={styles.heroAmbientCircle} />

                {/* Status Top Row */}
                <View style={styles.heroStatusRow}>
                  <View style={styles.disbursedWrap}>
                    <View
                      style={[
                        styles.greenStatusDot,
                        !isPaid && { backgroundColor: isPartial ? '#d97706' : '#ba1a1a' },
                      ]}
                    />
                    <Text style={styles.disbursedText}>{disbursedDateStr}</Text>
                  </View>
                  <View
                    style={[
                      styles.paidBadge,
                      !isPaid && {
                        backgroundColor: isPartial ? '#fffbeb' : '#fef2f2',
                      },
                    ]}
                  >
                    <CheckCircle2
                      size={13}
                      color={isPaid ? '#002113' : isPartial ? '#d97706' : '#ba1a1a'}
                    />
                    <Text
                      style={[
                        styles.paidBadgeText,
                        !isPaid && {
                          color: isPartial ? '#d97706' : '#ba1a1a',
                        },
                      ]}
                    >
                      {isPaid
                        ? language === 'hi' ? 'भुगतान संपन्न' : 'Paid'
                        : isPartial
                        ? language === 'hi' ? 'आंशिक भुगतान' : 'Partially Paid'
                        : language === 'hi' ? 'लंबित' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Net Amount Highlight */}
                <View style={styles.amountBlock}>
                  <Text style={styles.netPayLabel}>
                    {language === 'hi'
                      ? 'कुल देय इन-हैंड वेतन'
                      : 'TOTAL NET TAKE-HOME PAY'}
                  </Text>
                  <View style={styles.amountValueRow}>
                    <Text style={styles.headlineAmount}>
                      ₹{netDisbursedAmount.toLocaleString('en-IN')}
                    </Text>
                    {monthTripsCount > 0 && (
                      <Text style={styles.tripsBadge}>
                        {language === 'hi'
                          ? `+ ${monthTripsCount} पूर्ण ट्रिप`
                          : `+ ${monthTripsCount} Completed Trips`}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Disbursal Strip */}
                <View style={styles.bankStrip}>
                  <View style={styles.bankLeft}>
                    <View style={styles.bankIconCircle}>
                      <Building2 size={18} color="#004ac6" />
                    </View>
                    <View style={styles.bankDetails}>
                      <Text style={styles.bankTitle}>
                        {language === 'hi' ? 'बैंक ट्रांसफर / प्रत्यक्ष भुगतान' : 'Direct Bank / Fleet Disbursal'}
                      </Text>
                      <Text style={styles.bankAccount}>
                        {activeSalary.remarks ? activeSalary.remarks : 'Processed via Fleet Payroll'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShareSlip}
                    activeOpacity={0.7}
                    accessibilityLabel="Share slip"
                  >
                    <Share2 size={18} color="#004ac6" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── 5. Attendance & Duty Record Bento Card ──────────────────── */}
              <View style={styles.bentoCard}>
                <View style={styles.bentoHeader}>
                  <View style={styles.bentoHeaderLeft}>
                    <Calendar size={18} color="#004ac6" />
                    <Text style={styles.bentoTitle}>
                      {language === 'hi'
                        ? 'उपस्थिति एवं ड्यूटी विवरण'
                        : 'Attendance & Duty Record'}
                    </Text>
                  </View>
                  <Text style={styles.bentoMonthDays}>
                    {language === 'hi'
                      ? `${workingDays} दिन का महीना`
                      : `${workingDays} Days Month`}
                  </Text>
                </View>

                <View style={styles.bentoGrid}>
                  {/* Days Worked */}
                  <View style={styles.bentoTile}>
                    <View style={styles.tileTop}>
                      <Text style={styles.tileLabel}>
                        {language === 'hi' ? 'ड्यूटी दिन' : 'Days Worked'}
                      </Text>
                      <ShieldCheck size={16} color="#006c49" />
                    </View>
                    <View style={styles.tileBottom}>
                      <Text style={styles.tileValue}>{presentDays}</Text>
                      <Text style={styles.tileUnit}>
                        {language === 'hi' ? ' दिन' : ' days'}
                      </Text>
                    </View>
                  </View>

                  {/* Leaves Taken */}
                  <View style={styles.bentoTile}>
                    <View style={styles.tileTop}>
                      <Text style={styles.tileLabel}>
                        {language === 'hi' ? 'ली गई छुट्टी' : 'Leaves Taken'}
                      </Text>
                      <Calendar size={16} color="#943700" />
                    </View>
                    <View style={styles.tileBottom}>
                      <Text style={[styles.tileValue, { color: '#943700' }]}>
                        {String(leaveDays).padStart(2, '0')}
                      </Text>
                      <Text style={styles.tileUnit}>
                        {language === 'hi' ? ' दिन' : ' days'}
                      </Text>
                    </View>
                  </View>

                  {/* Completed Trips */}
                  <View style={styles.bentoTile}>
                    <View style={styles.tileTop}>
                      <Text style={styles.tileLabel}>
                        {language === 'hi' ? 'कुल ट्रिप्स' : 'Completed Trips'}
                      </Text>
                      <Truck size={16} color="#004ac6" />
                    </View>
                    <View style={styles.tileBottom}>
                      <Text style={styles.tileValue}>{monthTripsCount}</Text>
                      <Text style={styles.tileUnit}>
                        {language === 'hi' ? ' ट्रिप' : ' trips'}
                      </Text>
                    </View>
                  </View>

                  {/* Half Days / Other */}
                  <View style={styles.bentoTile}>
                    <View style={styles.tileTop}>
                      <Text style={styles.tileLabel}>
                        {language === 'hi' ? 'हाफ डे' : 'Half Days'}
                      </Text>
                      <Clock size={16} color="#004ac6" />
                    </View>
                    <View style={styles.tileBottom}>
                      <Text style={styles.tileValue}>
                        {String(halfDays).padStart(2, '0')}
                      </Text>
                      <Text style={styles.tileUnit}>
                        {language === 'hi' ? ' ड्यूटी' : ' duties'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── 6. Salary Computation Breakdown Card ───────────────────── */}
              <View style={styles.computationCard}>
                <View style={styles.computationHeader}>
                  <View style={styles.computationHeaderLeft}>
                    <Receipt size={18} color="#004ac6" />
                    <Text style={styles.computationTitle}>
                      {language === 'hi' ? 'वेतन गणना विवरण' : 'Salary Computation'}
                    </Text>
                  </View>
                  <Text style={styles.detailedBadge}>
                    {language === 'hi' ? 'विस्तृत दृश्य' : 'Detailed View'}
                  </Text>
                </View>

                {/* Section A: Earnings */}
                <View style={styles.compSection}>
                  <View style={styles.sectionHeaderRowA}>
                    <View style={styles.sectionHeaderLeft}>
                      <PlusCircle size={15} color="#006c49" />
                      <Text style={styles.sectionTitleA}>
                        {language === 'hi'
                          ? 'क. सकल आय (अर्निंग्स)'
                          : 'A. Earnings (Gross)'}
                      </Text>
                    </View>
                    <Text style={styles.sectionTotalA}>
                      ₹{grossEarnings.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.itemRowsList}>
                    <View style={styles.compItemRow}>
                      <View style={styles.compItemLeft}>
                        <Text style={styles.compItemName}>
                          {language === 'hi' ? 'उपस्थिति अनुसार मूल वेतन' : 'Earned Base Wage'}
                        </Text>
                        <Text style={styles.compItemSub}>
                          {effectivePresent}/{workingDays} {language === 'hi' ? 'दिन ड्यूटी' : 'duty days'} • {language === 'hi' ? 'दर' : 'Base'}: ₹{baseMonthlyWage.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <Text style={styles.compItemAmount}>
                        ₹{earnedBase.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {bonus > 0 && (
                      <View style={styles.compItemRow}>
                        <View style={styles.compItemLeft}>
                          <Text style={styles.compItemName}>
                            {language === 'hi' ? 'प्रोत्साहन एवं भत्ता' : 'Incentive & Bonus'}
                          </Text>
                          <Text style={styles.compItemSub}>
                            {language === 'hi' ? 'प्रदर्शन व ओवरटाइम प्रोत्साहन' : 'Trips, night halts & overtime'}
                          </Text>
                        </View>
                        <Text style={styles.compItemAmount}>
                          ₹{bonus.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Section B: Deductions */}
                <View style={styles.compSection}>
                  <View style={styles.sectionHeaderRowB}>
                    <View style={styles.sectionHeaderLeft}>
                      <MinusCircle size={15} color="#943700" />
                      <Text style={styles.sectionTitleB}>
                        {language === 'hi'
                          ? 'ख. कटौतियां (डिडक्शन)'
                          : 'B. Deductions'}
                      </Text>
                    </View>
                    <Text style={styles.sectionTotalB}>
                      -₹{totalDeductions.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.itemRowsList}>
                    {totalDeductions > 0 ? (
                      <View style={styles.compItemRow}>
                        <View style={styles.compItemLeft}>
                          <Text style={styles.compItemName}>
                            {language === 'hi' ? 'चालक कटौतियां / अग्रिम' : 'Deductibles / Advances'}
                          </Text>
                          <Text style={styles.compItemSub}>
                            {language === 'hi' ? 'अग्रिम राशि, ईंधन या अन्य समायोजन' : 'Cash advances, fuel/fines adjustments'}
                          </Text>
                        </View>
                        <Text style={[styles.compItemAmount, styles.deductAmount]}>
                          -₹{totalDeductions.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.compItemRow}>
                        <View style={styles.compItemLeft}>
                          <Text style={styles.compItemName}>
                            {language === 'hi' ? 'कोई कटौती नहीं' : 'No Deductions'}
                          </Text>
                          <Text style={styles.compItemSub}>
                            {language === 'hi' ? 'इस अवधि में कोई पेनल्टी या कटौती नहीं है' : 'Zero cuts or fines for this period'}
                          </Text>
                        </View>
                        <Text style={[styles.compItemAmount, { color: '#006c49' }]}>
                          ₹0
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Net Disbursed Strip */}
                <View style={styles.netSummaryBanner}>
                  <View>
                    <Text style={styles.netSummaryLabel}>
                      {language === 'hi'
                        ? 'खाते में प्राप्त शुद्ध वेतन'
                        : 'NET DISBURSED AMOUNT'}
                    </Text>
                    <Text style={styles.netSummaryAmount}>
                      ₹{netDisbursedAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.formulaPill}>
                    <Text style={styles.formulaText}>
                      ₹{grossEarnings.toLocaleString('en-IN')} - ₹
                      {totalDeductions.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* ── Empty State for New Driver / Un-generated Month ─────────── */
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Clock size={32} color="#004ac6" />
              </View>
              <Text style={styles.emptyTitle}>
                {language === 'hi'
                  ? `${selectedMonthName} ${selectedYear} की पर्ची उपलब्ध नहीं है`
                  : `No Salary Slip for ${selectedMonthName} ${selectedYear}`}
              </Text>
              <Text style={styles.emptyDesc}>
                {language === 'hi'
                  ? 'आपके फ्लीट प्रबंधक ने अभी इस अवधि के लिए वेतन पर्ची तैयार नहीं की है। आम तौर पर महीने के अंत में या नए महीने के पहले सप्ताह में वेतन पर्ची जारी की जाती है।'
                  : 'Your fleet administrator has not generated the official salary voucher for this month yet. Monthly slips are typically finalized at the close of each payroll cycle.'}
              </Text>

              {/* Driver Contract Snapshot */}
              <View style={styles.contractSnapshot}>
                <View style={styles.contractRow}>
                  <Text style={styles.contractLabel}>
                    {language === 'hi' ? 'अनुबंधित मूल वेतन' : 'Agreed Monthly Wage'}:
                  </Text>
                  <Text style={styles.contractValue}>
                    {baseMonthlyWage > 0
                      ? `₹${baseMonthlyWage.toLocaleString('en-IN')} / mo`
                      : language === 'hi' ? 'लागू नहीं' : 'Not set'}
                  </Text>
                </View>

                <View style={styles.contractRow}>
                  <Text style={styles.contractLabel}>
                    {language === 'hi' ? 'इस माह पूर्ण ट्रिप्स' : 'Trips Logged This Month'}:
                  </Text>
                  <Text style={styles.contractValue}>
                    {monthTripsCount} {language === 'hi' ? 'ट्रिप' : 'trips'} ({monthKm.toFixed(1)} km)
                  </Text>
                </View>

                <View style={styles.contractRow}>
                  <Text style={styles.contractLabel}>
                    {language === 'hi' ? 'स्थिति' : 'Status'}:
                  </Text>
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingTagText}>
                      {language === 'hi' ? 'प्रतीक्षारत' : 'Awaiting Generation'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── 7. Operational Fleet Contact Help Strip ────────────────────── */}
          <View style={styles.managerHelpCard}>
            <View style={styles.managerAvatarWrap}>
              <View style={styles.managerAvatarFallback}>
                <User size={20} color="#004ac6" />
              </View>
            </View>
            <View style={styles.managerDetails}>
              <Text style={styles.managerHelpTitle}>
                {language === 'hi'
                  ? 'वेतन में कोई सवाल या समस्या?'
                  : 'Any dispute or query?'}
              </Text>
              <Text style={styles.managerHelpSub} numberOfLines={1}>
                {language === 'hi'
                  ? `${fleetManagerName} (फ्लीट प्रबंधक) से बात करें`
                  : `Call ${fleetManagerName} (Fleet Manager)`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCallManager}
              activeOpacity={0.85}
              accessibilityLabel="Call manager"
            >
              <Phone size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── 8. Bottom Sticky Download PDF Slip Button ────────────────────── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.downloadFullBtn,
              !activeSalary && styles.btnDisabled,
              downloading && styles.btnDisabled,
              downloadSuccess && styles.btnSuccess,
            ]}
            onPress={handleDownloadPdf}
            disabled={!activeSalary || downloading}
            activeOpacity={0.9}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : downloadSuccess ? (
              <CheckCircle2 size={20} color="#ffffff" />
            ) : (
              <Download size={20} color="#ffffff" />
            )}
            <Text style={styles.downloadFullBtnText}>
              {!activeSalary
                ? language === 'hi'
                  ? 'वेतन पर्ची अभी उपलब्ध नहीं है'
                  : 'Salary Slip Not Available Yet'
                : downloading
                ? language === 'hi'
                  ? 'पर्ची तैयार हो रही है...'
                  : 'Generating PDF...'
                : downloadSuccess
                ? language === 'hi'
                  ? 'पर्ची डाउनलोड हो गई!'
                  : 'Slip Downloaded!'
                : language === 'hi'
                ? 'वेतन पर्ची डाउनलोड करें (PDF)'
                : 'Download PDF Salary Slip'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf8ff',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },

  // ── 1. Top Header Bar ────────────────────────────────────────────────────
  headerBar: {
    height: 60,
    backgroundColor: 'rgba(250, 248, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#ededf9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ededf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191b23',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ededf9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langOption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737686',
  },
  langOptionActive: {
    color: '#004ac6',
    fontWeight: '800',
  },
  langDivider: {
    marginHorizontal: 5,
    fontSize: 11,
    color: '#c3c6d7',
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004ac6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll Content ───────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },

  // ── 2. Driver Profile Header Card ────────────────────────────────────────
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.level1,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  driverAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#dbe1ff',
  },
  driverAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#dbe1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#004ac6',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 108, 73, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006c49',
  },
  driverSubtitle: {
    fontSize: 12,
    color: '#434655',
    marginTop: 2,
  },
  inPageLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ededf9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  inPageLangText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004ac6',
  },

  // ── 3. Month Pill Selector ───────────────────────────────────────────────
  monthScrollContainer: {
    marginVertical: 2,
  },
  monthScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ededf9',
  },
  monthPillActive: {
    backgroundColor: '#004ac6',
    ...theme.shadows.level1,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#434655',
  },
  monthPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006c49',
    marginLeft: 2,
  },

  // ── 4. Hero Take-Home Salary Card ────────────────────────────────────────
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.level1,
  },
  heroAmbientCircle: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 74, 198, 0.04)',
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disbursedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006c49',
  },
  disbursedText: {
    fontSize: 12,
    color: '#434655',
    fontWeight: '500',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6cf8bb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#002113',
  },
  amountBlock: {
    marginTop: 12,
    marginBottom: 14,
  },
  netPayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#737686',
    letterSpacing: 0.8,
  },
  amountValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  headlineAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#004ac6',
    letterSpacing: -0.5,
  },
  tripsBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006c49',
  },
  bankStrip: {
    backgroundColor: '#ededf9',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bankIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankDetails: {
    flex: 1,
  },
  bankTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#191b23',
  },
  bankAccount: {
    fontSize: 11,
    color: '#434655',
    marginTop: 1,
  },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ── 5. Attendance Bento Card ─────────────────────────────────────────────
  bentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    ...theme.shadows.level1,
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bentoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bentoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191b23',
  },
  bentoMonthDays: {
    fontSize: 12,
    color: '#737686',
    fontWeight: '500',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoTile: {
    width: '48%',
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#434655',
  },
  tileBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191b23',
  },
  tileUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#737686',
  },

  // ── 6. Salary Computation Card ───────────────────────────────────────────
  computationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    ...theme.shadows.level1,
  },
  computationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3fe',
    marginBottom: 12,
  },
  computationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  computationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191b23',
  },
  detailedBadge: {
    fontSize: 12,
    color: '#737686',
    fontWeight: '500',
  },
  compSection: {
    marginBottom: 14,
  },
  sectionHeaderRowA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionHeaderRowB: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitleA: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006c49',
  },
  sectionTotalA: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006c49',
  },
  sectionTitleB: {
    fontSize: 13,
    fontWeight: '700',
    color: '#943700',
  },
  sectionTotalB: {
    fontSize: 13,
    fontWeight: '800',
    color: '#943700',
  },
  itemRowsList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  compItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  compItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191b23',
  },
  compItemSub: {
    fontSize: 11,
    color: '#737686',
    marginTop: 1,
  },
  compItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  deductAmount: {
    color: '#943700',
  },
  netSummaryBanner: {
    backgroundColor: '#004ac6',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  netSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b4c5ff',
    letterSpacing: 0.8,
  },
  netSummaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  formulaPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formulaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },

  // ── Empty State for New Driver ───────────────────────────────────────────
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.level1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 74, 198, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#737686',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  contractSnapshot: {
    width: '100%',
    backgroundColor: '#f3f3fe',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractLabel: {
    fontSize: 12,
    color: '#434655',
    fontWeight: '500',
  },
  contractValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191b23',
  },
  pendingTag: {
    backgroundColor: 'rgba(188, 72, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#bc4800',
  },

  // ── 7. Manager Contact Help Strip ────────────────────────────────────────
  managerHelpCard: {
    backgroundColor: '#ededf9',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  managerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#dbe1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerDetails: {
    flex: 1,
  },
  managerHelpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  managerHelpSub: {
    fontSize: 12,
    color: '#434655',
    marginTop: 1,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#006c49',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 8. Bottom Sticky Button ──────────────────────────────────────────────
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: '#ededf9',
  },
  downloadFullBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#004ac6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.level2,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#737686',
  },
  btnSuccess: {
    backgroundColor: '#006c49',
  },
  downloadFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});
