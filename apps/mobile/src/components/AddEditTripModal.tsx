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
import type { Trip, Vehicle, Driver, Company } from '../types';
import {
  X,
  Navigation,
  Building2,
  Clock,
  Gauge,
  IndianRupee,
  FileText,
  Plus,
  Briefcase,
  Sparkles,
} from 'lucide-react-native';

interface AddEditTripModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  tripToEdit?: Trip | null;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  companies?: Company[];
  onAddNewCompany?: () => void;
  isOwner?: boolean;
}

export const AddEditTripModal: React.FC<AddEditTripModalProps> = ({
  visible,
  onClose,
  onSubmit,
  tripToEdit,
  vehicles = [],
  drivers = [],
  companies = [],
  onAddNewCompany,
  isOwner = false,
}) => {
  const [companyId, setCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [time, setTime] = useState('');
  const [km, setKm] = useState('');
  const [tripAmount, setTripAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [loading, setLoading] = useState(false);

  const getDefaultTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (tripToEdit) {
      setCompanyId(tripToEdit.companyId || '');
      setCompanyName(tripToEdit.companyName || '');
      setIsCustomCompany(!tripToEdit.companyId);
      setTime(tripToEdit.time || '');
      setKm(tripToEdit.km ? tripToEdit.km.toString() : '');
      setTripAmount(tripToEdit.tripAmount ? tripToEdit.tripAmount.toString() : '');
      setNotes(tripToEdit.notes || '');
      setVehicleId(tripToEdit.vehicleId || '');
      setDriverId(tripToEdit.driverId || '');
    } else {
      // If companies available, default to first or blank
      if (companies.length > 0) {
        setCompanyId(companies[0].id);
        setCompanyName(companies[0].name);
        setIsCustomCompany(false);
      } else {
        setCompanyId('');
        setCompanyName('');
        setIsCustomCompany(true);
      }
      setTime(getDefaultTime());
      setKm('');
      setTripAmount('');
      setNotes('');
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : '');
      setDriverId(drivers.length > 0 ? drivers[0].id : '');
    }
  }, [tripToEdit, visible, vehicles, drivers, companies]);

  // Handle company selection
  const handleSelectCompany = (comp: Company) => {
    setCompanyId(comp.id);
    setCompanyName(comp.name);
    setIsCustomCompany(false);

    // Auto-compute trip fare if ratePerKm is set and KM exists
    if (comp.ratePerKm && km && (!tripAmount || tripAmount === '0')) {
      const dist = parseFloat(km);
      if (!isNaN(dist) && dist > 0) {
        setTripAmount(String(Math.round(dist * comp.ratePerKm)));
      }
    }
  };

  // Handle KM change and auto-suggest fare if company has ratePerKm
  const handleKmChange = (val: string) => {
    setKm(val);
    const selectedCompany = companies.find((c) => c.id === companyId);
    if (selectedCompany && selectedCompany.ratePerKm) {
      const dist = parseFloat(val);
      if (!isNaN(dist) && dist > 0) {
        setTripAmount(String(Math.round(dist * selectedCompany.ratePerKm)));
      }
    }
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      Alert.alert('Required', 'Company or client name is required.');
      return;
    }
    if (!time.trim()) {
      Alert.alert('Required', 'Trip start time is required.');
      return;
    }
    if (!km || parseFloat(km) < 0) {
      Alert.alert('Required', 'Please enter a valid trip distance in KM.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        companyId: companyId || undefined,
        companyName: companyName.trim(),
        time: time.trim(),
        km: parseFloat(km),
        tripAmount: tripAmount ? parseFloat(tripAmount) : 0,
        notes: notes.trim() || undefined,
        vehicleId: vehicleId || undefined,
        driverId: isOwner ? (driverId || undefined) : undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save trip log.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCompanyObj = companies.find((c) => c.id === companyId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Navigation size={18} color={theme.colors.primaryContainer} />
              </View>
              <Text style={styles.title}>{tripToEdit ? 'Edit Trip Entry' : 'Log New Trip'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Select Client Company */}
            <View style={styles.companyHeaderRow}>
              <Text style={styles.label}>Client / Business Partner Company</Text>
              {isOwner && onAddNewCompany && (
                <TouchableOpacity
                  style={styles.addCompanyLink}
                  onPress={() => {
                    onClose();
                    onAddNewCompany();
                  }}
                >
                  <Plus size={13} color={theme.colors.primaryContainer} />
                  <Text style={styles.addCompanyLinkText}>New Client</Text>
                </TouchableOpacity>
              )}
            </View>

            {companies.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {companies.map((c) => {
                  const isSelected = !isCustomCompany && companyId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.pill, isSelected && styles.pillActive]}
                      onPress={() => handleSelectCompany(c)}
                    >
                      <Briefcase
                        size={13}
                        color={isSelected ? theme.colors.onPrimary : theme.colors.outline}
                      />
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        {c.name}
                        {c.ratePerKm ? ` (₹${c.ratePerKm}/km)` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.pill, isCustomCompany && styles.pillActive]}
                  onPress={() => {
                    setIsCustomCompany(true);
                    setCompanyId('');
                    if (!tripToEdit) setCompanyName('');
                  }}
                >
                  <Text style={[styles.pillText, isCustomCompany && styles.pillTextActive]}>
                    Custom / Other Client
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Company Name TextInput */}
            <View style={styles.inputWrap}>
              <Building2 size={18} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. CityGlide, Infosys Campus, Tech Park"
                placeholderTextColor={theme.colors.outline}
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  // If user edits text manually, mark as custom or detach companyId if name doesn't match
                  if (selectedCompanyObj && text !== selectedCompanyObj.name) {
                    setCompanyId('');
                    setIsCustomCompany(true);
                  }
                }}
              />
            </View>

            {selectedCompanyObj?.ratePerKm ? (
              <View style={styles.rateHintWrap}>
                <Sparkles size={13} color={theme.colors.tertiaryContainer} />
                <Text style={styles.rateHintText}>
                  Agreed rate with {selectedCompanyObj.name}: ₹{selectedCompanyObj.ratePerKm}/km (auto-calculates fare)
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={[styles.col, { marginRight: 6 }]}>
                <Text style={styles.label}>Trip Time</Text>
                <View style={styles.inputWrap}>
                  <Clock size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="09:30 AM"
                    placeholderTextColor={theme.colors.outline}
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
              </View>

              <View style={[styles.col, { marginLeft: 6 }]}>
                <Text style={styles.label}>Distance (KM)</Text>
                <View style={styles.inputWrap}>
                  <Gauge size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="45.5"
                    placeholderTextColor={theme.colors.outline}
                    value={km}
                    onChangeText={handleKmChange}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Fare / Revenue Amount (₹, Optional)</Text>
            <View style={styles.inputWrap}>
              <IndianRupee size={16} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 1200"
                placeholderTextColor={theme.colors.outline}
                value={tripAmount}
                onChangeText={setTripAmount}
                keyboardType="numeric"
              />
            </View>

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
                <Text style={styles.label}>Assign Driver for Log</Text>
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

            <Text style={styles.label}>Route Notes / Gate Pass (Optional)</Text>
            <View style={[styles.inputWrap, { height: 64, alignItems: 'flex-start', paddingTop: 8 }]}>
              <FileText size={16} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                placeholder="e.g. Shift 1 pickup, toll included"
                placeholderTextColor={theme.colors.outline}
                value={notes}
                onChangeText={setNotes}
                multiline
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
              <Text style={styles.submitBtnText}>{tripToEdit ? 'Save Changes' : 'Confirm Trip'}</Text>
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
    maxHeight: '88%',
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
    maxHeight: 440,
  },
  companyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 6,
  },
  addCompanyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
  },
  addCompanyLinkText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.primaryContainer,
    fontWeight: '700',
  },
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
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
  rateHintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.tertiaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.md,
    marginBottom: 8,
  },
  rateHintText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.tertiaryContainer,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 8,
    backgroundColor: theme.colors.surface,
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
});
