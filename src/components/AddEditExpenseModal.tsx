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
import type { Expense, ExpenseCategory, Vehicle, Driver } from '../types';
import { X, Fuel, IndianRupee, FileText, Check } from 'lucide-react-native';

interface AddEditExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  expenseToEdit?: Expense | null;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  isOwner?: boolean;
}

const CATEGORIES: { label: string; value: ExpenseCategory; icon: string }[] = [
  { label: 'CNG', value: 'CNG', icon: '🌿' },
  { label: 'Petrol', value: 'PETROL', icon: '⛽' },
  { label: 'Toll', value: 'TOLL', icon: '🛣️' },
  { label: 'Parking', value: 'PARKING', icon: '🅿️' },
  { label: 'Maintenance', value: 'MAINTENANCE', icon: '🔧' },
  { label: 'Driver Expense', value: 'DRIVER_EXPENSE', icon: '👤' },
  { label: 'Other', value: 'OTHER', icon: '📦' },
];

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  expenseToEdit,
  vehicles = [],
  drivers = [],
  isOwner = false,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('CNG');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverDeductible, setDriverDeductible] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setCategory(expenseToEdit.category || 'OTHER');
      setAmount(expenseToEdit.amount ? expenseToEdit.amount.toString() : '');
      setNotes(expenseToEdit.notes || '');
      setVehicleId(expenseToEdit.vehicleId || '');
      setDriverId(expenseToEdit.driverId || '');
      setDriverDeductible(Boolean(expenseToEdit.driverDeductible ?? expenseToEdit.isDriverDeductible));
    } else {
      setCategory('CNG');
      setAmount('');
      setNotes('');
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : '');
      setDriverId(drivers.length > 0 ? drivers[0].id : '');
      setDriverDeductible(false);
    }
  }, [expenseToEdit, visible, vehicles, drivers]);

  const handleCategorySelect = (cat: ExpenseCategory) => {
    setCategory(cat);
    // If switching to Driver Expense for a new expense, automatically enable deductible by default
    if (cat === 'DRIVER_EXPENSE' && !expenseToEdit) {
      setDriverDeductible(true);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid expense amount in ₹.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        category,
        amount: parseFloat(amount),
        notes: notes.trim() || undefined,
        vehicleId: vehicleId || undefined,
        driverId: isOwner ? (driverId || undefined) : undefined,
        driverDeductible,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record expense.');
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
                <Fuel size={18} color={theme.colors.primaryContainer} />
              </View>
              <Text style={styles.title}>{expenseToEdit ? 'Edit Expense Log' : 'Log Daily Expense'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Category / Fuel Selector */}
            <Text style={styles.label}>Select Expense Category / Tag</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.categoryBtn, category === item.value && styles.categoryBtnActive]}
                  onPress={() => handleCategorySelect(item.value)}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      category === item.value && styles.categoryTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Input */}
            <Text style={styles.label}>Expense Amount (₹)</Text>
            <View style={styles.inputWrap}>
              <IndianRupee size={18} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 750"
                placeholderTextColor={theme.colors.outline}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Driver Deductibles Checkbox Card */}
            <Text style={styles.label}>Driver Deductible Option</Text>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                driverDeductible && styles.checkboxCardActive,
              ]}
              activeOpacity={0.75}
              onPress={() => setDriverDeductible((prev) => !prev)}
            >
              <View style={[styles.checkboxBox, driverDeductible && styles.checkboxBoxActive]}>
                {driverDeductible ? (
                  <Check size={14} color="#ffffff" strokeWidth={3} />
                ) : null}
              </View>
              <View style={styles.checkboxInfo}>
                <View style={styles.checkboxHeadingRow}>
                  <Text style={styles.checkboxTitle}>Driver Deductible</Text>
                  <View
                    style={[
                      styles.statusPill,
                      driverDeductible ? styles.statusPillDeductible : styles.statusPillNonDeductible,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        driverDeductible ? styles.statusPillTextDeductible : styles.statusPillTextNonDeductible,
                      ]}
                    >
                      {driverDeductible ? '✂️ Deductible' : 'Non-deductible'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.checkboxDescription}>
                  {driverDeductible
                    ? 'This expense will be deducted from the driver payout / salary.'
                    : 'Company / fleet expense (will NOT be deducted from driver).' }
                </Text>
              </View>
            </TouchableOpacity>

            {vehicles.length > 0 && (
              <View>
                <Text style={styles.label}>Select Vehicle</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {vehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.pill, vehicleId === v.id && styles.pillActive]}
                      onPress={() => setVehicleId(v.id)}
                    >
                      <Text style={[styles.pillText, vehicleId === v.id && styles.pillTextActive]}>
                        {v.vehicleNumber} ({v.model})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {isOwner && drivers.length > 0 && (
              <View>
                <Text style={styles.label}>Paid by / Driver</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {drivers.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pill, driverId === d.id && styles.pillActive]}
                      onPress={() => setDriverId(d.id)}
                    >
                      <Text style={[styles.pillText, driverId === d.id && styles.pillTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Notes / Description */}
            <Text style={styles.label}>Receipt Notes / Fuel Station (Optional)</Text>
            <View style={styles.inputWrap}>
              <FileText size={16} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Bharat Petroleum CNG Pump #4"
                placeholderTextColor={theme.colors.outline}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
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
                {expenseToEdit ? 'Save Changes' : 'Confirm Expense'}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  categoryBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: theme.colors.onPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  pillText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  pillTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  submitBtn: {
    height: 48,
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
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    marginTop: 2,
  },
  checkboxCardActive: {
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryLight,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  checkboxInfo: {
    flex: 1,
  },
  checkboxHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  checkboxTitle: {
    ...theme.typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  statusPillDeductible: {
    backgroundColor: theme.colors.errorLight,
  },
  statusPillNonDeductible: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextDeductible: {
    color: theme.colors.error,
  },
  statusPillTextNonDeductible: {
    color: theme.colors.onSurfaceVariant,
  },
  checkboxDescription: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 15,
  },
});
