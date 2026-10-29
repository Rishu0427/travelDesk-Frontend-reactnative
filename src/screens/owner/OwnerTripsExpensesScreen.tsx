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
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import type { Trip, Expense, Vehicle, Driver, Company } from '../../types';
import { AddEditTripModal } from '../../components/AddEditTripModal';
import { AddEditExpenseModal } from '../../components/AddEditExpenseModal';
import { AddEditCompanyModal } from '../../components/AddEditCompanyModal';
import { confirmAction } from '../../utils/alert';
import {
  Navigation,
  Fuel,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Clock,
  Gauge,
  IndianRupee,
  Calendar,
  Layers,
  User,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Briefcase,
  X,
  Car,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type MainTab = 'trips_expenses' | 'companies';
type RecordFilter = 'all' | 'trips' | 'expenses';
type QuickFilter = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

interface CombinedRecord {
  type: 'trip' | 'expense';
  date: string;
  rawDate: Date;
  data: Trip | Expense;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const diffDays = (a: string, b: string) => {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.abs((msB - msA) / (1000 * 60 * 60 * 24));
};

const formatDateDisplay = (iso: string) => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
};

// ─── Component ────────────────────────────────────────────────────────────────
export const OwnerTripsExpensesScreen: React.FC<{ route?: any; navigation?: any }> = ({
  route,
  navigation,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('trips_expenses');
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(route?.params?.vehicleId || 'all');

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ── Date filter state ──────────────────────────────────────────────────────
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDateError, setCustomDateError] = useState('');

  // ── Modal state ────────────────────────────────────────────────────────────
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);

  // Handle vehicle route parameter changes if navigated from vehicle screen
  useEffect(() => {
    if (route?.params?.vehicleId) {
      setSelectedVehicleId(route.params.vehicleId);
      setActiveTab('trips_expenses');
    }
  }, [route?.params?.vehicleId]);

  // ── API query params derived from filters ──────────────────────────────────
  const getFilterParams = useCallback(() => {
    const params: any = {};

    if (selectedVehicleId && selectedVehicleId !== 'all') {
      params.vehicleId = selectedVehicleId;
    }

    if (quickFilter === 'custom') {
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;
      return params;
    }

    if (quickFilter !== 'all') {
      params.filterType = quickFilter;
    }

    return params;
  }, [quickFilter, customStart, customEnd, selectedVehicleId]);

  const loadData = useCallback(async () => {
    try {
      const filterParams = getFilterParams();
      const [tripsData, expensesData, vehiclesData, driversData, companiesData] = await Promise.all([
        api.getTrips(filterParams),
        api.getExpenses(filterParams),
        api.getVehicles(),
        api.getDrivers(),
        api.getCompanies(),
      ]);
      setTrips(tripsData);
      setExpenses(expensesData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setCompanies(companiesData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getFilterParams]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Combined + filtered list ───────────────────────────────────────────────
  const combinedRecords = useMemo<CombinedRecord[]>(() => {
    const list: CombinedRecord[] = [];

    if (recordFilter !== 'expenses') {
      trips.forEach((t) => {
        const rawDate = t.date ? new Date(t.date) : new Date();
        list.push({ type: 'trip', date: t.date || '', rawDate, data: t });
      });
    }

    if (recordFilter !== 'trips') {
      expenses.forEach((e) => {
        const rawDate = e.date ? new Date(e.date) : new Date();
        list.push({ type: 'expense', date: e.date || '', rawDate, data: e });
      });
    }

    // Sort descending by date (newest first)
    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return list;
  }, [trips, expenses, recordFilter]);

  // ── Financial & Operations Summary ────────────────────────────────────────
  const summary = useMemo(() => {
    const totalFare = trips.reduce((sum, t) => sum + (Number(t.tripAmount) || 0), 0);
    const totalKm = trips.reduce((sum, t) => sum + (Number(t.km) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netEarnings = totalFare - totalExpenses;
    return {
      tripsCount: trips.length,
      expensesCount: expenses.length,
      totalFare,
      totalKm,
      totalExpenses,
      netEarnings,
    };
  }, [trips, expenses]);

  // Selected vehicle object (if specific car chosen)
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId || selectedVehicleId === 'all') return null;
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [selectedVehicleId, vehicles]);

  // ── Quick filter handler ───────────────────────────────────────────────────
  const handleQuickFilter = (f: QuickFilter) => {
    if (f === 'custom') {
      setShowCustomPicker(true);
      setQuickFilter('custom');
    } else {
      setShowCustomPicker(false);
      setCustomDateError('');
      setQuickFilter(f);
    }
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      setCustomDateError('Please enter both start and end dates.');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      setCustomDateError('Start date cannot be after end date.');
      return;
    }
    // Max 1 month restriction (31 days)
    if (diffDays(customStart, customEnd) > 31) {
      setCustomDateError('Maximum date range allowed is 1 month (31 days).');
      return;
    }
    setCustomDateError('');
    setShowCustomPicker(false);
    setQuickFilter('custom');
    loadData();
  };

  const clearDateFilter = () => {
    setQuickFilter('all');
    setCustomStart('');
    setCustomEnd('');
    setCustomDateError('');
    setShowCustomPicker(false);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveTrip = async (data: any) => {
    if (tripToEdit) {
      await api.updateTrip(tripToEdit.id, data);
    } else {
      await api.createTrip(data);
    }
    await loadData();
  };

  const handleDeleteTrip = (id: string, name: string) => {
    confirmAction(
      'Delete Trip',
      `Are you sure you want to delete trip to ${name}?`,
      async () => {
        try {
          await api.deleteTrip(id);
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete trip.');
        }
      },
      'Delete'
    );
  };

  const handleSaveExpense = async (data: any) => {
    if (expenseToEdit) {
      await api.updateExpense(expenseToEdit.id, data);
    } else {
      await api.createExpense(data);
    }
    await loadData();
  };

  const handleDeleteExpense = (id: string, category: string, amount: number) => {
    confirmAction(
      'Delete Expense',
      `Are you sure you want to delete ${category} expense of ₹${amount}?`,
      async () => {
        try {
          await api.deleteExpense(id);
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete expense.');
        }
      },
      'Delete'
    );
  };

  const handleSaveCompany = async (data: Partial<Company>) => {
    if (companyToEdit) {
      await api.updateCompany(companyToEdit.id, data);
    } else {
      await api.createCompany(data);
    }
    await loadData();
  };

  const handleDeleteCompany = (id: string, name: string) => {
    confirmAction(
      'Delete Company',
      `Are you sure you want to remove "${name}"? Past trips associated with this company will be safely kept.`,
      async () => {
        try {
          await api.deleteCompany(id);
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete company.');
        }
      },
      'Delete'
    );
  };

  // ── Style & Badge helpers ──────────────────────────────────────────────────
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CNG':
        return { bg: theme.colors.cngBg, color: theme.colors.cng };
      case 'PETROL':
        return { bg: theme.colors.petrolBg, color: theme.colors.petrol };
      case 'TOLL':
      case 'PARKING':
        return { bg: theme.colors.tertiaryLight, color: theme.colors.tertiaryContainer };
      case 'MAINTENANCE':
        return { bg: theme.colors.errorLight, color: theme.colors.error };
      case 'DRIVER_EXPENSE':
        return { bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' };
      default:
        return { bg: theme.colors.otherBg, color: theme.colors.other };
    }
  };

  const getSubTitleText = () => {
    if (activeTab === 'trips_expenses') {
      const vehicleText = selectedVehicle ? selectedVehicle.vehicleNumber : 'All Fleet Cars';
      return `${vehicleText} • ${trips.length} Trips & ${expenses.length} Expenses`;
    }
    return `${companies.length} Corporate Clients`;
  };

  const getActionBtnLabel = () => {
    if (activeTab === 'trips_expenses') {
      if (recordFilter === 'expenses') return 'Log Expense';
      return 'Log Trip';
    }
    return 'Add Client';
  };

  const handleActionBtnPress = () => {
    if (activeTab === 'trips_expenses') {
      if (recordFilter === 'expenses') {
        setExpenseToEdit(null);
        setIsExpenseModalOpen(true);
      } else {
        setTripToEdit(null);
        setIsTripModalOpen(true);
      }
    } else {
      setCompanyToEdit(null);
      setIsCompanyModalOpen(true);
    }
  };

  const getQuickFilterLabel = (f: QuickFilter) => {
    switch (f) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this_week': return '1 Week';
      case 'this_month': return '1 Month';
      case 'custom': return customStart && customEnd
        ? `${formatDateDisplay(customStart)} – ${formatDateDisplay(customEnd)}`
        : 'Custom (Max 1 Mo)';
    }
  };

  // ── Helper to parse structured trip metadata from trip notes ─────────────
  const getTripDisplayInfo = (t: Trip) => {
    const metaMatch = t.notes?.match(/<!--META:(.*?)-->/);
    if (metaMatch && metaMatch[1]) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        return {
          route: parsed.pickupLocation && parsed.dropLocation ? `${parsed.pickupLocation} ➔ ${parsed.dropLocation}` : undefined,
          customer: parsed.customerName ? `${parsed.customerName}${parsed.customerPhone ? ` (${parsed.customerPhone})` : ''}` : undefined,
          category: parsed.tripCategory as string | undefined,
          paymentMode: parsed.paymentMode as string | undefined,
          cleanNotes: (t.notes || '').replace(/<!--META:.*?-->/, '').trim(),
        };
      } catch {
        // ignore
      }
    }
    return { cleanNotes: t.notes || '' };
  };

  // ── Render Trip Card ───────────────────────────────────────────────────────
  const renderTripCard = (item: Trip) => {
    const info = getTripDisplayInfo(item);
    return (
      <View style={styles.recordCard}>
        {/* Trip Header badge */}
        <View style={styles.typeBadgeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.primaryLight }]}>
              <Navigation size={12} color={theme.colors.primaryContainer} />
              <Text style={[styles.typeBadgeText, { color: theme.colors.primaryContainer }]}>TRIP</Text>
            </View>
            {info.category && (
              <View style={styles.categoryPillSmall}>
                <Text style={styles.categoryPillSmallText}>
                  {info.category.toUpperCase()}
                </Text>
              </View>
            )}
            {info.paymentMode && (
              <View style={[styles.categoryPillSmall, { backgroundColor: '#ededf9' }]}>
                <Text style={[styles.categoryPillSmallText, { color: '#434655' }]}>
                  {info.paymentMode.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.recordDateText}>
            📅 {item.date ? new Date(item.date).toLocaleDateString() : 'Date N/A'}
          </Text>
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Building2 size={18} color={theme.colors.primaryContainer} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.titleText}>{item.companyName}</Text>
            {info.customer ? (
              <Text style={styles.customerSubText}>👤 {info.customer}</Text>
            ) : null}
            <Text style={styles.subText}>{item.time || 'Standard shift'}</Text>
          </View>
          <View style={styles.kmBadge}>
            <Text style={styles.kmBadgeText}>{item.km} KM</Text>
          </View>
        </View>

        {info.route ? (
          <View style={styles.routeBox}>
            <Text style={styles.itemRouteText} numberOfLines={1}>
              📍 {info.route}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaBox}>
          {item.tripAmount ? (
            <View style={styles.metaRowItem}>
              <IndianRupee size={12} color={theme.colors.primaryContainer} />
              <Text style={[styles.metaItem, { fontWeight: '700', color: theme.colors.primaryContainer }]}>
                ₹{Number(item.tripAmount).toFixed(0)} Fare
              </Text>
            </View>
          ) : null}
          {item.vehicle && (
            <View style={styles.metaRowItem}>
              <Car size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaItem}>{item.vehicle.vehicleNumber}</Text>
            </View>
          )}
          {item.driver && (
            <View style={styles.metaRowItem}>
              <User size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaItem}>{item.driver.name}</Text>
            </View>
          )}
        </View>

        {info.cleanNotes ? (
          <Text style={styles.notesText} numberOfLines={2}>📝 {info.cleanNotes}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setTripToEdit(item); setIsTripModalOpen(true); }}
          >
            <Edit2 size={13} color={theme.colors.primaryContainer} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteTrip(item.id, item.companyName)}
          >
            <Trash2 size={13} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render Expense Card ────────────────────────────────────────────────────
  const renderExpenseCard = (item: Expense) => {
    const badgeStyle = getCategoryBadge(item.category);
    return (
      <View style={styles.recordCard}>
        {/* Expense Header badge */}
        <View style={styles.typeBadgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: badgeStyle.bg }]}>
            <Fuel size={12} color={badgeStyle.color} />
            <Text style={[styles.typeBadgeText, { color: badgeStyle.color }]}>EXPENSE</Text>
          </View>
          <Text style={styles.recordDateText}>
            📅 {item.date ? new Date(item.date).toLocaleDateString() : 'Today'}
          </Text>
        </View>

        <View style={styles.cardHeader}>
          <View style={[styles.avatarWrap, { backgroundColor: badgeStyle.bg }]}>
            <Fuel size={18} color={badgeStyle.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.titleText}>{item.category}</Text>
              {item.driverDeductible && (
                <View style={styles.deductibleBadge}>
                  <Text style={styles.deductibleBadgeText}>DRIVER DEDUCTIBLE</Text>
                </View>
              )}
            </View>
            <Text style={styles.subText}>Logged expense</Text>
          </View>
          <Text style={styles.expenseAmountHighlight}>-₹{Number(item.amount).toFixed(0)}</Text>
        </View>

        <View style={styles.metaBox}>
          {item.vehicle && (
            <View style={styles.metaRowItem}>
              <Car size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaItem}>{item.vehicle.vehicleNumber}</Text>
            </View>
          )}
          {item.driver && (
            <View style={styles.metaRowItem}>
              <User size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaItem}>{item.driver.name}</Text>
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>📝 {item.notes}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setExpenseToEdit(item); setIsExpenseModalOpen(true); }}
          >
            <Edit2 size={13} color={theme.colors.primaryContainer} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteExpense(item.id, item.category, item.amount)}
          >
            <Trash2 size={13} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCombinedRecord = ({ item }: { item: CombinedRecord }) => {
    if (item.type === 'trip') return renderTripCard(item.data as Trip);
    return renderExpenseCard(item.data as Expense);
  };

  // ── Render Company Card ────────────────────────────────────────────────────
  const renderCompanyCard = (item: Company) => {
    const isActive = item.status === 'ACTIVE';
    return (
      <View style={styles.recordCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarWrap, { backgroundColor: theme.colors.primaryLight }]}>
            <Building2 size={20} color={theme.colors.primaryContainer} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.titleText}>{item.name}</Text>
              <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
            {item.contactPerson ? (
              <Text style={styles.subText}>Contact: {item.contactPerson}</Text>
            ) : null}
          </View>

          {item.ratePerKm ? (
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeText}>₹{item.ratePerKm}/km</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.companyStatsRow}>
          <View style={styles.companyStatCol}>
            <TrendingUp size={14} color={theme.colors.primaryContainer} />
            <Text style={styles.companyStatLabel}>Trips Done:</Text>
            <Text style={styles.companyStatValue}>{item.totalTrips || 0}</Text>
          </View>
          <View style={styles.companyStatCol}>
            <IndianRupee size={14} color={theme.colors.tertiaryContainer} />
            <Text style={styles.companyStatLabel}>Total Revenue:</Text>
            <Text style={[styles.companyStatValue, { color: theme.colors.tertiaryContainer }]}>
              ₹{(item.totalRevenue || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {(item.phone || item.email || item.address || item.gstNumber) ? (
          <View style={styles.metaBox}>
            {item.phone ? (
              <View style={styles.contactItemRow}>
                <Phone size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.metaItem}>{item.phone}</Text>
              </View>
            ) : null}
            {item.email ? (
              <View style={styles.contactItemRow}>
                <Mail size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.metaItem}>{item.email}</Text>
              </View>
            ) : null}
            {item.address ? (
              <View style={styles.contactItemRow}>
                <MapPin size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.metaItem} numberOfLines={1}>{item.address}</Text>
              </View>
            ) : null}
            {item.gstNumber ? (
              <View style={styles.contactItemRow}>
                <Receipt size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.metaItem}>GST: {item.gstNumber}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>📝 {item.notes}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setCompanyToEdit(item); setIsCompanyModalOpen(true); }}
          >
            <Edit2 size={13} color={theme.colors.primaryContainer} />
            <Text style={styles.actionText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteCompany(item.id, item.name)}
          >
            <Trash2 size={13} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Top App Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topAppBar}>
        <View>
          <Text style={styles.appBarTitle}>Trips & Operations</Text>
          <Text style={styles.appBarSubtitle}>{getSubTitleText()}</Text>
        </View>

        <TouchableOpacity
          style={styles.addFab}
          onPress={handleActionBtnPress}
          activeOpacity={0.85}
        >
          <Plus size={18} color={theme.colors.onPrimary} />
          <Text style={styles.addFabText}>{getActionBtnLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Tab Switcher (Trips & Expenses | Companies) ─────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'trips_expenses' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('trips_expenses')}
        >
          <Layers
            size={15}
            color={activeTab === 'trips_expenses' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, activeTab === 'trips_expenses' && styles.segmentTextActive]}>
            Trips & Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'companies' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('companies')}
        >
          <Building2
            size={15}
            color={activeTab === 'companies' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, activeTab === 'companies' && styles.segmentTextActive]}>
            Clients ({companies.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Trips & Expenses sub-controls ───────────────────────────────────── */}
      {activeTab === 'trips_expenses' && (
        <View style={styles.controlsPanel}>
          {/* 1. Vehicle Selector Filter */}
          <View style={styles.vehicleFilterSection}>
            <View style={styles.sectionHeaderRow}>
              <Car size={14} color={theme.colors.primaryContainer} />
              <Text style={styles.sectionHeaderLabel}>Filter by Vehicle:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleScrollRow}
            >
              <TouchableOpacity
                style={[styles.vehiclePill, selectedVehicleId === 'all' && styles.vehiclePillActive]}
                onPress={() => setSelectedVehicleId('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.vehiclePillText, selectedVehicleId === 'all' && styles.vehiclePillTextActive]}>
                  🚗 All Cars ({vehicles.length})
                </Text>
              </TouchableOpacity>

              {vehicles.map((v) => {
                const isSelected = selectedVehicleId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehiclePill, isSelected && styles.vehiclePillActive]}
                    onPress={() => setSelectedVehicleId(v.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.vehiclePillText, isSelected && styles.vehiclePillTextActive]}>
                      {v.vehicleNumber} {v.model ? `(${v.model})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. Unified Radio Buttons: All / Trips / Expenses */}
          <View style={styles.radioContainer}>
            <Text style={styles.radioGroupLabel}>Show Items:</Text>
            <View style={styles.radioRow}>
              {(['all', 'trips', 'expenses'] as RecordFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.radioBtn, recordFilter === f && styles.radioBtnActive]}
                  onPress={() => setRecordFilter(f)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.radioCircle, recordFilter === f && styles.radioCircleActive]}>
                    {recordFilter === f && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioLabel, recordFilter === f && styles.radioLabelActive]}>
                    {f === 'all'
                      ? `All (${trips.length + expenses.length})`
                      : f === 'trips'
                      ? `Trips (${trips.length})`
                      : `Expenses (${expenses.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. Date Filter: Quick preset chips + Max 1 Month Custom Option */}
          <View style={styles.dateFilterSection}>
            <View style={styles.sectionHeaderRow}>
              <Calendar size={13} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.sectionHeaderLabel}>Date Filter (Max 1 Month):</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateChipRow}
            >
              {(['all', 'today', 'yesterday', 'this_week', 'this_month', 'custom'] as QuickFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.dateChip, quickFilter === f && styles.dateChipActive]}
                  onPress={() => handleQuickFilter(f)}
                  activeOpacity={0.8}
                >
                  {f === 'custom' && (
                    <Calendar size={12} color={quickFilter === f ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
                  )}
                  <Text style={[styles.dateChipText, quickFilter === f && styles.dateChipTextActive]}>
                    {getQuickFilterLabel(f)}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Reset filter button */}
              {(quickFilter !== 'all' || selectedVehicleId !== 'all') && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => {
                    clearDateFilter();
                    setSelectedVehicleId('all');
                  }}
                  activeOpacity={0.8}
                >
                  <X size={12} color={theme.colors.error} />
                  <Text style={styles.clearFilterText}>Reset</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* 4. Custom Date Range Selector (with max 1 month constraint) */}
          {showCustomPicker && (
            <View style={styles.customPickerCard}>
              <View style={styles.customPickerHeader}>
                <Text style={styles.customPickerTitle}>
                  Select Date Range (Max Duration: 1 Month)
                </Text>
                <TouchableOpacity onPress={() => setShowCustomPicker(false)}>
                  <X size={16} color={theme.colors.outline} />
                </TouchableOpacity>
              </View>

              <View style={styles.customPickerRow}>
                <View style={styles.customPickerField}>
                  <Text style={styles.customPickerLabel}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.customPickerInput}
                    placeholder="2026-10-01"
                    placeholderTextColor={theme.colors.outline}
                    value={customStart}
                    onChangeText={(t) => {
                      setCustomStart(t);
                      setCustomDateError('');
                    }}
                    maxLength={10}
                  />
                </View>

                <View style={styles.customPickerArrow}>
                  <ArrowRight size={16} color={theme.colors.outline} />
                </View>

                <View style={styles.customPickerField}>
                  <Text style={styles.customPickerLabel}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.customPickerInput}
                    placeholder="2026-10-29"
                    placeholderTextColor={theme.colors.outline}
                    value={customEnd}
                    onChangeText={(t) => {
                      setCustomEnd(t);
                      setCustomDateError('');
                    }}
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Quick shortcut helper buttons */}
              <View style={styles.customShortcutsRow}>
                <TouchableOpacity
                  style={styles.customShortcutBtn}
                  onPress={() => {
                    const today = toDateStr(new Date());
                    setCustomStart(today);
                    setCustomEnd(today);
                    setCustomDateError('');
                  }}
                >
                  <Text style={styles.customShortcutText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customShortcutBtn}
                  onPress={() => {
                    const yest = toDateStr(addDays(new Date(), -1));
                    setCustomStart(yest);
                    setCustomEnd(yest);
                    setCustomDateError('');
                  }}
                >
                  <Text style={styles.customShortcutText}>Yesterday</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customShortcutBtn}
                  onPress={() => {
                    const today = new Date();
                    const weekAgo = addDays(today, -7);
                    setCustomStart(toDateStr(weekAgo));
                    setCustomEnd(toDateStr(today));
                    setCustomDateError('');
                  }}
                >
                  <Text style={styles.customShortcutText}>Past 7 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customShortcutBtn}
                  onPress={() => {
                    const today = new Date();
                    const monthAgo = addDays(today, -30);
                    setCustomStart(toDateStr(monthAgo));
                    setCustomEnd(toDateStr(today));
                    setCustomDateError('');
                  }}
                >
                  <Text style={styles.customShortcutText}>Past 30 Days (1 Mo)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.customShortcutBtn}
                  onPress={() => {
                    const today = new Date();
                    const first = new Date(today.getFullYear(), today.getMonth(), 1);
                    setCustomStart(toDateStr(first));
                    setCustomEnd(toDateStr(today));
                    setCustomDateError('');
                  }}
                >
                  <Text style={styles.customShortcutText}>This Month</Text>
                </TouchableOpacity>
              </View>

              {customDateError ? (
                <Text style={styles.customDateError}>⚠️ {customDateError}</Text>
              ) : null}

              <View style={styles.customPickerActions}>
                <TouchableOpacity
                  style={styles.customCancelBtn}
                  onPress={() => {
                    setShowCustomPicker(false);
                    if (quickFilter === 'custom' && (!customStart || !customEnd)) {
                      setQuickFilter('all');
                    }
                  }}
                >
                  <Text style={styles.customCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.customApplyBtn} onPress={applyCustomRange}>
                  <Text style={styles.customApplyBtnText}>Apply Date Range</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 5. Summary KPI Stats Bar for the selected Car and Date Range */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Fare (Trips)</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.primaryContainer }]}>
                ₹{summary.totalFare.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses (Fuel/etc)</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.error }]}>
                ₹{summary.totalExpenses.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Margin</Text>
              <Text
                style={[
                  styles.summaryVal,
                  { color: summary.netEarnings >= 0 ? '#16a34a' : theme.colors.error },
                ]}
              >
                ₹{summary.netEarnings.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>KM Logged</Text>
              <Text style={styles.summaryVal}>{summary.totalKm} KM</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primaryContainer} size="large" />
          <Text style={styles.loadingText}>Fetching records...</Text>
        </View>
      ) : activeTab === 'trips_expenses' ? (
        <FlatList
          data={combinedRecords}
          keyExtractor={(item, idx) => `${item.type}-${(item.data as any).id}-${idx}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primaryContainer}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Layers size={40} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>
                {recordFilter === 'expenses'
                  ? 'No Expenses Found'
                  : recordFilter === 'trips'
                  ? 'No Trips Found'
                  : 'No Records Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedVehicleId !== 'all' || quickFilter !== 'all'
                  ? 'No activity found for this vehicle/date selection. Try clearing the filter or logging a new record.'
                  : 'Tap "+ Log Trip" or "+ Log Expense" above to record operations.'}
              </Text>
              {(selectedVehicleId !== 'all' || quickFilter !== 'all') && (
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={() => {
                    clearDateFilter();
                    setSelectedVehicleId('all');
                  }}
                >
                  <X size={14} color={theme.colors.onPrimary} />
                  <Text style={styles.emptyCtaBtnText}>Reset All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={renderCombinedRecord}
        />
      ) : (
        /* Companies List */
        <FlatList
          data={companies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primaryContainer}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Building2 size={44} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No Client Companies</Text>
              <Text style={styles.emptySubtitle}>
                Add corporate companies that book recurring employee pickup & drop trips with your fleet.
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => { setCompanyToEdit(null); setIsCompanyModalOpen(true); }}
              >
                <Plus size={16} color={theme.colors.onPrimary} />
                <Text style={styles.emptyCtaBtnText}>Add First Client Company</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => renderCompanyCard(item)}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <AddEditTripModal
        visible={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSubmit={handleSaveTrip}
        tripToEdit={tripToEdit}
        vehicles={vehicles}
        drivers={drivers}
        companies={companies}
        onAddNewCompany={() => {
          setCompanyToEdit(null);
          setIsCompanyModalOpen(true);
        }}
        isOwner={true}
      />

      <AddEditExpenseModal
        visible={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        vehicles={vehicles}
        drivers={drivers}
        isOwner={true}
      />

      <AddEditCompanyModal
        visible={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSubmit={handleSaveCompany}
        companyToEdit={companyToEdit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── App Bar ──────────────────────────────────────────────────────────────
  topAppBar: {
    height: 72,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingTop: 8,
    ...theme.shadows.level1,
  },
  appBarTitle: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    fontWeight: '700',
    fontSize: 20,
  },
  appBarSubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  addFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    gap: 6,
    ...theme.shadows.level1,
  },
  addFabText: {
    ...theme.typography.labelMd,
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Main Segment (2 tabs) ────────────────────────────────────────────────
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceLow,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  segmentText: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },

  // ── Controls Panel ────────────────────────────────────────────────────────
  controlsPanel: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 4,
  },
  sectionHeaderLabel: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Vehicle filter scroll
  vehicleFilterSection: {
    gap: 2,
  },
  vehicleScrollRow: {
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  vehiclePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  vehiclePillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryContainer,
  },
  vehiclePillText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  vehiclePillTextActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },

  // Radio Buttons: Show Items
  radioContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: 6,
  },
  radioGroupLabel: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  radioBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryContainer,
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: theme.colors.primaryContainer,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primaryContainer,
  },
  radioLabel: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  radioLabelActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },

  // Date filter chips
  dateFilterSection: {
    gap: 2,
  },
  dateChipRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  dateChipActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  dateChipText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  dateChipTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.errorLight,
  },
  clearFilterText: {
    ...theme.typography.labelMd,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.error,
  },

  // Custom date picker card
  customPickerCard: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 10,
  },
  customPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customPickerTitle: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  customPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customPickerArrow: {
    marginTop: 18,
  },
  customPickerField: {
    flex: 1,
    gap: 4,
  },
  customPickerLabel: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  customPickerInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  customShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  customShortcutBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  customShortcutText: {
    ...theme.typography.labelMd,
    fontSize: 10,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  customDateError: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: '600',
  },
  customPickerActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  customCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  customCancelBtnText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  customApplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  customApplyBtnText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },

  // Summary KPI Bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLow,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderLight,
  },
  summaryLabel: {
    ...theme.typography.labelMd,
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  summaryVal: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 1,
  },

  // ── List & Empty ──────────────────────────────────────────────────────────
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 10,
  },
  listContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginTop: 12,
  },
  emptyTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 290,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryContainer,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    marginTop: 14,
  },
  emptyCtaBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },

  // ── Record Card ────────────────────────────────────────────────────────────
  recordCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  recordDateText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  subText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  customerSubText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  routeBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginVertical: 4,
  },
  itemRouteText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  categoryPillSmall: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  categoryPillSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },
  kmBadge: {
    backgroundColor: theme.colors.surfaceLow,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
  },
  kmBadgeText: {
    ...theme.typography.labelMd,
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },
  expenseAmountHighlight: {
    ...theme.typography.titleLg,
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '700',
  },
  metaBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.sm,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 6,
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItem: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  notesText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...theme.typography.labelMd,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  deductibleBadge: {
    backgroundColor: theme.colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  deductibleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.error,
  },

  // ── Company Card Specific ─────────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusBadgeInactive: {
    backgroundColor: theme.colors.surfaceLow,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: '#16a34a',
  },
  statusBadgeTextInactive: {
    color: theme.colors.outline,
  },
  rateBadge: {
    backgroundColor: theme.colors.tertiaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.tertiaryContainer,
  },
  companyStatsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginVertical: 4,
  },
  companyStatCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  companyStatLabel: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  companyStatValue: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
