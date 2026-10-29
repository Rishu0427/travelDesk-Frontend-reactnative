import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { theme } from '../constants/theme';
import type { Vehicle, Driver, FuelType } from '../types';
import { X, Car } from 'lucide-react-native';

interface AddEditVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  vehicleToEdit?: Vehicle | null;
  drivers?: Driver[];
}

export const AddEditVehicleModal: React.FC<AddEditVehicleModalProps> = ({
  visible,
  onClose,
  onSubmit,
  vehicleToEdit,
  drivers = [],
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [manufacturer, setManufacturer] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleToEdit) {
      setVehicleNumber(vehicleToEdit.vehicleNumber || '');
      setModel(vehicleToEdit.model || '');
      setFuelType(vehicleToEdit.fuelType || 'CNG');
      setManufacturer(vehicleToEdit.manufacturer || '');
      setAssignedDriverId(vehicleToEdit.assignedDriver?.id || '');
    } else {
      setVehicleNumber('');
      setModel('');
      setFuelType('CNG');
      setManufacturer('');
      setAssignedDriverId('');
    }
  }, [vehicleToEdit, visible]);

  const handleSubmit = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Required', 'Vehicle registration number is required.');
      return;
    }
    if (!model.trim()) {
      Alert.alert('Required', 'Car model name is required.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        model: model.trim(),
        fuelType,
        manufacturer: manufacturer.trim() || undefined,
        assignedDriverId: assignedDriverId || null,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save vehicle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Car size={18} color={theme.colors.primaryContainer} />
              </View>
              <Text style={styles.title}>{vehicleToEdit ? 'Edit Vehicle' : 'Add New Vehicle'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Vehicle Plate / Reg Number</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. MH12AB1234"
                placeholderTextColor={theme.colors.outline}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
              />
            </View>

            <Text style={styles.label}>Model & Variant</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maruti Dzire, Ertiga"
                placeholderTextColor={theme.colors.outline}
                value={model}
                onChangeText={setModel}
              />
            </View>

            <Text style={styles.label}>Fuel Specification</Text>
            <View style={styles.segmentedControl}>
              {(['CNG', 'PETROL', 'DIESEL', 'EV'] as FuelType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentBtn, fuelType === type && styles.segmentBtnActive]}
                  onPress={() => setFuelType(type)}
                >
                  <Text style={[styles.segmentText, fuelType === type && styles.segmentTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Manufacturer Brand (Optional)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maruti Suzuki, Tata, Hyundai"
                placeholderTextColor={theme.colors.outline}
                value={manufacturer}
                onChangeText={setManufacturer}
              />
            </View>

            {drivers.length > 0 && (
              <View>
                <Text style={styles.label}>Assigned Primary Driver</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.driverPill, !assignedDriverId && styles.driverPillActive]}
                    onPress={() => setAssignedDriverId('')}
                  >
                    <Text style={[styles.driverPillText, !assignedDriverId && styles.driverPillTextActive]}>
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                  {drivers.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.driverPill, assignedDriverId === d.id && styles.driverPillActive]}
                      onPress={() => setAssignedDriverId(d.id)}
                    >
                      <Text style={[styles.driverPillText, assignedDriverId === d.id && styles.driverPillTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {vehicleToEdit ? 'Save Changes' : 'Register Vehicle'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
    ...theme.shadows.level2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    maxHeight: 400,
  },
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  inputWrap: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    marginBottom: 10,
  },
  input: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceLow,
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
  },
  driverPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 8,
  },
  driverPillActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  driverPillText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  driverPillTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  submitBtn: {
    height: 56,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.level1,
  },
  submitBtnText: {
    ...theme.typography.titleLg,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});
