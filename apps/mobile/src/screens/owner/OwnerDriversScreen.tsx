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
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import type { Driver, Vehicle } from '../../types';
import { AddEditDriverModal } from '../../components/AddEditDriverModal';
import { Users, Plus, Edit2, Trash2, Phone, Car, Award, ShieldCheck, Mail } from 'lucide-react-native';

export const OwnerDriversScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [driversData, vehiclesData] = await Promise.all([
        api.getDrivers(),
        api.getVehicles(),
      ]);
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load drivers.');
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

  const handleSave = async (data: any) => {
    if (driverToEdit) {
      await api.updateDriver(driverToEdit.id, data);
    } else {
      await api.createDriver(data);
    }
    await loadData();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Driver', `Are you sure you want to remove ${name} from your team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDriver(id);
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete driver.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar Header (MD3 64px) */}
      <View style={styles.topAppBar}>
        <View>
          <Text style={styles.appBarTitle}>Fleet Drivers</Text>
          <Text style={styles.appBarSubtitle}>{drivers.length} drivers registered</Text>
        </View>

        <TouchableOpacity
          style={styles.addFab}
          onPress={() => {
            setDriverToEdit(null);
            setIsModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={18} color={theme.colors.onPrimary} />
          <Text style={styles.addFabText}>Add Driver</Text>
        </TouchableOpacity>
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
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={theme.colors.primaryContainer} size="large" />
            <Text style={styles.loadingText}>Loading driver roster...</Text>
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={44} color={theme.colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No Drivers Registered</Text>
            <Text style={styles.emptySubtitle}>
              Tap "+ Add Driver" to recruit and onboard drivers for your fleet vehicles.
            </Text>
          </View>
        ) : (
          drivers.map((d) => {
            const isActive = d.status === 'ACTIVE';
            return (
              <View key={d.id} style={styles.driverCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarWrap}>
                    <Users size={20} color={theme.colors.secondary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.driverName}>{d.name}</Text>
                    <View style={styles.metaRow}>
                      <Mail size={12} color={theme.colors.onSurfaceVariant} />
                      <Text style={styles.metaText}>{d.email}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isActive
                          ? theme.colors.secondaryLight
                          : theme.colors.tertiaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isActive
                            ? theme.colors.secondary
                            : theme.colors.tertiaryContainer,
                        },
                      ]}
                    >
                      {d.status}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Phone size={13} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.detailText}>{d.mobile || 'No Phone'}</Text>
                  </View>

                  {d.salary ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailTextBold}>
                        Salary: ₹{d.salary.toLocaleString()}/mo
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.vehicleAssignmentRow}>
                  <Car
                    size={14}
                    color={d.assignedVehicle ? theme.colors.primaryContainer : theme.colors.outline}
                  />
                  <Text
                    style={[
                      styles.assignedText,
                      !d.assignedVehicle && { color: theme.colors.outline },
                    ]}
                  >
                    {d.assignedVehicle
                      ? `Vehicle: ${d.assignedVehicle.vehicleNumber} (${d.assignedVehicle.model})`
                      : 'No vehicle assigned'}
                  </Text>
                </View>

                {d.licenseNumber ? (
                  <Text style={styles.licenseText}>License: {d.licenseNumber}</Text>
                ) : null}

                {/* Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setDriverToEdit(d);
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit2 size={15} color={theme.colors.primaryContainer} />
                    <Text style={styles.actionText}>Edit Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(d.id, d.name)}
                  >
                    <Trash2 size={15} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Driver Modal */}
      <AddEditDriverModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        driverToEdit={driverToEdit}
        vehicles={vehicles}
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
  addFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryContainer,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    ...theme.shadows.level1,
  },
  addFabText: {
    ...theme.typography.labelMd,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
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
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 280,
  },
  driverCard: {
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
    marginBottom: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
  },
  statusText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLow,
    padding: 8,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  detailTextBold: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  vehicleAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  assignedText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  licenseText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.outline,
    marginBottom: 4,
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
});
