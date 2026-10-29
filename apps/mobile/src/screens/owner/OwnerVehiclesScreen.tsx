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
import type { Vehicle, Driver } from '../../types';
import { AddEditVehicleModal } from '../../components/AddEditVehicleModal';
import { Car, Plus, Edit2, Trash2, Users, Fuel, Sparkles, Navigation as NavIcon } from 'lucide-react-native';
import { confirmAction } from '../../utils/alert';

export const OwnerVehiclesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [vehiclesData, driversData] = await Promise.all([
        api.getVehicles(),
        api.getDrivers(),
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load fleet vehicles.');
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
    if (vehicleToEdit) {
      await api.updateVehicle(vehicleToEdit.id, data);
    } else {
      await api.createVehicle(data);
    }
    await loadData();
  };

  const handleDelete = (id: string, vehicleNumber: string) => {
    confirmAction(
      'Delete Vehicle',
      `Are you sure you want to remove ${vehicleNumber} from your fleet?`,
      async () => {
        try {
          await api.deleteVehicle(id);
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete vehicle.');
        }
      },
      'Delete'
    );
  };

  const getFuelColors = (fuelType: string) => {
    switch (fuelType) {
      case 'CNG':
        return { bg: theme.colors.cngBg, text: theme.colors.cng };
      case 'PETROL':
        return { bg: theme.colors.petrolBg, text: theme.colors.petrol };
      case 'DIESEL':
        return { bg: theme.colors.dieselBg, text: theme.colors.diesel };
      case 'EV':
        return { bg: theme.colors.evBg, text: theme.colors.ev };
      default:
        return { bg: theme.colors.otherBg, text: theme.colors.other };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar Header (MD3 64px) */}
      <View style={styles.topAppBar}>
        <View>
          <Text style={styles.appBarTitle}>Fleet Vehicles</Text>
          <Text style={styles.appBarSubtitle}>{vehicles.length} active registered vehicles</Text>
        </View>

        <TouchableOpacity
          style={styles.addFab}
          onPress={() => {
            setVehicleToEdit(null);
            setIsModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={18} color={theme.colors.onPrimary} />
          <Text style={styles.addFabText}>Add Vehicle</Text>
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
            <Text style={styles.loadingText}>Loading fleet vehicles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Car size={44} color={theme.colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Add Vehicle" button above to register your first fleet car.
            </Text>
          </View>
        ) : (
          vehicles.map((v) => {
            const fuel = getFuelColors(v.fuelType);
            return (
              <View key={v.id} style={styles.vehicleCard}>
                <View style={styles.cardTop}>
                  <View style={styles.vehicleTitleWrap}>
                    <View style={styles.carIconBox}>
                      <Car size={20} color={theme.colors.primaryContainer} />
                    </View>
                    <View>
                      <Text style={styles.regNumber}>{v.vehicleNumber}</Text>
                      <Text style={styles.modelText}>
                        {v.model} {v.manufacturer ? `• ${v.manufacturer}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.fuelChip, { backgroundColor: fuel.bg }]}>
                    <Text style={[styles.fuelChipText, { color: fuel.text }]}>{v.fuelType}</Text>
                  </View>
                </View>

                {/* Driver Assignment & Actions */}
                <View style={styles.cardBottom}>
                  <View style={styles.driverInfoWrap}>
                    <Users
                      size={14}
                      color={v.assignedDriver ? theme.colors.secondary : theme.colors.outline}
                    />
                    <Text
                      style={[
                        styles.driverName,
                        !v.assignedDriver && { color: theme.colors.outline },
                      ]}
                    >
                      {v.assignedDriver ? `Driver: ${v.assignedDriver.name}` : 'No driver assigned'}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation?.navigate?.('TripsExpenses', { vehicleId: v.id })}
                    >
                      <NavIcon size={14} color={theme.colors.secondary} />
                      <Text style={[styles.actionText, { color: theme.colors.secondary }]}>Trips & Fuel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setVehicleToEdit(v);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 size={15} color={theme.colors.primaryContainer} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDelete(v.id, v.vehicleNumber)}
                    >
                      <Trash2 size={15} color={theme.colors.error} />
                      <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Vehicle Modal */}
      <AddEditVehicleModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        vehicleToEdit={vehicleToEdit}
        drivers={drivers}
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
  vehicleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.level1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carIconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regNumber: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  modelText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  fuelChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
  },
  fuelChipText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  driverInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
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
