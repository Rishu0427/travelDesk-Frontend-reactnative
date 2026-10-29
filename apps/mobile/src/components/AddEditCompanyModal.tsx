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
import type { Company } from '../types';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';

interface AddEditCompanyModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Company>) => Promise<void>;
  companyToEdit?: Company | null;
}

export const AddEditCompanyModal: React.FC<AddEditCompanyModalProps> = ({
  visible,
  onClose,
  onSubmit,
  companyToEdit,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [ratePerKm, setRatePerKm] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setContactPerson(companyToEdit.contactPerson || '');
      setPhone(companyToEdit.phone || '');
      setEmail(companyToEdit.email || '');
      setAddress(companyToEdit.address || '');
      setGstNumber(companyToEdit.gstNumber || '');
      setRatePerKm(companyToEdit.ratePerKm !== null && companyToEdit.ratePerKm !== undefined ? String(companyToEdit.ratePerKm) : '');
      setNotes(companyToEdit.notes || '');
      setStatus(companyToEdit.status || 'ACTIVE');
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      setRatePerKm('');
      setNotes('');
      setStatus('ACTIVE');
    }
  }, [companyToEdit, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter company or corporate client name.');
      return;
    }

    if (ratePerKm && (isNaN(Number(ratePerKm)) || Number(ratePerKm) < 0)) {
      Alert.alert('Invalid Rate', 'Please enter a valid rate per kilometer.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        ratePerKm: ratePerKm.trim() ? Number(ratePerKm.trim()) : undefined,
        notes: notes.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Building2 size={20} color={theme.colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.title}>
                  {companyToEdit ? 'Edit Client Company' : 'Add Client Company'}
                </Text>
                <Text style={styles.subtitle}>Corporate client providing trip business</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Company Name */}
            <Text style={styles.label}>
              Company / Client Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrap}>
              <Building2 size={18} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. CityGlide, Infosys BPM, Wipro"
                placeholderTextColor={theme.colors.outline}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Contact Person & Phone */}
            <View style={styles.row}>
              <View style={[styles.col, { marginRight: 6 }]}>
                <Text style={styles.label}>Contact Person</Text>
                <View style={styles.inputWrap}>
                  <User size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Anand Verma"
                    placeholderTextColor={theme.colors.outline}
                    value={contactPerson}
                    onChangeText={setContactPerson}
                  />
                </View>
              </View>

              <View style={[styles.col, { marginLeft: 6 }]}>
                <Text style={styles.label}>Phone / Mobile</Text>
                <View style={styles.inputWrap}>
                  <Phone size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="98201 12345"
                    placeholderTextColor={theme.colors.outline}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* Email & Rate Per Km */}
            <View style={styles.row}>
              <View style={[styles.col, { marginRight: 6 }]}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrap}>
                  <Mail size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="transport@client.com"
                    placeholderTextColor={theme.colors.outline}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={[styles.col, { marginLeft: 6 }]}>
                <Text style={styles.label}>Rate per KM (₹)</Text>
                <View style={styles.inputWrap}>
                  <IndianRupee size={16} color={theme.colors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 22"
                    placeholderTextColor={theme.colors.outline}
                    value={ratePerKm}
                    onChangeText={setRatePerKm}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Office Address / Hub */}
            <Text style={styles.label}>Office Address / Pickup Hub</Text>
            <View style={styles.inputWrap}>
              <MapPin size={18} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. CityGlide Hub, Tech Park Gate 3"
                placeholderTextColor={theme.colors.outline}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* GST Number */}
            <Text style={styles.label}>GSTIN / Tax ID (Optional)</Text>
            <View style={styles.inputWrap}>
              <Receipt size={18} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 27AAAAA0000A1Z5"
                placeholderTextColor={theme.colors.outline}
                value={gstNumber}
                onChangeText={setGstNumber}
                autoCapitalize="characters"
              />
            </View>

            {/* Status Selector */}
            <Text style={styles.label}>Partnership Status</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[styles.statusBtn, status === 'ACTIVE' && styles.statusBtnActive]}
                onPress={() => setStatus('ACTIVE')}
              >
                <CheckCircle2
                  size={16}
                  color={status === 'ACTIVE' ? theme.colors.onPrimary : theme.colors.outline}
                />
                <Text
                  style={[
                    styles.statusBtnText,
                    status === 'ACTIVE' && styles.statusBtnTextActive,
                  ]}
                >
                  Active Client
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusBtn, status === 'INACTIVE' && styles.statusBtnInactive]}
                onPress={() => setStatus('INACTIVE')}
              >
                <Clock
                  size={16}
                  color={status === 'INACTIVE' ? theme.colors.error : theme.colors.outline}
                />
                <Text
                  style={[
                    styles.statusBtnText,
                    status === 'INACTIVE' && styles.statusBtnTextInactive,
                  ]}
                >
                  Inactive / Paused
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contract / Route Notes */}
            <Text style={styles.label}>Contract / Route Notes (Optional)</Text>
            <View
              style={[
                styles.inputWrap,
                { height: 72, alignItems: 'flex-start', paddingTop: 8 },
              ]}
            >
              <FileText size={16} color={theme.colors.outline} style={styles.icon} />
              <TextInput
                style={[styles.input, { height: 56, textAlignVertical: 'top' }]}
                placeholder="e.g. Morning shift 08:30 AM, Evening shift 06:00 PM. Monthly billing."
                placeholderTextColor={theme.colors.outline}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {companyToEdit ? 'Save Changes' : 'Register Company'}
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
    maxHeight: '90%',
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
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
    fontSize: 18,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    maxHeight: 440,
  },
  label: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  required: {
    color: theme.colors.error,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceLow,
  },
  statusBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  statusBtnInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  statusBtnText: {
    ...theme.typography.bodyMd,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  statusBtnTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  statusBtnTextInactive: {
    color: theme.colors.error,
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
    fontSize: 16,
  },
});
