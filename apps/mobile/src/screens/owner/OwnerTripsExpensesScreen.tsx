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
  FlatList,
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
  Car,
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
} from 'lucide-react-native';

export const OwnerTripsExpensesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trips' | 'expenses' | 'companies'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tripsData, expensesData, vehiclesData, driversData, companiesData] = await Promise.all([
        api.getTrips(),
        api.getExpenses(),
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Trip Handlers
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

  // Expense Handlers
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

  // Company Handlers
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
    if (activeTab === 'trips') return `${trips.length} Trips logged`;
    if (activeTab === 'expenses') return `${expenses.length} Expenses logged`;
    return `${companies.length} Corporate Clients`;
  };

  const getActionBtnLabel = () => {
    if (activeTab === 'trips') return 'Log Trip';
    if (activeTab === 'expenses') return 'Log Expense';
    return 'Add Client';
  };

  const handleActionBtnPress = () => {
    if (activeTab === 'trips') {
      setTripToEdit(null);
      setIsTripModalOpen(true);
    } else if (activeTab === 'expenses') {
      setExpenseToEdit(null);
      setIsExpenseModalOpen(true);
    } else {
      setCompanyToEdit(null);
      setIsCompanyModalOpen(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar Header */}
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

      {/* Segmented Control with 3 tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'trips' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('trips')}
        >
          <Navigation
            size={15}
            color={activeTab === 'trips' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, activeTab === 'trips' && styles.segmentTextActive]}>
            Trips ({trips.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'expenses' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Fuel
            size={15}
            color={activeTab === 'expenses' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, activeTab === 'expenses' && styles.segmentTextActive]}>
            Expenses ({expenses.length})
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

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primaryContainer} size="large" />
          <Text style={styles.loadingText}>Fetching records...</Text>
        </View>
      ) : activeTab === 'trips' ? (
        /* Trips List */
        <FlatList
          data={trips}
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
              <Navigation size={40} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No Trips Logged</Text>
              <Text style={styles.emptySubtitle}>
                Tap the "+ Log Trip" button above to record corporate client runs.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                  <Building2 size={18} color={theme.colors.primaryContainer} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.titleText}>{item.companyName}</Text>
                  <Text style={styles.subText}>{item.time}</Text>
                </View>
                <View style={styles.kmBadge}>
                  <Text style={styles.kmBadgeText}>{item.km} KM</Text>
                </View>
              </View>

              {/* Meta details */}
              <View style={styles.metaBox}>
                {item.tripAmount ? (
                  <Text style={[styles.metaItem, { fontWeight: '700', color: theme.colors.primaryContainer }]}>
                    ₹{item.tripAmount.toFixed(0)} Fare
                  </Text>
                ) : null}
                {item.vehicle && (
                  <Text style={styles.metaItem}>🚗 {item.vehicle.vehicleNumber}</Text>
                )}
                {item.driver && (
                  <Text style={styles.metaItem}>👤 {item.driver.name}</Text>
                )}
                {item.date && (
                  <Text style={styles.metaItem}>
                    📅 {new Date(item.date).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {item.notes ? (
                <Text style={styles.notesText} numberOfLines={2}>
                  📝 {item.notes}
                </Text>
              ) : null}

              {/* Actions */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setTripToEdit(item);
                    setIsTripModalOpen(true);
                  }}
                >
                  <Edit2 size={14} color={theme.colors.primaryContainer} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDeleteTrip(item.id, item.companyName)}
                >
                  <Trash2 size={14} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : activeTab === 'expenses' ? (
        /* Expenses List */
        <FlatList
          data={expenses}
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
              <Fuel size={40} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No Expenses Logged</Text>
              <Text style={styles.emptySubtitle}>
                Tap the "+ Log Expense" button to record fuel, toll or maintenance costs.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badgeStyle = getCategoryBadge(item.category);
            return (
              <View style={styles.recordCard}>
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
                    <Text style={styles.subText}>
                      {item.date ? new Date(item.date).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmountHighlight}>₹{item.amount.toFixed(0)}</Text>
                </View>

                {/* Meta details */}
                <View style={styles.metaBox}>
                  {item.vehicle && (
                    <Text style={styles.metaItem}>🚗 {item.vehicle.vehicleNumber}</Text>
                  )}
                  {item.driver && (
                    <Text style={styles.metaItem}>👤 {item.driver.name}</Text>
                  )}
                </View>

                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    📝 {item.notes}
                  </Text>
                ) : null}

                {/* Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setExpenseToEdit(item);
                      setIsExpenseModalOpen(true);
                    }}
                  >
                    <Edit2 size={14} color={theme.colors.primaryContainer} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteExpense(item.id, item.category, item.amount)}
                  >
                    <Trash2 size={14} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* Companies / Clients List */
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
                Add corporate companies (e.g. CityGlide, Infosys) that book recurring employee pickup & drop trips with your fleet.
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => {
                  setCompanyToEdit(null);
                  setIsCompanyModalOpen(true);
                }}
              >
                <Plus size={16} color={theme.colors.onPrimary} />
                <Text style={styles.emptyCtaBtnText}>Add First Client Company</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = item.status === 'ACTIVE';
            return (
              <View style={styles.recordCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarWrap, { backgroundColor: theme.colors.primaryLight }]}>
                    <Building2 size={20} color={theme.colors.primaryContainer} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.titleText}>{item.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                          ]}
                        >
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

                {/* Performance / Revenue Stats */}
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

                {/* Contact Information Box */}
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
                  <Text style={styles.notesText} numberOfLines={2}>
                    📝 {item.notes}
                  </Text>
                ) : null}

                {/* Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setCompanyToEdit(item);
                      setIsCompanyModalOpen(true);
                    }}
                  >
                    <Edit2 size={14} color={theme.colors.primaryContainer} />
                    <Text style={styles.actionText}>Edit Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteCompany(item.id, item.name)}
                  >
                    <Trash2 size={14} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modals */}
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
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceLow,
    gap: 5,
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
    marginTop: 20,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.full,
    marginTop: 16,
  },
  emptyCtaBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  recordCard: {
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
  metaBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.sm,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 6,
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
});
