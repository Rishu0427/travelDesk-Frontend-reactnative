import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { AnalyticsData } from '../../types';
import {
  BarChart3,
  Fuel,
  Navigation,
  Gauge,
  Car,
  TrendingUp,
  RotateCw,
  LogOut,
  IndianRupee,
  Layers,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { ProfileModal } from '../../components/ProfileModal';

export const OwnerAnalyticsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.getAnalysis(period);
      setAnalytics(data);
    } catch (err: any) {
      console.warn('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const summary = analytics?.summary || {
    totalExpense: 0,
    cngExpense: 0,
    petrolExpense: 0,
    otherExpense: 0,
    driverDeductibleExpense: 0,
    totalTrips: 0,
    totalKm: 0,
    totalTripAmount: 0,
    totalVehicles: 0,
    totalDrivers: 0,
  };

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
            <ShieldCheck size={20} color={theme.colors.primaryContainer} />
          </View>
          <View>
            <Text style={styles.appBarTitle}>TravelDesk Fleet</Text>
            <Text style={styles.appBarSubtitle}>
              {user?.name || 'Owner Portal'} • Tap for Profile
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.appBarActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.primaryLight }]}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.7}
          >
            <User size={18} color={theme.colors.primaryContainer} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <RotateCw size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={styles.iconBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
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
        {/* Banner with period switcher */}
        <View style={styles.bannerHeader}>
          <View>
            <Text style={styles.sectionHeading}>Fleet Intelligence</Text>
            <Text style={styles.sectionSub}>Performance & resource metrics</Text>
          </View>

          {/* Segmented Period Tabs */}
          <View style={styles.periodSegment}>
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={theme.colors.primaryContainer} size="large" />
            <Text style={styles.loadingText}>Compiling analytics...</Text>
          </View>
        ) : (
          <>
            {/* Primary Metrics 2x2 Grid */}
            <View style={styles.metricsGrid}>
              {/* Total Expenses */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <IndianRupee size={20} color={theme.colors.primaryContainer} />
                </View>
                <Text style={styles.metricLabel}>Total Expenses</Text>
                <Text style={styles.metricValue}>
                  ₹{summary.totalExpense.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>All fuel & operating costs</Text>
              </View>

              {/* Total Trips */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.secondaryLight }]}>
                  <Navigation size={20} color={theme.colors.secondary} />
                </View>
                <Text style={styles.metricLabel}>Total Trips</Text>
                <Text style={styles.metricValue}>{summary.totalTrips}</Text>
                <Text style={styles.metricSub}>Completed runs</Text>
              </View>

              {/* Total Distance */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                  <Gauge size={20} color="#0284c7" />
                </View>
                <Text style={styles.metricLabel}>Total Distance</Text>
                <Text style={styles.metricValue}>{summary.totalKm.toFixed(1)} km</Text>
                <Text style={styles.metricSub}>Logged by fleet</Text>
              </View>

              {/* Active Fleet */}
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.tertiaryLight }]}>
                  <Car size={20} color={theme.colors.tertiaryContainer} />
                </View>
                <Text style={styles.metricLabel}>Fleet Scale</Text>
                <Text style={styles.metricValue}>
                  {summary.totalVehicles} <Text style={{ fontSize: 13, fontWeight: '400' }}>Cars</Text>
                </Text>
                <Text style={styles.metricSub}>{summary.totalDrivers} active drivers</Text>
              </View>
            </View>

            {/* Fuel & Category Breakdown Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Fuel size={18} color={theme.colors.primaryContainer} />
                <Text style={styles.cardTitle}>Expense Distribution ({period})</Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={[styles.pillBadge, { backgroundColor: theme.colors.cngBg }]}>
                    <Text style={[styles.pillBadgeText, { color: theme.colors.cng }]}>CNG</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    ₹{summary.cngExpense.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View style={[styles.pillBadge, { backgroundColor: theme.colors.petrolBg }]}>
                    <Text style={[styles.pillBadgeText, { color: theme.colors.petrol }]}>Petrol</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    ₹{summary.petrolExpense.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View style={[styles.pillBadge, { backgroundColor: theme.colors.otherBg }]}>
                    <Text style={[styles.pillBadgeText, { color: theme.colors.other }]}>Other / Toll</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    ₹{summary.otherExpense.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View style={[styles.pillBadge, { backgroundColor: theme.colors.errorLight }]}>
                    <Text style={[styles.pillBadgeText, { color: theme.colors.error }]}>Deductibles</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    ₹{(summary.driverDeductibleExpense || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Trips Preview */}
            <View style={styles.card}>
              <View style={styles.cardHeaderBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Navigation size={18} color={theme.colors.primaryContainer} />
                  <Text style={styles.cardTitle}>Recent Trips ({analytics?.trips?.length || 0})</Text>
                </View>
              </View>

              {analytics?.trips && analytics.trips.length > 0 ? (
                analytics.trips.slice(0, 5).map((trip) => (
                  <View key={trip.id} style={styles.logItemRow}>
                    <View style={styles.logIconCol}>
                      <Car size={16} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={styles.logMainText}>{trip.companyName}</Text>
                      <Text style={styles.logSubText}>
                        {trip.driver?.name || 'Driver'} • {trip.date} • {trip.time}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.logKm}>{trip.km} km</Text>
                      {trip.tripAmount ? (
                        <Text style={styles.logAmount}>₹{trip.tripAmount}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No trips recorded for this timeframe.</Text>
              )}
            </View>

            {/* Recent Expenses Preview */}
            <View style={styles.card}>
              <View style={styles.cardHeaderBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IndianRupee size={18} color={theme.colors.primaryContainer} />
                  <Text style={styles.cardTitle}>
                    Recent Expenses ({analytics?.expenses?.length || 0})
                  </Text>
                </View>
              </View>

              {analytics?.expenses && analytics.expenses.length > 0 ? (
                analytics.expenses.slice(0, 5).map((exp) => (
                  <View key={exp.id} style={styles.logItemRow}>
                    <View style={[styles.logIconCol, { backgroundColor: theme.colors.surfaceLow }]}>
                      <Fuel size={16} color={theme.colors.primaryContainer} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.logMainText}>
                          {exp.category === 'DRIVER_EXPENSE' ? 'Driver Expense' : exp.category}
                        </Text>
                        {exp.driverDeductible ? (
                          <View style={styles.deductibleBadge}>
                            <Text style={styles.deductibleBadgeText}>✂️ Deductible</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.logSubText}>
                        {exp.driver?.name || 'Fleet'} • {exp.date}
                        {exp.notes ? ` • ${exp.notes}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.expenseAmountHighlight}>
                      ₹{exp.amount.toLocaleString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No expenses logged for this timeframe.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
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
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeading: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  sectionSub: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  periodSegment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.full,
    padding: 3,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  periodBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: theme.colors.onPrimary,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  metricValue: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  metricSub: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.outline,
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
    marginBottom: 12,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  breakdownItem: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: 'center',
  },
  pillBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    marginBottom: 6,
  },
  pillBadgeText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownAmount: {
    ...theme.typography.titleLg,
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  logItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLow,
  },
  logIconCol: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logMainText: {
    ...theme.typography.bodyLg,
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  logSubText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  logKm: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  logAmount: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  expenseAmountHighlight: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.error,
  },
  emptyInlineText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
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
});
