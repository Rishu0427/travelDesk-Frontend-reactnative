import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import type { Trip, Expense, Vehicle, Salary, Company } from '../../types';
import { AddEditTripModal } from '../../components/AddEditTripModal';
import { AddEditExpenseModal } from '../../components/AddEditExpenseModal';
import { SalarySlipModal } from '../../components/SalarySlipModal';
import { ProfileModal } from '../../components/ProfileModal';
import { calculateNetPayable } from '../../utils/salarySlip';
import {
  Navigation,
  Fuel,
  LogOut,
  Plus,
  Clock,
  Gauge,
  Building2,
  Calendar,
  Edit2,
  Car,
  User,
  IndianRupee,
  RotateCw,
  FileText,
} from 'lucide-react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DriverHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [latestSalary, setLatestSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const loadTodayData = useCallback(async () => {
    try {
      const [tripsData, expensesData, vehiclesData, salariesData, companiesData] = await Promise.all([
        api.getTrips({ filterType: 'today' }),
        api.getExpenses({ filterType: 'today' }),
        api.getVehicles().catch(() => []),
        api.getSalaries().catch(() => []),
        api.getCompanies().catch(() => []),
      ]);
      setTodayTrips(tripsData);
      setTodayExpenses(expensesData);
      setVehicles(vehiclesData);
      setCompanies(companiesData);
      if (Array.isArray(salariesData) && salariesData.length > 0) {
        setLatestSalary(salariesData[0]);
      } else {
        setLatestSalary(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load daily driver log.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTodayData();
  };

  const handleSaveTrip = async (data: any) => {
    if (tripToEdit) {
      await api.updateTrip(tripToEdit.id, data);
    } else {
      await api.createTrip(data);
    }
    await loadTodayData();
  };

  const handleSaveExpense = async (data: any) => {
    if (expenseToEdit) {
      await api.updateExpense(expenseToEdit.id, data);
    } else {
      await api.createExpense(data);
    }
    await loadTodayData();
  };

  const totalKmToday = todayTrips.reduce((acc, t) => acc + (t.km || 0), 0);
  const totalExpenseToday = todayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Top App Bar Header (MD3 64px) */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          style={styles.appBarLeft}
          onPress={() => setIsProfileModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrap}>
            <User size={20} color={theme.colors.secondary} />
          </View>
          <View>
            <Text style={styles.appBarTitle}>Hello, {user?.name || 'Driver'}</Text>
            <Text style={styles.appBarSubtitle}>
              {todayFormatted} • Tap for Profile
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.appBarActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.secondaryLight }]}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.7}
          >
            <User size={18} color={theme.colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} activeOpacity={0.7}>
            <RotateCw size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.iconBtn} onPress={logout} activeOpacity={0.7}>
            <LogOut size={18} color={theme.colors.error} />
          </TouchableOpacity> */}
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

        {/* Latest Payslip / Salary Slip Banner */}
        {latestSalary && (
          <View style={styles.salarySlipBanner}>
            <View style={styles.salarySlipBannerHeader}>
              <View style={styles.salarySlipIconBadge}>
                <FileText size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.salarySlipBannerTitle}>
                  {MONTH_NAMES[latestSalary.month - 1] || `Month ${latestSalary.month}`} {latestSalary.year} Payslip
                </Text>
                <Text style={styles.salarySlipBannerSub}>
                  Net: ₹{calculateNetPayable(latestSalary).toLocaleString()} • Status: {latestSalary.paymentStatus || 'PENDING'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.salarySlipViewBtn}
                onPress={() => setIsSalarySlipModalOpen(true)}
                activeOpacity={0.85}
              >
                <FileText size={14} color="#fff" />
                <Text style={styles.salarySlipViewBtnText}>View Slip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Navigation size={18} color={theme.colors.primaryContainer} />
            </View>
            <Text style={styles.statLabel}>Today's Trips</Text>
            <Text style={styles.statValue}>{todayTrips.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
              <Gauge size={18} color="#0284c7" />
            </View>
            <Text style={styles.statLabel}>Today's Distance</Text>
            <Text style={styles.statValue}>{totalKmToday.toFixed(1)} km</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.tertiaryLight }]}>
              <Fuel size={18} color={theme.colors.tertiaryContainer} />
            </View>
            <Text style={styles.statLabel}>Daily Expenses</Text>
            <Text style={styles.statValue}>₹{totalExpenseToday.toLocaleString()}</Text>
          </View>
        </View>

        {/* Quick Action Tiles */}
        <View style={styles.actionTilesRow}>
          <TouchableOpacity
            style={styles.actionTile}
            activeOpacity={0.85}
            onPress={() => {
              setTripToEdit(null);
              setIsTripModalOpen(true);
            }}
          >
            <View style={styles.actionTileIconWrap}>
              <Navigation size={22} color={theme.colors.onPrimary} />
            </View>
            <Text style={styles.actionTileTitle}>Log New Trip</Text>
            <Text style={styles.actionTileSub}>Company destination, time & KM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.85}
            onPress={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
          >
            <View style={[styles.actionTileIconWrap, { backgroundColor: theme.colors.secondaryLight }]}>
              <Fuel size={22} color={theme.colors.secondary} />
            </View>
            <Text style={[styles.actionTileTitle, { color: theme.colors.onSurface }]}>
              Log Fuel / Expense
            </Text>
            <Text style={styles.actionTileSub}>CNG, Petrol, Toll, Parking</Text>
          </TouchableOpacity>
        </View>

        {/* Driver Profile Quick Banner */}
        {/* <TouchableOpacity
          style={styles.profileBanner}
          activeOpacity={0.85}
          onPress={() => setIsProfileModalOpen(true)}
        >
          <View style={styles.profileBannerLeft}>
            <View style={styles.profileBannerAvatar}>
              <User size={20} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileBannerTitle}>My Driver Profile</Text>
              <Text style={styles.profileBannerSub}>
                View vehicle assignment, salary & update contact details
              </Text>
            </View>
          </View>
          <View style={styles.profileBannerBtn}>
            <Edit2 size={13} color={theme.colors.secondary} />
            <Text style={styles.profileBannerBtnText}>View / Edit</Text>
          </View>
        </TouchableOpacity> */}

        {/* Today's Trips */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Navigation size={18} color={theme.colors.primaryContainer} />
            <Text style={styles.cardTitle}>Today's Trips ({todayTrips.length})</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.colors.primaryContainer} style={{ padding: 20 }} />
          ) : todayTrips.length === 0 ? (
            <Text style={styles.emptyText}>No trips logged for today yet.</Text>
          ) : (
            todayTrips.map((t) => (
              <View key={t.id} style={styles.itemRow}>
                <View style={styles.itemIconWrap}>
                  <Building2 size={16} color={theme.colors.primaryContainer} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.itemTitle}>{t.companyName}</Text>
                  <Text style={styles.itemSub}>
                    Time: {t.time} {t.vehicle ? `• ${t.vehicle.vehicleNumber}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemKm}>{t.km} km</Text>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setTripToEdit(t);
                      setIsTripModalOpen(true);
                    }}
                  >
                    <Edit2 size={12} color={theme.colors.primaryContainer} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Today's Expenses */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Fuel size={18} color={theme.colors.secondary} />
            <Text style={styles.cardTitle}>Today's Fuel & Expenses ({todayExpenses.length})</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.colors.secondary} style={{ padding: 20 }} />
          ) : todayExpenses.length === 0 ? (
            <Text style={styles.emptyText}>No expenses logged for today yet.</Text>
          ) : (
            todayExpenses.map((e) => (
              <View key={e.id} style={styles.itemRow}>
                <View style={[styles.itemIconWrap, { backgroundColor: theme.colors.secondaryLight }]}>
                  <IndianRupee size={16} color={theme.colors.secondary} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={styles.itemTitle}>
                      {e.category === 'DRIVER_EXPENSE' ? 'Driver Expense' : e.category}
                    </Text>
                    {e.driverDeductible ? (
                      <View style={styles.deductibleBadge}>
                        <Text style={styles.deductibleBadgeText}>✂️ Deductible</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemSub}>
                    {e.notes ? e.notes : (e.driverDeductible ? 'Deducted from driver payout' : 'Direct fuel/operating entry')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemAmount}>₹{e.amount.toLocaleString()}</Text>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setExpenseToEdit(e);
                      setIsExpenseModalOpen(true);
                    }}
                  >
                    <Edit2 size={12} color={theme.colors.secondary} />
                    <Text style={[styles.editText, { color: theme.colors.secondary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <AddEditTripModal
        visible={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSubmit={handleSaveTrip}
        tripToEdit={tripToEdit}
        vehicles={vehicles}
        companies={companies}
        isOwner={false}
      />

      <AddEditExpenseModal
        visible={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        vehicles={vehicles}
        isOwner={false}
      />

      {latestSalary && (
        <SalarySlipModal
          visible={isSalarySlipModalOpen}
          onClose={() => setIsSalarySlipModalOpen(false)}
          salary={latestSalary}
        />
      )}

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
    backgroundColor: theme.colors.background,
  },
  topAppBar: {
    height: 64,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.level1,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  appBarSubtitle: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  appBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  statValue: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  actionTilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.level1,
  },
  actionTileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTileTitle: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  actionTileSub: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.outlineVariant,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  emptyText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLow,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    ...theme.typography.titleLg,
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  itemSub: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemKm: {
    ...theme.typography.titleLg,
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  itemAmount: {
    ...theme.typography.titleLg,
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  editText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  deductibleBadge: {
    backgroundColor: theme.colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.full,
  },
  deductibleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.error,
  },
  salarySlipBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.level1,
  },
  salarySlipBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salarySlipIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salarySlipBannerTitle: {
    ...theme.typography.titleLg,
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  salarySlipBannerSub: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  salarySlipViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    gap: 5,
  },
  salarySlipViewBtnText: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  profileBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...theme.shadows.level1,
  },
  profileBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileBannerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBannerTitle: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  profileBannerSub: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  profileBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  profileBannerBtnText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
});
