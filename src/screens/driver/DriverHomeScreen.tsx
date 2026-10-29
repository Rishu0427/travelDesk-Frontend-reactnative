import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import type { Trip, Expense, Vehicle, Salary, Company, UserProfile } from '../../types';
import { DriverLogTripModal } from '../../components/DriverLogTripModal';
import { AddEditExpenseModal } from '../../components/AddEditExpenseModal';
import { SalarySlipModal } from '../../components/SalarySlipModal';
import { ProfileModal } from '../../components/ProfileModal';
import { calculateNetPayable } from '../../utils/salarySlip';
import {
  Truck,
  Car,
  Route,
  Navigation,
  Fuel,
  Calendar,
  Receipt,
  User,
  Plus,
  X,
  ChevronRight,
  ArrowRight,
  Clock,
  RotateCw,
  FileText,
  IndianRupee,
  Edit2,
} from 'lucide-react-native';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
];

const TRANSLATIONS = {
  en: {
    appSubtitle: 'FleetMate Driver',
    appTitle: 'Dashboard',
    dutyOn: 'Duty ON',
    thisMonth: 'This Month',
    totalTrips: 'Total Trips',
    tripsUnit: 'Trips',
    distanceCovered: 'Distance Covered',
    kmUnit: 'km',
    dutyHours: 'Duty Hours',
    hrsUnit: 'hrs',
    monthlySalarySlip: 'Monthly Salary Slip',
    newBadge: 'New',
    readyToView: 'Ready to view',
    processing: 'In Progress',
    viewSlip: 'View Slip',
    recentTripsExpenses: 'Recent Trips & Expenses',
    seeAll: 'See All',
    showLess: 'Show Less',
    completed: 'Completed',
    fuelFilled: 'Fuel Filled',
    expense: 'Expense',
    autoDebited: 'Auto-Debited',
    logEntry: 'Log Entry',
    close: 'Close',
    logNewTrip: 'Add Trip',
    logNewTripSub: 'Customer pickup, route & KM',
    logExpense: 'Add Expense',
    logExpenseSub: 'Fuel, CNG, Petrol, Toll, Parking',
    noActivity: 'No trips or expenses logged yet.',
    noVehicle: 'No vehicle assigned',
    today: 'Today',
    yesterday: 'Yesterday',
  },
  hi: {
    appSubtitle: 'फ्लीटमेट ड्राइवर',
    appTitle: 'डैशबोर्ड',
    dutyOn: 'ड्यूटी चालू',
    thisMonth: 'इस महीने',
    totalTrips: 'कुल ट्रिप',
    tripsUnit: 'ट्रिप्स',
    distanceCovered: 'कुल दूरी',
    kmUnit: 'किमी',
    dutyHours: 'ड्यूटी के घंटे',
    hrsUnit: 'घंटे',
    monthlySalarySlip: 'मासिक वेतन पर्ची',
    newBadge: 'नया',
    readyToView: 'उपलब्ध',
    processing: 'प्रगति पर',
    viewSlip: 'पर्ची देखें',
    recentTripsExpenses: 'हाल की ट्रिप्स और खर्च',
    seeAll: 'सब देखें',
    showLess: 'कम देखें',
    completed: 'पूर्ण',
    fuelFilled: 'ईंधन भरा',
    expense: 'खर्च',
    autoDebited: 'डेबिट हुआ',
    logEntry: 'एंट्री जोड़ें',
    close: 'बंद करें',
    logNewTrip: 'नई ट्रिप जोड़ें',
    logNewTripSub: 'ग्राहक पिकअप, रूट और किमी',
    logExpense: 'खर्च जोड़ें',
    logExpenseSub: 'ईंधन, सीएनजी, पेट्रोल, टोल, पार्किंग',
    noActivity: 'अभी तक कोई ट्रिप या खर्च दर्ज नहीं है।',
    noVehicle: 'कोई वाहन असाइन नहीं',
    today: 'आज',
    yesterday: 'कल',
  },
};

const getTripDisplayInfo = (t: Trip) => {
  const metaMatch = t.notes?.match(/<!--META:(.*?)-->/);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      return {
        route:
          parsed.pickupLocation && parsed.dropLocation
            ? `${parsed.pickupLocation} ➔ ${parsed.dropLocation}`
            : parsed.pickupLocation || parsed.dropLocation || null,
        customer: parsed.customerName
          ? `${parsed.customerName}${parsed.customerPhone ? ` (${parsed.customerPhone})` : ''}`
          : null,
        category: parsed.tripCategory as string | undefined,
        paymentMode: parsed.paymentMode as string | undefined,
      };
    } catch { }
  }
  const routeMatch = t.notes?.match(/Route:\s*([^|]+)/i);
  const custMatch = t.notes?.match(/Customer:\s*([^|]+)/i);
  return {
    route: routeMatch ? routeMatch[1].trim() : null,
    customer: custMatch ? custMatch[1].trim() : null,
    category: undefined,
    paymentMode: undefined,
  };
};

type FeedItem =
  | { type: 'trip'; date: string; rawDate: Date; data: Trip }
  | { type: 'expense'; date: string; rawDate: Date; data: Expense };

export const DriverHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const t = TRANSLATIONS[language];

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [latestSalary, setLatestSalary] = useState<Salary | null>(null);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // View All toggle in Recent Activity
  const [showAllFeed, setShowAllFeed] = useState<boolean>(false);

  // Speed-dial FAB state (with 2 options: Add Trip, Add Expense)
  const [isFabMenuOpen, setIsFabMenuOpen] = useState<boolean>(false);

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tripsData, expensesData, vehiclesData, salariesData, companiesData, profileData] =
        await Promise.all([
          api.getTrips().catch(() => []),
          api.getExpenses().catch(() => []),
          api.getVehicles().catch(() => []),
          api.getSalaries().catch(() => []),
          api.getCompanies().catch(() => []),
          api.getProfile().catch(() => null),
        ]);

      setAllTrips(tripsData);
      setAllExpenses(expensesData);
      setVehicles(vehiclesData);
      setCompanies(companiesData);
      setProfile(profileData);
      const sList = Array.isArray(salariesData) ? salariesData : [];
      setSalaries(sList);

      if (sList.length > 0) {
        setLatestSalary(sList[0]);
      } else {
        setLatestSalary(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load driver dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveTrip = async (data: any) => {
    if (tripToEdit) {
      await api.updateTrip(tripToEdit.id, data);
    } else {
      await api.createTrip(data);
    }
    await loadData();
  };

  const handleSaveExpense = async (data: any) => {
    if (expenseToEdit) {
      await api.updateExpense(expenseToEdit.id, data);
    } else {
      await api.createExpense(data);
    }
    await loadData();
  };

  // Assigned vehicle resolution
  const assignedVehicle = useMemo(() => {
    if (profile?.assignedVehicle) {
      return {
        vehicleNumber: profile.assignedVehicle.vehicleNumber,
        model: profile.assignedVehicle.model || 'Dzire',
      };
    }
    if (vehicles.length > 0) {
      return {
        vehicleNumber: vehicles[0].vehicleNumber,
        model: vehicles[0].model || 'Dzire',
      };
    }
    return {
      vehicleNumber: 'MH 12 AB 1234',
      model: 'Dzire',
    };
  }, [profile, vehicles]);

  const driverName = profile?.name || user?.name || 'Rahul Patil';

  // Current Month statistics
  const monthStats = useMemo(() => {
    const now = new Date();
    const currM = now.getMonth();
    const currY = now.getFullYear();

    const monthTrips = allTrips.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currM && d.getFullYear() === currY;
    });

    const totalTrips = monthTrips.length;
    const distanceCovered = monthTrips.reduce((acc, t) => acc + (Number(t.km) || 0), 0);

    // Estimate duty hours reasonably: average ~4.5h per trip day or distance/22 km/h
    const estimatedHours =
      totalTrips > 0
        ? Math.max(Math.round(distanceCovered / 20) + totalTrips * 2, Math.round(totalTrips * 4.2))
        : 0;

    return {
      totalTrips,
      distanceCovered,
      dutyHours: estimatedHours,
      monthName: language === 'hi' ? MONTH_NAMES_HI[currM] : MONTH_NAMES_EN[currM],
      year: currY,
    };
  }, [allTrips, language]);

  // Combined Recent Activity Feed (trips and expenses)
  const feedItems = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];

    allTrips.forEach((t) => {
      const rawDate = t.date ? new Date(t.date) : new Date();
      list.push({ type: 'trip', date: t.date || '', rawDate, data: t });
    });

    allExpenses.forEach((e) => {
      const rawDate = e.date ? new Date(e.date) : new Date();
      list.push({ type: 'expense', date: e.date || '', rawDate, data: e });
    });

    // Sort newest first
    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return list;
  }, [allTrips, allExpenses]);

  const displayedFeed = showAllFeed ? feedItems : feedItems.slice(0, 5);

  // Date formatting for feed items
  const formatFeedDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return timeStr || t.today;
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const time = timeStr ? timeStr : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `${t.today}, ${time}`;
    if (isYesterday) return `${t.yesterday}, ${time}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <View style={styles.topAppBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Truck size={22} color={theme.colors.primaryContainer} />
          </View>
          <View>
            <Text style={styles.headerSubtitle}>{t.appSubtitle}</Text>
            <Text style={styles.headerTitle}>{t.appTitle}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Language Switcher Toggle (EN | HI) */}
          <View style={styles.langPillContainer}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                EN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === 'hi' && styles.langBtnActive]}
              onPress={() => setLanguage('hi')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langBtnText, language === 'hi' && styles.langBtnTextActive]}>
                HI
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Avatar Button */}
          <TouchableOpacity
            style={styles.profileAvatarBtn}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.8}
          >
            <User size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primaryContainer}
          />
        }
      >
        {/* ── 1. Driver & Vehicle Quick Banner ─────────────────────────────── */}
        <View style={styles.driverBannerCard}>
          <View style={styles.driverBannerLeft}>
            <View style={styles.carIconBox}>
              <Car size={22} color={theme.colors.primaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.regNumberRow}>
                <Text style={styles.vehicleRegText}>{assignedVehicle.vehicleNumber}</Text>
                <Text style={styles.vehicleModelText}>({assignedVehicle.model})</Text>
              </View>
              <Text style={styles.driverNameText}>{driverName}</Text>
            </View>
          </View>

          {/* Duty Status Badge */}
          <View style={styles.dutyBadge}>
            <View style={styles.dutyDot} />
            <Text style={styles.dutyBadgeText}>{t.dutyOn}</Text>
          </View>
        </View>

        {/* ── 2. Month Summary Card ────────────────────────────────────────── */}
        <View style={styles.monthSummaryCard}>
          {/* Card Header */}
          <View style={styles.monthHeaderRow}>
            <View style={styles.monthHeaderLeft}>
              <Calendar size={18} color={theme.colors.primaryContainer} />
              <Text style={styles.monthHeaderTitle}>{t.thisMonth}</Text>
            </View>
            <View style={styles.monthPillBadge}>
              <Text style={styles.monthPillBadgeText}>
                {monthStats.monthName} {monthStats.year}
              </Text>
            </View>
          </View>

          {/* Prominent Total Trips Blue Card */}
          <View style={styles.totalTripsBox}>
            <View>
              <Text style={styles.totalTripsLabel}>{t.totalTrips}</Text>
              <Text style={styles.totalTripsValue}>
                {monthStats.totalTrips} {t.tripsUnit}
              </Text>
            </View>
            <View style={styles.totalTripsIconCircle}>
              <Route size={26} color="#ffffff" />
            </View>
          </View>

          {/* 2 Big Clear Summary Tiles */}
          <View style={styles.tilesGrid}>
            {/* Tile 1: Distance Covered */}
            <View style={styles.summaryTile}>
              <Text style={styles.tileLabel}>{t.distanceCovered}</Text>
              <View style={styles.tileValueRow}>
                <Text style={styles.tileNumber}>
                  {monthStats.distanceCovered.toLocaleString()}
                </Text>
                <Text style={styles.tileUnit}>{t.kmUnit}</Text>
              </View>
            </View>

            {/* Tile 2: Duty Hours */}
            <View style={styles.summaryTile}>
              <Text style={styles.tileLabel}>{t.dutyHours}</Text>
              <View style={styles.tileValueRow}>
                <Text style={styles.tileNumber}>
                  {monthStats.dutyHours.toLocaleString()}
                </Text>
                <Text style={styles.tileUnit}>{t.hrsUnit}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. Salary Slip Banner Card ───────────────────────────────────── */}
        <View style={styles.salarySlipCard}>
          <View style={styles.salarySlipLeft}>
            <View style={styles.salarySlipIconBox}>
              <Receipt size={22} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.salarySlipTitleRow}>
                <Text style={styles.salarySlipTitle}>{t.monthlySalarySlip}</Text>
                {latestSalary && (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>{t.newBadge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.salarySlipSubRow}>
                <Text style={styles.salarySlipAmount}>
                  {latestSalary
                    ? `₹${calculateNetPayable(latestSalary).toLocaleString('en-IN')}`
                    : profile?.salary
                    ? `₹${profile.salary.toLocaleString('en-IN')}`
                    : '--'}
                </Text>
                <Text style={styles.salarySlipDot}>•</Text>
                <Text style={styles.salarySlipStatus} numberOfLines={1}>
                  {latestSalary
                    ? `${monthStats.monthName} ${monthStats.year} • ${
                        latestSalary.paymentStatus === 'PAID'
                          ? language === 'hi'
                            ? 'भुगतान संपन्न'
                            : 'Paid'
                          : language === 'hi'
                          ? 'लंबित'
                          : 'Pending'
                      }`
                    : language === 'hi'
                    ? 'वेतन पर्ची अभी नहीं बनी है'
                    : 'Awaiting admin generation'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewSlipBtn}
            activeOpacity={0.85}
            onPress={() => {
              setIsSalarySlipModalOpen(true);
            }}
          >
            <Text style={styles.viewSlipBtnText}>{t.viewSlip}</Text>
            <ArrowRight size={14} color={theme.colors.primaryContainer} />
          </TouchableOpacity>
        </View>

        {/* ── 4. Recent Trips & Expenses (Combined Feed) ───────────────────── */}
        <View style={styles.recentSection}>
          <View style={styles.recentSectionHeader}>
            <View style={styles.recentHeaderLeft}>
              <Clock size={18} color={theme.colors.primaryContainer} />
              <Text style={styles.recentSectionTitle}>{t.recentTripsExpenses}</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => {
                const latestTrip = allTrips && allTrips.length > 0 ? allTrips[0] : null;
                setTripToEdit(latestTrip);
                setIsTripModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>{t.seeAll}</Text>
              <ChevronRight size={14} color={theme.colors.primaryContainer} />
            </TouchableOpacity>
          </View>

          <View style={styles.feedCard}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryContainer} style={{ padding: 24 }} />
            ) : displayedFeed.length === 0 ? (
              <View style={styles.emptyFeedBox}>
                <Text style={styles.emptyFeedText}>{t.noActivity}</Text>
              </View>
            ) : (
              displayedFeed.map((item, idx) => {
                const isTrip = item.type === 'trip';
                const tripData = isTrip ? (item.data as Trip) : null;
                const expenseData = !isTrip ? (item.data as Expense) : null;

                const info = tripData ? getTripDisplayInfo(tripData) : null;
                const isLast = idx === displayedFeed.length - 1;

                // Categories styling for expense
                const isFuel =
                  expenseData?.category === 'CNG' ||
                  expenseData?.category === 'PETROL' ||
                  expenseData?.category === 'DIESEL';
                const isToll = expenseData?.category === 'TOLL';

                return (
                  <React.Fragment key={`${item.type}-${(item.data as any).id || idx}`}>
                    <TouchableOpacity
                      style={styles.feedRow}
                      activeOpacity={0.75}
                      onPress={() => {
                        if (isTrip) {
                          setTripToEdit(tripData);
                          setIsTripModalOpen(true);
                        } else {
                          setExpenseToEdit(expenseData);
                          setIsExpenseModalOpen(true);
                        }
                      }}
                    >
                      {/* Left Icon Badge */}
                      <View
                        style={[
                          styles.feedIconBox,
                          isTrip
                            ? { backgroundColor: 'rgba(16, 185, 129, 0.12)' }
                            : isFuel
                              ? { backgroundColor: 'rgba(249, 115, 22, 0.14)' }
                              : { backgroundColor: theme.colors.surfaceLow },
                        ]}
                      >
                        {isTrip ? (
                          <Car size={20} color="#059669" />
                        ) : isFuel ? (
                          <Fuel size={20} color="#ea580c" />
                        ) : isToll ? (
                          <Receipt size={20} color={theme.colors.secondary} />
                        ) : (
                          <IndianRupee size={20} color={theme.colors.onSurfaceVariant} />
                        )}
                      </View>

                      {/* Main Details */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.feedTitle} numberOfLines={1}>
                          {isTrip
                            ? info?.route || tripData?.companyName || 'Corporate Trip'
                            : expenseData?.notes
                              ? expenseData.notes
                              : expenseData?.category === 'DRIVER_EXPENSE'
                                ? 'Driver Expense'
                                : expenseData?.category || 'Expense'}
                        </Text>
                        <Text style={styles.feedSubText}>
                          {formatFeedDate(
                            isTrip ? tripData?.date : expenseData?.date,
                            isTrip ? tripData?.time : undefined
                          )}
                        </Text>
                      </View>

                      {/* Right Metrics */}
                      <View style={styles.feedRightCol}>
                        {isTrip ? (
                          <>
                            <Text style={styles.feedKmHighlight}>
                              {tripData?.km || 0} km
                            </Text>
                            <Text style={styles.feedStatusSub}>{t.completed}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.feedExpenseHighlight}>
                              -₹{Number(expenseData?.amount || 0).toFixed(0)}
                            </Text>
                            <Text
                              style={[
                                styles.feedStatusSub,
                                isFuel
                                  ? { color: '#ea580c' }
                                  : isToll
                                    ? { color: '#059669' }
                                    : { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {isFuel ? t.fuelFilled : isToll ? t.autoDebited : t.expense}
                            </Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>

                    {!isLast && <View style={styles.feedDivider} />}
                  </React.Fragment>
                );
              })
            )}
          </View>
        </View>

        {/* Extra bottom padding so FAB doesn't obscure content */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── 5. Speed-Dial Floating Action Button (+ with 2 options) ────────── */}
      {/* Background Dim Backdrop */}
      {isFabMenuOpen && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setIsFabMenuOpen(false)}
        />
      )}

      {/* Floating Speed-Dial Menu Options (Stacked above FAB) */}
      {isFabMenuOpen && (
        <View style={styles.fabMenuContainer}>
          {/* Option 1: Log Trip */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            activeOpacity={0.85}
            onPress={() => {
              setIsFabMenuOpen(false);
              setTripToEdit(null);
              setIsTripModalOpen(true);
            }}
          >
            <View style={styles.fabMenuTextWrap}>
              <Text style={styles.fabMenuTitle}>{t.logNewTrip}</Text>
              {/* <Text style={styles.fabMenuSub}>{t.logNewTripSub}</Text> */}
            </View>
            <View style={[styles.fabMenuIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <Navigation size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Option 2: Log Expense */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            activeOpacity={0.85}
            onPress={() => {
              setIsFabMenuOpen(false);
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
          >
            <View style={styles.fabMenuTextWrap}>
              <Text style={styles.fabMenuTitle}>{t.logExpense}</Text>
              {/* <Text style={styles.fabMenuSub}>{t.logExpenseSub}</Text> */}
            </View>
            <View style={[styles.fabMenuIconWrap, { backgroundColor: '#ea580c' }]}>
              <Fuel size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Floating Action Button */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.fabButton, isFabMenuOpen && styles.fabButtonActive]}
          activeOpacity={0.85}
          onPress={() => setIsFabMenuOpen((prev) => !prev)}
        >
          {isFabMenuOpen ? (
            <>
              <X size={20} color="#ffffff" />
              <Text style={styles.fabButtonText}>{t.close}</Text>
            </>
          ) : (
            <>
              <Plus size={22} color="#ffffff" />
              <Text style={styles.fabButtonText}>{t.logEntry}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <DriverLogTripModal
        visible={isTripModalOpen}
        onClose={() => {
          setIsTripModalOpen(false);
          setTripToEdit(null);
        }}
        onSubmit={handleSaveTrip}
        tripToEdit={tripToEdit}
        vehicles={vehicles}
        companies={companies}
        driverName={driverName}
        driverHub="Pune Hub"
      />

      <AddEditExpenseModal
        visible={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        vehicles={vehicles}
        isOwner={false}
      />

      <SalarySlipModal
        visible={isSalarySlipModalOpen}
        onClose={() => setIsSalarySlipModalOpen(false)}
        salary={latestSalary}
        driver={profile || { name: driverName, mobile: (user as any)?.mobile || '+91 98220 12345' }}
        salaries={salaries}
        trips={allTrips}
        initialLanguage={language}
      />

      <ProfileModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenSalarySlip={() => setIsSalarySlipModalOpen(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fe',
  },

  // ── Top Header ────────────────────────────────────────────────────────────
  topAppBar: {
    height: 68,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    ...theme.shadows.level1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 83, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737686',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191b23',
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#ededf9',
    borderRadius: 999,
    padding: 2,
    alignItems: 'center',
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  langBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737686',
  },
  langBtnTextActive: {
    color: '#ffffff',
  },
  profileAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // ── 1. Driver & Vehicle Banner ────────────────────────────────────────────
  driverBannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.level1,
  },
  driverBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  carIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 83, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleRegText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  vehicleModelText: {
    fontSize: 13,
    color: '#737686',
    fontWeight: '500',
  },
  driverNameText: {
    fontSize: 13,
    color: '#737686',
    marginTop: 1,
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  dutyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  dutyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // ── 2. Month Summary Card ─────────────────────────────────────────────────
  monthSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    ...theme.shadows.level1,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191b23',
  },
  monthPillBadge: {
    backgroundColor: '#ededf9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  monthPillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#434655',
  },

  // Total trips box
  totalTripsBox: {
    backgroundColor: 'rgba(0, 83, 219, 0.08)',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalTripsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },
  totalTripsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primaryContainer,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  totalTripsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.level1,
  },

  // 2 Grid tiles
  tilesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: '#ededf9',
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#434655',
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  tileNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#191b23',
  },
  tileUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737686',
  },

  // ── 3. Salary Slip Card ───────────────────────────────────────────────────
  salarySlipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...theme.shadows.level1,
  },
  salarySlipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  salarySlipIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salarySlipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salarySlipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  newPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  newPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  salarySlipSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  salarySlipAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191b23',
  },
  salarySlipDot: {
    fontSize: 10,
    color: '#737686',
  },
  salarySlipStatus: {
    fontSize: 11,
    color: '#737686',
    flex: 1,
  },
  viewSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 83, 219, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  viewSlipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },

  // ── 4. Recent Trips & Expenses Section ────────────────────────────────────
  recentSection: {
    gap: 10,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  recentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191b23',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },

  // Feed Card
  feedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    ...theme.shadows.level1,
  },
  emptyFeedBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyFeedText: {
    fontSize: 13,
    color: '#737686',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  feedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  feedSubText: {
    fontSize: 12,
    color: '#737686',
    marginTop: 2,
  },
  feedRightCol: {
    alignItems: 'flex-end',
  },
  feedKmHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryContainer,
  },
  feedExpenseHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#191b23',
  },
  feedStatusSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#737686',
    marginTop: 2,
  },
  feedDivider: {
    height: 1,
    backgroundColor: '#ededf9',
    width: '100%',
  },

  // ── 5. Floating Action Button & Speed-Dial Menu ───────────────────────────
  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    zIndex: 90,
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    zIndex: 95,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...theme.shadows.level2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  fabMenuTextWrap: {
    alignItems: 'flex-end',
  },
  fabMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  fabMenuSub: {
    fontSize: 11,
    color: '#737686',
    marginTop: 1,
  },
  fabMenuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    zIndex: 100,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryContainer,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    ...theme.shadows.level2,
  },
  fabButtonActive: {
    backgroundColor: '#191b23',
  },
  fabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});
