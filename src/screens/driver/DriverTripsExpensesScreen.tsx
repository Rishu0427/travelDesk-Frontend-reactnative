import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import type { Trip, Expense, Vehicle, UserProfile } from '../../types';
import { DriverLogTripModal } from '../../components/DriverLogTripModal';
import { AddEditExpenseModal } from '../../components/AddEditExpenseModal';
import { ProfileModal } from '../../components/ProfileModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Calendar,
  Route,
  Car,
  Fuel,
  Wrench,
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Plus,
  CircleDot,
} from 'lucide-react-native';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
];

const WEEKDAY_NAMES_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const WEEKDAY_NAMES_HI = [
  'रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'
];

type FilterType = 'all' | 'trip' | 'expense';

interface FeedItem {
  id: string;
  type: 'trip' | 'expense';
  date: string;
  rawDate: Date;
  data: Trip | Expense;
}

interface GroupedFeed {
  dateStr: string;
  title: string;
  subtitle: string;
  summaryBadge: string;
  items: FeedItem[];
}

export const DriverTripsExpensesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [language, setLanguage] = useState<'en' | 'hi'>('hi');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Month navigation: 0 = current month, -1 = last month, etc.
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Filter & Search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modals
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tripsData, expensesData, vehiclesData, profileData] = await Promise.all([
        api.getTrips().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getVehicles().catch(() => []),
        api.getProfile().catch(() => null),
      ]);
      setAllTrips(tripsData);
      setAllExpenses(expensesData);
      setVehicles(vehiclesData);
      setProfile(profileData);
    } catch {
      // quiet fallback
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

  // Active Vehicle
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
        model: vehicles[0].model || 'Vehicle',
      };
    }
    return {
      vehicleNumber: 'MH 12 AB 1234',
      model: 'Swift Dzire',
    };
  }, [profile, vehicles]);

  // Selected Target Date & Month info
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const monthLabel = useMemo(() => {
    const name = language === 'hi' ? MONTH_NAMES_HI[selectedMonth] : MONTH_NAMES_EN[selectedMonth];
    return `${name} ${selectedYear}`;
  }, [selectedMonth, selectedYear, language]);

  // Filter by selected month
  const monthTrips = useMemo(() => {
    return allTrips.filter((item) => {
      const d = new Date(item.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allTrips, selectedMonth, selectedYear]);

  const monthExpenses = useMemo(() => {
    return allExpenses.filter((item) => {
      const d = new Date(item.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allExpenses, selectedMonth, selectedYear]);

  const totalDistance = useMemo(() => {
    return monthTrips.reduce((acc, t) => acc + (Number(t.km) || 0), 0);
  }, [monthTrips]);

  const totalTripsCount = monthTrips.length;
  const totalExpensesCount = monthExpenses.length;
  const totalRecordsCount = totalTripsCount + totalExpensesCount;

  // Build combined items for selected month
  const combinedItems: FeedItem[] = useMemo(() => {
    const list: FeedItem[] = [];

    monthTrips.forEach((trip) => {
      list.push({
        id: trip.id,
        type: 'trip',
        date: trip.date,
        rawDate: new Date(trip.date),
        data: trip,
      });
    });

    monthExpenses.forEach((exp) => {
      list.push({
        id: exp.id,
        type: 'expense',
        date: exp.date,
        rawDate: new Date(exp.date),
        data: exp,
      });
    });

    // Sort newest first
    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return list;
  }, [monthTrips, monthExpenses]);

  // Apply Filter Type & Search Query
  const filteredItems = useMemo(() => {
    let result = combinedItems;

    if (filterType === 'trip') {
      result = result.filter((item) => item.type === 'trip');
    } else if (filterType === 'expense') {
      result = result.filter((item) => item.type === 'expense');
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        if (item.type === 'trip') {
          const trip = item.data as Trip;
          return (
            (trip.companyName || '').toLowerCase().includes(q) ||
            (trip.notes || '').toLowerCase().includes(q) ||
            (trip.vehicle?.vehicleNumber || '').toLowerCase().includes(q)
          );
        } else {
          const exp = item.data as Expense;
          return (
            (exp.notes || '').toLowerCase().includes(q) ||
            (exp.category || '').toLowerCase().includes(q)
          );
        }
      });
    }

    return result;
  }, [combinedItems, filterType, searchQuery]);

  // Group by Date for Timeline
  const groupedFeed: GroupedFeed[] = useMemo(() => {
    const groupsMap = new Map<string, FeedItem[]>();

    filteredItems.forEach((item) => {
      const dateKey = item.date ? item.date.slice(0, 10) : 'unknown';
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(item);
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const result: GroupedFeed[] = [];

    groupsMap.forEach((items, dateStr) => {
      let title = dateStr;
      let subtitle = '';

      const d = new Date(dateStr);
      const isToday = dateStr === todayStr;
      const isYesterday = dateStr === yesterdayStr;

      const dayNum = d.getDate();
      const monthShort = language === 'hi' ? MONTH_NAMES_HI[d.getMonth()] : MONTH_NAMES_EN[d.getMonth()];
      const weekday = language === 'hi' ? WEEKDAY_NAMES_HI[d.getDay()] : WEEKDAY_NAMES_EN[d.getDay()];

      if (isToday) {
        title = language === 'hi' ? 'आज' : 'Today';
        subtitle = `${dayNum} ${monthShort}`;
      } else if (isYesterday) {
        title = language === 'hi' ? 'कल' : 'Yesterday';
        subtitle = `${dayNum} ${monthShort}`;
      } else {
        title = `${dayNum} ${monthShort}`;
        subtitle = weekday;
      }

      const tripsInGroup = items.filter((i) => i.type === 'trip');
      const kmInGroup = tripsInGroup.reduce(
        (acc, i) => acc + (Number((i.data as Trip).km) || 0),
        0
      );

      const summaryBadge =
        language === 'hi'
          ? `${tripsInGroup.length} ट्रिप • ${kmInGroup} km`
          : `${tripsInGroup.length} Trips • ${kmInGroup} km`;

      result.push({
        dateStr,
        title,
        subtitle,
        summaryBadge,
        items,
      });
    });

    return result;
  }, [filteredItems, language]);

  // Helper parser for trip route/passenger
  const parseTripNotes = (trip: Trip) => {
    let route = trip.companyName || 'Corporate Trip';
    let passenger = trip.notes || '';
    let pickup = '';
    let drop = '';

    if (trip.notes) {
      const match = trip.notes.match(/^(.*?)\s*(?:->|to|—|→)\s*(.*?)(?:;\s*(.*))?$/i);
      if (match) {
        pickup = match[1]?.trim();
        drop = match[2]?.trim();
        passenger = match[3]?.trim() || '';
      }
    }

    return { route, pickup, drop, passenger };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8ff" />

      {/* ── 1. Top Bar / App Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'hi' ? 'ट्रिप्स और खर्चे' : 'Trips & Expenses'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Language Switcher Pill */}
          <View style={styles.langSwitchContainer}>
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

          {/* Profile Icon */}
          <TouchableOpacity
            style={styles.profileAvatarBtn}
            activeOpacity={0.85}
            onPress={() => setIsProfileModalOpen(true)}
          >
            <User size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* ── 2. Driver Status & Vehicle Strip ─────────────────────────────── */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {language === 'hi' ? 'चालक ड्यूटी चालू' : 'Driver Shift Active'} • {assignedVehicle.vehicleNumber}
          </Text>
        </View>

        {/* ── 3. Month Selector Card ───────────────────────────────────────── */}
        <View style={styles.monthCard}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => setMonthOffset((prev) => prev - 1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={theme.colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.monthCenterInfo}>
            <View style={styles.monthTitleRow}>
              <Calendar size={18} color={theme.colors.primary} />
              <Text style={styles.monthTitleText}>{monthLabel}</Text>
            </View>
            <Text style={styles.monthSubText}>
              {language === 'hi'
                ? `कुल ${totalRecordsCount} रिकॉर्ड दर्ज`
                : `${totalRecordsCount} Total Records Logged`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, monthOffset >= 0 && styles.monthNavBtnDisabled]}
            onPress={() => {
              if (monthOffset < 0) {
                setMonthOffset((prev) => prev + 1);
              }
            }}
            disabled={monthOffset >= 0}
            activeOpacity={0.7}
          >
            <ChevronRight
              size={20}
              color={monthOffset >= 0 ? theme.colors.outlineVariant : theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>

        {/* ── 4. Operational Summary Banner ─────────────────────────────────── */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryLeftCol}>
            <View style={styles.summaryIconWrap}>
              <Route size={18} color="#ffffff" />
            </View>
            <View style={styles.summaryTextGroup}>
              <Text style={styles.summaryTitle}>
                {language === 'hi' ? 'मासिक परिचालन सारांश' : 'Operational Summary'}
              </Text>
              <Text style={styles.summarySub}>
                {language === 'hi'
                  ? `${monthLabel} में दर्ज`
                  : `Driven in ${monthLabel}`}
              </Text>
            </View>
          </View>

          <View style={styles.summaryMetricsRight}>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillLabel}>
                {language === 'hi' ? 'कुल दूरी' : 'Distance'}
              </Text>
              <Text style={styles.metricPillDistanceVal}>
                {totalDistance.toLocaleString()} km
              </Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillLabel}>
                {language === 'hi' ? 'कुल ट्रिप' : 'Trips'}
              </Text>
              <Text style={styles.metricPillTripsVal}>{totalTripsCount}</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Section Heading ────────────────────────────────────────────── */}
        <View style={styles.feedHeadingRow}>
          <Text style={styles.feedHeadingTitle}>
            {filterType === 'trip'
              ? language === 'hi'
                ? `ट्रिप (${totalTripsCount})`
                : `Trips (${totalTripsCount})`
              : filterType === 'expense'
              ? language === 'hi'
                ? `खर्च (${totalExpensesCount})`
                : `Expenses (${totalExpensesCount})`
              : language === 'hi'
              ? `सभी गतिविधियाँ (${totalRecordsCount})`
              : `All Activities (${totalRecordsCount})`}
          </Text>
        </View>

        {/* ── 6. Filter Chips ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipScroll}
          contentContainerStyle={styles.filterChipContainer}
        >
          {/* All */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'all' ? styles.filterChipActive : styles.filterChipInactive,
            ]}
            onPress={() => setFilterType('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'all'
                  ? styles.filterChipTextActive
                  : styles.filterChipTextInactive,
              ]}
            >
              {language === 'hi' ? `सब (${totalRecordsCount})` : `All (${totalRecordsCount})`}
            </Text>
          </TouchableOpacity>

          {/* Trips Only */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'trip' ? styles.filterChipActive : styles.filterChipInactive,
            ]}
            onPress={() => setFilterType('trip')}
            activeOpacity={0.8}
          >
            <Car
              size={16}
              color={filterType === 'trip' ? '#ffffff' : theme.colors.secondary}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'trip'
                  ? styles.filterChipTextActive
                  : styles.filterChipTextInactive,
              ]}
            >
              {language === 'hi'
                ? `सिर्फ ट्रिप (${totalTripsCount})`
                : `Trips Only (${totalTripsCount})`}
            </Text>
          </TouchableOpacity>

          {/* Fuel / Expenses */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'expense' ? styles.filterChipActive : styles.filterChipInactive,
            ]}
            onPress={() => setFilterType('expense')}
            activeOpacity={0.8}
          >
            <Fuel
              size={16}
              color={filterType === 'expense' ? '#ffffff' : theme.colors.error}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'expense'
                  ? styles.filterChipTextActive
                  : styles.filterChipTextInactive,
              ]}
            >
              {language === 'hi'
                ? `सीएनजी / ईंधन (${totalExpensesCount})`
                : `Fuel / Expenses (${totalExpensesCount})`}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── 7. Quick Search Box ──────────────────────────────────────────── */}
        <View style={styles.searchBox}>
          <Search size={18} color={theme.colors.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              language === 'hi'
                ? 'रूट, यात्री या पेट्रोल पंप खोजें...'
                : 'Search route, passenger, petrol pump...'
            }
            placeholderTextColor={theme.colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClearBtn}
              activeOpacity={0.7}
            >
              <X size={16} color={theme.colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── 8. Grouped Activity Feed ─────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {language === 'hi' ? 'डेटा लोड हो रहा है...' : 'Loading records...'}
            </Text>
          </View>
        ) : groupedFeed.length === 0 ? (
          <View style={styles.emptyFeedBox}>
            <View style={styles.emptyIconCircle}>
              <FileText size={32} color={theme.colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>
              {language === 'hi' ? 'कोई रिकॉर्ड नहीं मिला' : 'No records found'}
            </Text>
            <Text style={styles.emptySub}>
              {language === 'hi'
                ? 'कृपया खोज शब्द बदलें या फिल्टर रीसेट करें।'
                : 'Try changing your search terms or filter selections.'}
            </Text>
            {(searchQuery.length > 0 || filterType !== 'all') && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setFilterType('all');
                  setSearchQuery('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.resetBtnText}>
                  {language === 'hi' ? 'सभी फिल्टर रीसेट करें' : 'Reset All Filters'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.feedGroupsContainer}>
            {groupedFeed.map((group) => (
              <View key={group.dateStr} style={styles.groupCard}>
                {/* Date Header */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Text style={styles.groupHeaderTitle}>{group.title}</Text>
                    <Text style={styles.groupHeaderSub}>{group.subtitle}</Text>
                  </View>
                  <View style={styles.groupHeaderBadge}>
                    <Text style={styles.groupHeaderBadgeText}>
                      {group.summaryBadge}
                    </Text>
                  </View>
                </View>

                {/* Items in this date group */}
                <View style={styles.groupItemsList}>
                  {group.items.map((item) => {
                    if (item.type === 'trip') {
                      const trip = item.data as Trip;
                      const { route, pickup, drop, passenger } = parseTripNotes(trip);

                      return (
                        <TouchableOpacity
                          key={`trip-${trip.id}`}
                          style={styles.itemCard}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTripToEdit(trip);
                            setIsTripModalOpen(true);
                          }}
                        >
                          <View style={styles.itemTopRow}>
                            <View style={styles.itemLeftCol}>
                              <View style={[styles.itemIconCircle, styles.tripIconBg]}>
                                <Car size={20} color={theme.colors.secondary} />
                              </View>
                              <View style={styles.itemMainDetails}>
                                {pickup && drop ? (
                                  <View style={styles.routeRow}>
                                    <Text style={styles.routeStationText} numberOfLines={1}>
                                      {pickup}
                                    </Text>
                                    <ArrowRight size={14} color={theme.colors.onSurfaceVariant} />
                                    <Text style={styles.routeStationText} numberOfLines={1}>
                                      {drop}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={styles.itemTitle} numberOfLines={1}>
                                    {route}
                                  </Text>
                                )}
                                <Text style={styles.itemSub} numberOfLines={1}>
                                  {passenger
                                    ? `${language === 'hi' ? 'सवारी: ' : 'Passenger: '}${passenger}`
                                    : trip.companyName}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.itemRightMetrics}>
                              <Text style={styles.itemHighlightMetric}>
                                {trip.km || 0} km
                              </Text>
                              <View style={styles.itemStatusPill}>
                                <Text style={styles.itemStatusPillText}>
                                  {language === 'hi' ? 'सवारी पूर्ण' : 'Trip Completed'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Item Footer info bar */}
                          <View style={styles.itemFooterBar}>
                            <View style={styles.itemFooterLeft}>
                              <View style={styles.itemFooterMetaItem}>
                                <Clock size={13} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.itemFooterMetaText}>
                                  {trip.time || '10:00 AM'}
                                </Text>
                              </View>
                              <View style={styles.itemFooterMetaItem}>
                                <Route size={13} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.itemFooterMetaText}>
                                  {trip.km || 0} km
                                </Text>
                              </View>
                            </View>
                            <View style={styles.itemFooterAction}>
                              <Text style={styles.itemFooterActionText}>
                                {language === 'hi' ? 'विवरण देखें' : 'View receipt'}
                              </Text>
                              <ChevronRight size={14} color={theme.colors.primary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    } else {
                      // Expense Item
                      const exp = item.data as Expense;
                      const isFuel =
                        exp.category === 'CNG' ||
                        exp.category === 'PETROL' ||
                        exp.category === 'DIESEL';
                      const isMaintenance = exp.category === 'MAINTENANCE';
                      const isToll = exp.category === 'TOLL';

                      return (
                        <TouchableOpacity
                          key={`exp-${exp.id}`}
                          style={styles.itemCard}
                          activeOpacity={0.85}
                          onPress={() => {
                            setExpenseToEdit(exp);
                            setIsExpenseModalOpen(true);
                          }}
                        >
                          <View style={styles.itemTopRow}>
                            <View style={styles.itemLeftCol}>
                              <View
                                style={[
                                  styles.itemIconCircle,
                                  isMaintenance
                                    ? styles.maintenanceIconBg
                                    : styles.expenseIconBg,
                                ]}
                              >
                                {isMaintenance ? (
                                  <Wrench size={20} color={theme.colors.error} />
                                ) : isToll ? (
                                  <Receipt size={20} color={theme.colors.tertiary} />
                                ) : (
                                  <Fuel size={20} color={theme.colors.error} />
                                )}
                              </View>
                              <View style={styles.itemMainDetails}>
                                <Text style={styles.itemTitle} numberOfLines={1}>
                                  {exp.notes
                                    ? exp.notes
                                    : exp.category === 'CNG'
                                    ? language === 'hi'
                                      ? 'सीएनजी स्टेशन ईंधन'
                                      : 'CNG Station Fuel'
                                    : exp.category}
                                </Text>
                                <Text style={styles.itemSub} numberOfLines={1}>
                                  {isFuel
                                    ? language === 'hi'
                                      ? `सीएनजी ईंधन खर्च • ${assignedVehicle.vehicleNumber}`
                                      : `Fuel Expense • ${assignedVehicle.vehicleNumber}`
                                    : isMaintenance
                                    ? language === 'hi'
                                      ? 'वाहन सर्विस व मरम्मत'
                                      : 'Vehicle Service & Maintenance'
                                    : `${exp.category} • ${assignedVehicle.vehicleNumber}`}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.itemRightMetrics}>
                              <Text style={styles.itemExpenseAmount}>
                                -₹{Number(exp.amount || 0).toLocaleString()}
                              </Text>
                              <View
                                style={[
                                  styles.itemStatusPill,
                                  isToll
                                    ? styles.tollPill
                                    : isMaintenance
                                    ? styles.maintenancePill
                                    : styles.cngPill,
                                ]}
                              >
                                {isToll ? (
                                  <>
                                    <CheckCircle2 size={11} color={theme.colors.secondary} />
                                    <Text style={styles.itemStatusPillText}>
                                      {language === 'hi' ? 'फास्टैग स्वतः' : 'FASTag Auto'}
                                    </Text>
                                  </>
                                ) : isMaintenance ? (
                                  <Text style={styles.itemStatusPillText}>
                                    {language === 'hi' ? 'मरम्मत पूर्ण' : 'Serviced'}
                                  </Text>
                                ) : (
                                  <Text style={styles.cngPillText}>
                                    {language === 'hi' ? 'सीएनजी पर्ची' : 'CNG Bill'}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>

                          {/* Footer Info Bar */}
                          <View style={styles.itemFooterBar}>
                            <View style={styles.itemFooterLeft}>
                              <View style={styles.itemFooterMetaItem}>
                                <Clock size={13} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.itemFooterMetaText}>
                                  {exp.date ? exp.date.slice(11, 16) || '08:15 AM' : '08:15 AM'}
                                </Text>
                              </View>
                              <View style={styles.itemFooterMetaItem}>
                                {isMaintenance ? (
                                  <Wrench size={13} color={theme.colors.onSurfaceVariant} />
                                ) : (
                                  <Fuel size={13} color={theme.colors.onSurfaceVariant} />
                                )}
                                <Text style={styles.itemFooterMetaText}>
                                  {isFuel
                                    ? language === 'hi'
                                      ? 'सीएनजी ईंधन'
                                      : 'CNG Fuel'
                                    : isMaintenance
                                    ? language === 'hi'
                                      ? 'मरम्मत'
                                      : 'Maintenance'
                                    : exp.category}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.itemFooterAction}>
                              <Text style={styles.itemFooterActionText}>
                                {language === 'hi' ? 'बिल फोटो' : 'CNG receipt'}
                              </Text>
                              <Receipt size={14} color={theme.colors.primary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── 9. Modals for Editing/Adding ────────────────────────────────────── */}
      <DriverLogTripModal
        visible={isTripModalOpen}
        onClose={() => {
          setIsTripModalOpen(false);
          setTripToEdit(null);
        }}
        onSubmit={handleSaveTrip}
        tripToEdit={tripToEdit}
      />

      <AddEditExpenseModal
        visible={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSubmit={handleSaveExpense}
        expenseToEdit={expenseToEdit}
      />

      <ProfileModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  header: {
    height: Platform.OS === 'ios' ? 96 : 64,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3fe',
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
  langSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#ededf9',
    borderRadius: 20,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  langBtnActive: {
    backgroundColor: '#004ac6',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#434655',
  },
  langBtnTextActive: {
    color: '#ffffff',
  },
  profileAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#004ac6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006c49',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#434655',
  },
  monthCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f3fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#faf8ff',
  },
  monthCenterInfo: {
    alignItems: 'center',
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  monthSubText: {
    fontSize: 11,
    color: '#434655',
    marginTop: 2,
  },
  summaryBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#ededf9',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004ac6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextGroup: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191b23',
  },
  summarySub: {
    fontSize: 11,
    color: '#434655',
    marginTop: 1,
  },
  summaryMetricsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricPill: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 54,
  },
  metricPillLabel: {
    fontSize: 10,
    color: '#434655',
    fontWeight: '500',
  },
  metricPillDistanceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#004ac6',
    marginTop: 1,
  },
  metricPillTripsVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006c49',
    marginTop: 1,
  },
  feedHeadingRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  feedHeadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  filterChipScroll: {
    paddingHorizontal: 16,
  },
  filterChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#004ac6',
  },
  filterChipInactive: {
    backgroundColor: '#ffffff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterChipTextInactive: {
    color: '#191b23',
  },
  searchBox: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#191b23',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#434655',
  },
  emptyFeedBox: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ededf9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#434655',
    textAlign: 'center',
    maxWidth: 240,
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: '#004ac6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  feedGroupsContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 16,
  },
  groupCard: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  groupHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191b23',
  },
  groupHeaderSub: {
    fontSize: 12,
    color: '#434655',
  },
  groupHeaderBadge: {
    backgroundColor: '#ededf9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#434655',
  },
  groupItemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 10,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemLeftCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  itemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconBg: {
    backgroundColor: 'rgba(108, 248, 187, 0.25)',
  },
  expenseIconBg: {
    backgroundColor: 'rgba(255, 218, 214, 0.7)',
  },
  maintenanceIconBg: {
    backgroundColor: 'rgba(255, 218, 214, 0.7)',
  },
  itemMainDetails: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  routeStationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
    maxWidth: 100,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191b23',
  },
  itemSub: {
    fontSize: 11,
    color: '#434655',
    marginTop: 2,
  },
  itemRightMetrics: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemHighlightMetric: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004ac6',
  },
  itemExpenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  itemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ededf9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStatusPillText: {
    fontSize: 10,
    color: '#434655',
    fontWeight: '500',
  },
  cngPill: {
    backgroundColor: '#dbe1ff',
  },
  cngPillText: {
    fontSize: 10,
    color: '#00174b',
    fontWeight: '600',
  },
  tollPill: {
    backgroundColor: '#ededf9',
  },
  maintenancePill: {
    backgroundColor: '#ededf9',
  },
  itemFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(243, 243, 254, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  itemFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemFooterMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemFooterMetaText: {
    fontSize: 11,
    color: '#434655',
  },
  itemFooterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  itemFooterActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004ac6',
  },
});
