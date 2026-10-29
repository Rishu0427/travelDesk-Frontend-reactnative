import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';
import { api } from '../../api/client';
import type { Attendance, Salary, Driver, AttendanceType, SalaryPaymentStatus, Expense } from '../../types';
import { SalarySlipModal } from '../../components/SalarySlipModal';
import { shareSalarySlipOnWhatsApp } from '../../utils/salarySlip';
import { confirmAction } from '../../utils/alert';
import {
  CalendarCheck,
  BadgeDollarSign,
  Plus,
  Edit2,
  Trash2,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Receipt,
  Check,
  ChevronDown,
  ChevronUp,
  Scissors,
  FileText,
  MessageCircle,
  Download,
  Share2,
} from 'lucide-react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const OwnerAttendanceSalaryScreen: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'attendance' | 'salary'>('attendance');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Attendance states
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceToEdit, setAttendanceToEdit] = useState<Attendance | null>(null);
  const [attDriverId, setAttDriverId] = useState('');
  const [attDate, setAttDate] = useState(now.toISOString().split('T')[0]);
  const [attType, setAttType] = useState<AttendanceType>('PRESENT');
  const [attReason, setAttReason] = useState('');

  // Salary states
  const [salaryList, setSalaryList] = useState<Salary[]>([]);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryToEdit, setSalaryToEdit] = useState<Salary | null>(null);
  const [salDriverId, setSalDriverId] = useState('');
  const [salMonthlySalary, setSalMonthlySalary] = useState('');
  const [salWorkingDays, setSalWorkingDays] = useState('26');
  const [salPresentDays, setSalPresentDays] = useState('26');
  const [salLeaveDays, setSalLeaveDays] = useState('0');
  const [salHalfDays, setSalHalfDays] = useState('0');
  const [salBonus, setSalBonus] = useState('0');
  const [salDeduction, setSalDeduction] = useState('0');
  const [salPaidAmount, setSalPaidAmount] = useState('0');
  const [salRemarks, setSalRemarks] = useState('');

  // Deductibles selection states
  const [deductibleExpenses, setDeductibleExpenses] = useState<Expense[]>([]);
  const [selectedDeductibleIds, setSelectedDeductibleIds] = useState<string[]>([]);
  const [showDeductiblesPicker, setShowDeductiblesPicker] = useState<boolean>(true);
  const [loadingDeductibles, setLoadingDeductibles] = useState<boolean>(false);

  // Salary slip preview & share states
  const [selectedSalaryForSlip, setSelectedSalaryForSlip] = useState<Salary | null>(null);
  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleOpenSalarySlip = (sal: Salary) => {
    setSelectedSalaryForSlip(sal);
    setIsSalarySlipModalOpen(true);
  };

  const handleShareOnWhatsApp = (sal: Salary) => {
    const d = drivers.find((drv) => drv.id === sal.driverId) || sal.driver;
    shareSalarySlipOnWhatsApp(sal, d);
  };

  useEffect(() => {
    if (isSalaryModalOpen && salDriverId) {
      setLoadingDeductibles(true);
      api.getExpenses({ driverId: salDriverId, driverDeductible: true })
        .then((expList) => {
          setDeductibleExpenses(expList);
          // When creating a new salary, initially select ALL deductibles!
          if (!salaryToEdit) {
            const allIds = expList.map((e) => e.id);
            setSelectedDeductibleIds(allIds);
            const total = expList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            setSalDeduction(String(total));
          } else {
            const allIds = expList.map((e) => e.id);
            setSelectedDeductibleIds(allIds);
          }
        })
        .catch(() => {
          setDeductibleExpenses([]);
          setSelectedDeductibleIds([]);
        })
        .finally(() => {
          setLoadingDeductibles(false);
        });
    } else {
      setDeductibleExpenses([]);
      setSelectedDeductibleIds([]);
    }
  }, [isSalaryModalOpen, salDriverId, salaryToEdit]);

  const handleToggleDeductible = (expenseId: string) => {
    let next: string[];
    if (selectedDeductibleIds.includes(expenseId)) {
      next = selectedDeductibleIds.filter((id) => id !== expenseId);
    } else {
      next = [...selectedDeductibleIds, expenseId];
    }
    setSelectedDeductibleIds(next);
    const sum = deductibleExpenses
      .filter((e) => next.includes(e.id))
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    setSalDeduction(String(sum));
  };

  const handleSelectAllDeductibles = () => {
    const allIds = deductibleExpenses.map((e) => e.id);
    setSelectedDeductibleIds(allIds);
    const sum = deductibleExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    setSalDeduction(String(sum));
  };

  const handleDeselectAllDeductibles = () => {
    setSelectedDeductibleIds([]);
    setSalDeduction('0');
  };

  // Load Drivers
  const loadDrivers = async () => {
    try {
      const data = await api.getDrivers();
      setDrivers(data);
    } catch {
      // ignore
    }
  };

  // Load Attendance
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAttendance({
        driverId: selectedDriverId || undefined,
        month: selectedMonth,
        year: selectedYear,
      });
      setAttendanceList(data);
    } catch (err: any) {
      console.warn('Attendance load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDriverId, selectedMonth, selectedYear]);

  // Load Salaries
  const loadSalaries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSalaries({
        driverId: selectedDriverId || undefined,
        month: selectedMonth,
        year: selectedYear,
      });
      setSalaryList(data);
    } catch (err: any) {
      console.warn('Salary load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDriverId, selectedMonth, selectedYear]);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (activeSection === 'attendance') {
      loadAttendance();
    } else {
      loadSalaries();
    }
  }, [activeSection, loadAttendance, loadSalaries]);

  // Attendance Handlers
  const openAddAttendance = () => {
    setAttendanceToEdit(null);
    setAttDriverId(drivers[0]?.id || '');
    setAttDate(new Date().toISOString().split('T')[0]);
    setAttType('PRESENT');
    setAttReason('');
    setIsAttendanceModalOpen(true);
  };

  const openEditAttendance = (att: Attendance) => {
    setAttendanceToEdit(att);
    setAttDriverId(att.driverId);
    setAttDate(att.date);
    setAttType(att.type);
    setAttReason(att.reason || '');
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!attDriverId) {
      Alert.alert('Required', 'Please select a driver.');
      return;
    }
    setSaving(true);
    try {
      if (attendanceToEdit) {
        await api.updateAttendance(attendanceToEdit.id, {
          type: attType,
          reason: attReason || undefined,
        });
      } else {
        await api.markAttendance({
          driverId: attDriverId,
          date: attDate,
          type: attType,
          reason: attReason || undefined,
        });
      }
      setIsAttendanceModalOpen(false);
      loadAttendance();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save attendance record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttendance = (att: Attendance) => {
    confirmAction(
      'Delete Attendance',
      `Delete attendance record for ${att.driver?.name || 'Driver'} on ${att.date}?`,
      async () => {
        try {
          await api.deleteAttendance(att.id);
          loadAttendance();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete record.');
        }
      },
      'Delete'
    );
  };

  // Salary Handlers
  const openAddSalary = () => {
    setSalaryToEdit(null);
    const firstDriver = drivers[0];
    const initialDriverId = firstDriver?.id || '';
    setSalDriverId(initialDriverId);
    setSalMonthlySalary(firstDriver?.salary ? String(firstDriver.salary) : '20000');
    setSalWorkingDays('26');
    setSalPresentDays('26');
    setSalLeaveDays('0');
    setSalHalfDays('0');
    setSalBonus('0');
    setSalDeduction('0');
    setSalPaidAmount('0');
    setSalRemarks('');
    setSelectedDeductibleIds([]);
    setDeductibleExpenses([]);
    setShowDeductiblesPicker(true);
    setIsSalaryModalOpen(true);
  };

  const openEditSalary = (sal: Salary) => {
    setSalaryToEdit(sal);
    setSalDriverId(sal.driverId);
    setSalMonthlySalary(String(sal.monthlySalary || 0));
    setSalWorkingDays(String(sal.workingDays || 26));
    setSalPresentDays(String(sal.presentDays || 0));
    setSalLeaveDays(String(sal.leaveDays || 0));
    setSalHalfDays(String(sal.halfDays || 0));
    setSalBonus(String(sal.bonus || 0));
    setSalDeduction(String(sal.deduction || 0));
    setSalPaidAmount(String(sal.salaryPaid || 0));
    setSalRemarks(sal.remarks || '');
    setShowDeductiblesPicker(true);
    setIsSalaryModalOpen(true);
  };

  const handleDriverChangeForSalary = (driverId: string) => {
    setSalDriverId(driverId);
    const d = drivers.find((drv) => drv.id === driverId);
    if (d?.salary) {
      setSalMonthlySalary(String(d.salary));
    }
    setSelectedDeductibleIds([]);
    setDeductibleExpenses([]);
    setShowDeductiblesPicker(true);
  };

  // Live calculation of salary preview
  const calcBase = parseFloat(salMonthlySalary) || 0;
  const calcWorking = parseFloat(salWorkingDays) || 1;
  const calcPresent = parseFloat(salPresentDays) || 0;
  const calcHalf = parseFloat(salHalfDays) || 0;
  const calcBonus = parseFloat(salBonus) || 0;
  const calcDeduction = parseFloat(salDeduction) || 0;
  const calcPaid = parseFloat(salPaidAmount) || 0;

  const perDay = calcWorking > 0 ? calcBase / calcWorking : 0;
  const effectivePresent = calcPresent + calcHalf * 0.5;
  const grossEarned = Math.round(perDay * effectivePresent + calcBonus - calcDeduction);
  const pendingAmount = Math.max(0, grossEarned - calcPaid);

  const handleSaveSalary = async () => {
    if (!salDriverId) {
      Alert.alert('Required', 'Please select a driver.');
      return;
    }
    setSaving(true);
    try {
      let finalRemarks = salRemarks.trim();
      if (selectedDeductibleIds.length > 0) {
        const deductiblesNote = `${selectedDeductibleIds.length} driver deductibles deducted (₹${calcDeduction})`;
        if (!finalRemarks) {
          finalRemarks = deductiblesNote;
        } else if (!finalRemarks.includes('deductible')) {
          finalRemarks = `${finalRemarks} • ${deductiblesNote}`;
        }
      }

      let savedRecord: Salary;
      if (salaryToEdit) {
        savedRecord = await api.updateSalaryPayment(salaryToEdit.id, {
          monthlySalary: calcBase,
          workingDays: calcWorking,
          presentDays: calcPresent,
          leaveDays: parseFloat(salLeaveDays) || 0,
          halfDays: calcHalf,
          bonus: calcBonus,
          deduction: calcDeduction,
          salaryPaid: calcPaid,
          pendingSalary: pendingAmount,
          remarks: finalRemarks || undefined,
        });
      } else {
        savedRecord = await api.createOrUpdateSalary({
          driverId: salDriverId,
          month: selectedMonth,
          year: selectedYear,
          monthlySalary: calcBase,
          workingDays: calcWorking,
          presentDays: calcPresent,
          leaveDays: parseFloat(salLeaveDays) || 0,
          halfDays: calcHalf,
          salaryPaid: calcPaid,
          bonus: calcBonus,
          deduction: calcDeduction,
          remarks: finalRemarks || undefined,
        });
      }
      setIsSalaryModalOpen(false);
      loadSalaries();

      // Automatically open the Salary Slip modal for the saved payroll!
      const targetDriver = drivers.find((d) => d.id === salDriverId);
      setSelectedSalaryForSlip({
        ...savedRecord,
        driver: targetDriver || savedRecord.driver,
      });
      setIsSalarySlipModalOpen(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save salary record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = (sal: Salary) => {
    confirmAction(
      'Delete Payroll',
      `Delete salary record for ${sal.driver?.name || 'Driver'} for ${MONTH_NAMES[sal.month - 1]}?`,
      async () => {
        try {
          await api.deleteSalary(sal.id);
          loadSalaries();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete record.');
        }
      },
      'Delete'
    );
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar Header (MD3 64px) */}
      <View style={styles.topAppBar}>
        <View>
          <Text style={styles.appBarTitle}>Staff & Payroll</Text>
          <Text style={styles.appBarSubtitle}>
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Overview
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.addFab}
          onPress={activeSection === 'attendance' ? openAddAttendance : openAddSalary}
        >
          <Plus size={18} color={theme.colors.onPrimary} />
          <Text style={styles.addFabText}>
            {activeSection === 'attendance' ? 'Mark Attendance' : 'Process Salary'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control Bar */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'attendance' && styles.segmentBtnActive]}
          onPress={() => setActiveSection('attendance')}
        >
          <CalendarCheck
            size={16}
            color={activeSection === 'attendance' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.segmentText,
              activeSection === 'attendance' && styles.segmentTextActive,
            ]}
          >
            Attendance Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'salary' && styles.segmentBtnActive]}
          onPress={() => setActiveSection('salary')}
        >
          <BadgeDollarSign
            size={16}
            color={activeSection === 'salary' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.segmentText,
              activeSection === 'salary' && styles.segmentTextActive,
            ]}
          >
            Salary Payroll
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month & Driver Filter Ribbon */}
      <View style={styles.filterRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Driver filter */}
          <TouchableOpacity
            style={[styles.filterChip, !selectedDriverId && styles.filterChipActive]}
            onPress={() => setSelectedDriverId('')}
          >
            <Text style={[styles.filterChipText, !selectedDriverId && styles.filterChipTextActive]}>
              All Drivers
            </Text>
          </TouchableOpacity>

          {drivers.map((drv) => (
            <TouchableOpacity
              key={drv.id}
              style={[styles.filterChip, selectedDriverId === drv.id && styles.filterChipActive]}
              onPress={() => setSelectedDriverId(drv.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDriverId === drv.id && styles.filterChipTextActive,
                ]}
              >
                {drv.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
          <Text style={styles.loadingText}>Fetching records...</Text>
        </View>
      ) : activeSection === 'attendance' ? (
        <FlatList
          data={attendanceList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <CalendarCheck size={40} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No Attendance Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Tap the "+ Mark Attendance" button above to log daily presence.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPresent = item.type === 'PRESENT';
            const isHalfDay = item.type === 'HALF_DAY';
            const badgeBg = isPresent
              ? theme.colors.presentBg
              : isHalfDay
              ? theme.colors.halfDayBg
              : theme.colors.leaveBg;
            const badgeColor = isPresent
              ? theme.colors.present
              : isHalfDay
              ? theme.colors.halfDay
              : theme.colors.leave;

            return (
              <View style={styles.recordCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <User size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.driverName}>{item.driver?.name || 'Driver'}</Text>
                    <Text style={styles.dateLabel}>{item.date}</Text>
                  </View>

                  <View style={[styles.chip, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.chipText, { color: badgeColor }]}>{item.type}</Text>
                  </View>
                </View>

                {item.reason ? (
                  <Text style={styles.reasonText}>Note: {item.reason}</Text>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditAttendance(item)}
                  >
                    <Edit2 size={15} color={theme.colors.primaryContainer} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteAttendance(item)}
                  >
                    <Trash2 size={15} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={salaryList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <BadgeDollarSign size={40} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No Payroll Data for this Month</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ Process Salary" to generate calculate and disburse driver compensation.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPaid = item.paymentStatus === 'PAID';
            const isPartial = item.paymentStatus === 'PARTIALLY_PAID';
            const statusBg = isPaid
              ? theme.colors.paidBg
              : isPartial
              ? theme.colors.partiallyPaidBg
              : theme.colors.pendingBg;
            const statusColor = isPaid
              ? theme.colors.paid
              : isPartial
              ? theme.colors.partiallyPaid
              : theme.colors.pending;

            return (
              <View style={styles.recordCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <BadgeDollarSign size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.driverName}>{item.driver?.name || 'Driver'}</Text>
                    <Text style={styles.dateLabel}>
                      Base: ₹{item.monthlySalary.toLocaleString()} • Working: {item.workingDays}d
                    </Text>
                  </View>

                  <View style={[styles.chip, { backgroundColor: statusBg }]}>
                    <Text style={[styles.chipText, { color: statusColor }]}>
                      {item.paymentStatus}
                    </Text>
                  </View>
                </View>

                {/* Days Breakdown Grid */}
                <View style={styles.statsSummaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{item.presentDays}d</Text>
                    <Text style={styles.summaryLabel}>Present</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{item.leaveDays}d</Text>
                    <Text style={styles.summaryLabel}>Leaves</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>₹{item.salaryPaid.toLocaleString()}</Text>
                    <Text style={styles.summaryLabel}>Paid</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                      ₹{item.pendingSalary.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                </View>

                {item.remarks ? (
                  <Text style={styles.reasonText}>Remarks: {item.remarks}</Text>
                ) : null}

                <View style={styles.actionRowSalary}>
                  <TouchableOpacity
                    style={[styles.actionBtnSalary, styles.actionBtnSlip]}
                    onPress={() => handleOpenSalarySlip(item)}
                  >
                    <FileText size={13} color="#ffffff" />
                    <Text style={styles.actionTextSlip}>Salary Slip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnSalary, styles.actionBtnWhatsApp]}
                    onPress={() => handleShareOnWhatsApp(item)}
                  >
                    <MessageCircle size={13} color="#ffffff" />
                    <Text style={styles.actionTextWhatsApp}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSalary}
                    onPress={() => openEditSalary(item)}
                  >
                    <Edit2 size={13} color={theme.colors.primaryContainer} />
                    <Text style={styles.actionTextSalary}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSalary}
                    onPress={() => handleDeleteSalary(item)}
                  >
                    <Trash2 size={13} color={theme.colors.error} />
                    <Text style={[styles.actionTextSalary, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Attendance Modal Sheet */}
      <Modal visible={isAttendanceModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {attendanceToEdit ? 'Edit Attendance' : 'Mark Driver Attendance'}
              </Text>
              <TouchableOpacity onPress={() => setIsAttendanceModalOpen(false)}>
                <X size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Driver Select */}
              <Text style={styles.inputLabel}>Driver</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {drivers.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.driverSelectPill, attDriverId === d.id && styles.driverSelectPillActive]}
                    onPress={() => setAttDriverId(d.id)}
                  >
                    <Text
                      style={[
                        styles.driverSelectText,
                        attDriverId === d.id && styles.driverSelectTextActive,
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date */}
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={attDate}
                onChangeText={setAttDate}
                placeholder="2026-10-16"
              />

              {/* Status Type Segment */}
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.typeSegment}>
                {(['PRESENT', 'HALF_DAY', 'LEAVE'] as AttendanceType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, attType === t && styles.typeBtnActive]}
                    onPress={() => setAttType(t)}
                  >
                    <Text style={[styles.typeText, attType === t && styles.typeTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason */}
              <Text style={styles.inputLabel}>Reason / Remarks (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                value={attReason}
                onChangeText={setAttReason}
                placeholder="e.g. Medical emergency or completed full trip shifts"
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveAttendance}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Save Attendance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Salary Modal Sheet */}
      <Modal visible={isSalaryModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {salaryToEdit ? 'Update Driver Salary' : 'Process Monthly Salary'}
              </Text>
              <TouchableOpacity onPress={() => setIsSalaryModalOpen(false)}>
                <X size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Driver Select */}
              <Text style={styles.inputLabel}>Select Driver</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {drivers.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.driverSelectPill, salDriverId === d.id && styles.driverSelectPillActive]}
                    onPress={() => handleDriverChangeForSalary(d.id)}
                  >
                    <Text
                      style={[
                        styles.driverSelectText,
                        salDriverId === d.id && styles.driverSelectTextActive,
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Base Salary & Working Days */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Base Monthly Salary (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={salMonthlySalary}
                    onChangeText={setSalMonthlySalary}
                    keyboardType="numeric"
                    placeholder="20000"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Total Working Days</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={salWorkingDays}
                    onChangeText={setSalWorkingDays}
                    keyboardType="numeric"
                    placeholder="26"
                  />
                </View>
              </View>

              {/* Present Days & Half Days */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Present Days</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={salPresentDays}
                    onChangeText={setSalPresentDays}
                    keyboardType="numeric"
                    placeholder="26"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Half Days</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={salHalfDays}
                    onChangeText={setSalHalfDays}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              {/* Bonus & Deduction */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Bonus (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={salBonus}
                    onChangeText={setSalBonus}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Deductions (₹)</Text>
                  {deductibleExpenses.length > 0 ? (
                    <TouchableOpacity
                      style={[
                        styles.modalInputTouchable,
                        selectedDeductibleIds.length > 0 && styles.modalInputTouchableHighlight,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setShowDeductiblesPicker((prev) => !prev)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                        <Text style={styles.deductionValueText}>₹{salDeduction || '0'}</Text>
                        <View style={styles.deductiblePillSmall}>
                          <Text style={styles.deductiblePillSmallText}>
                            {selectedDeductibleIds.length}/{deductibleExpenses.length}
                          </Text>
                          {showDeductiblesPicker ? (
                            <ChevronUp size={13} color={theme.colors.error} />
                          ) : (
                            <ChevronDown size={13} color={theme.colors.error} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={styles.modalInput}
                      value={salDeduction}
                      onChangeText={setSalDeduction}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  )}
                </View>
              </View>

              {/* Interactive Driver Deductibles Selection Panel */}
              {loadingDeductibles ? (
                <View style={styles.deductiblesLoadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primaryContainer} />
                  <Text style={styles.deductiblesLoadingText}>Fetching driver deductibles...</Text>
                </View>
              ) : deductibleExpenses.length > 0 ? (
                <View style={styles.deductiblesPanel}>
                  <View style={styles.deductiblesHeaderRow}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
                      activeOpacity={0.7}
                      onPress={() => setShowDeductiblesPicker((prev) => !prev)}
                    >
                      <Scissors size={15} color={theme.colors.error} />
                      <Text style={styles.deductiblesPanelTitle}>Driver Deductibles</Text>
                      <View style={styles.deductibleCountBadge}>
                        <Text style={styles.deductibleCountBadgeText}>
                          {selectedDeductibleIds.length} of {deductibleExpenses.length} selected
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.quickToggleRow}>
                      <TouchableOpacity
                        onPress={handleSelectAllDeductibles}
                        style={styles.quickToggleBtn}
                      >
                        <Text style={styles.quickToggleBtnText}>Select All</Text>
                      </TouchableOpacity>
                      <Text style={{ color: theme.colors.outlineVariant, marginHorizontal: 2 }}>|</Text>
                      <TouchableOpacity
                        onPress={handleDeselectAllDeductibles}
                        style={styles.quickToggleBtn}
                      >
                        <Text style={[styles.quickToggleBtnText, { color: theme.colors.error }]}>Deselect All</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.deductiblesPanelSubtitle}>
                    All deductibles are selected by default. Tap any item below to deselect and exclude it from this salary.
                  </Text>

                  {showDeductiblesPicker ? (
                    <View style={styles.deductibleItemsList}>
                      {deductibleExpenses.map((exp) => {
                        const isSelected = selectedDeductibleIds.includes(exp.id);
                        return (
                          <TouchableOpacity
                            key={exp.id}
                            style={[
                              styles.deductibleCard,
                              isSelected ? styles.deductibleCardSelected : styles.deductibleCardDeselected,
                            ]}
                            activeOpacity={0.75}
                            onPress={() => handleToggleDeductible(exp.id)}
                          >
                            <View style={[styles.deductibleCheckbox, isSelected && styles.deductibleCheckboxSelected]}>
                              {isSelected ? (
                                <Check size={12} color="#ffffff" strokeWidth={3} />
                              ) : null}
                            </View>

                            <View style={{ flex: 1, marginHorizontal: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <View
                                  style={[
                                    styles.categoryBadgeTiny,
                                    exp.category === 'DRIVER_EXPENSE' ? styles.categoryBadgeDriver : styles.categoryBadgeNormal,
                                  ]}
                                >
                                  <Text style={styles.categoryBadgeTinyText}>
                                    {exp.category === 'DRIVER_EXPENSE' ? 'Driver Expense' : exp.category}
                                  </Text>
                                </View>
                                <Text style={styles.deductibleDateText}>{exp.date}</Text>
                              </View>
                              {exp.notes ? (
                                <Text style={styles.deductibleNotesText} numberOfLines={2}>
                                  {exp.notes}
                                </Text>
                              ) : (
                                <Text style={styles.deductibleNotesMuted}>No notes provided</Text>
                              )}
                              <Text
                                style={[
                                  styles.deductibleStatusHint,
                                  isSelected ? { color: theme.colors.error } : { color: theme.colors.outline },
                                ]}
                              >
                                {isSelected ? '✓ Deducting from salary' : '✕ Excluded (will not deduct)'}
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.deductibleAmountText, isSelected && { color: theme.colors.error }]}>
                                ₹{exp.amount.toLocaleString()}
                              </Text>
                              <Text style={styles.deductibleToggleAction}>
                                {isSelected ? 'Tap to exclude' : 'Tap to deduct'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      <View style={styles.deductiblesSummaryBar}>
                        <Text style={styles.deductiblesSummaryText}>
                          Total Deductions Applied:
                        </Text>
                        <Text style={styles.deductiblesSummaryValue}>
                          ₹{salDeduction}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Calculation Summary Box */}
              <View style={styles.calcPreviewCard}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Calculated Gross Earned:</Text>
                  <Text style={styles.calcValueHighlight}>₹{grossEarned.toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Pending Balance:</Text>
                  <Text style={[styles.calcValueHighlight, { color: theme.colors.error }]}>
                    ₹{pendingAmount.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Amount to Pay / Disburse */}
              <Text style={styles.inputLabel}>Amount Paid / Disbursed (₹)</Text>
              <TextInput
                style={styles.modalInput}
                value={salPaidAmount}
                onChangeText={setSalPaidAmount}
                keyboardType="numeric"
                placeholder="Enter paid amount"
              />

              <Text style={styles.inputLabel}>Remarks / Cheque / UPI Ref</Text>
              <TextInput
                style={styles.modalInput}
                value={salRemarks}
                onChangeText={setSalRemarks}
                placeholder="e.g. Paid via UPI Bank Transfer"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveSalary}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm & Save Payroll</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Salary Slip Preview, Download PDF & WhatsApp Modal */}
      <SalarySlipModal
        visible={isSalarySlipModalOpen}
        onClose={() => setIsSalarySlipModalOpen(false)}
        salary={selectedSalaryForSlip}
        driver={
          selectedSalaryForSlip
            ? drivers.find((drv) => drv.id === selectedSalaryForSlip.driverId) || selectedSalaryForSlip.driver
            : null
        }
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
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
    ...theme.shadows.level1,
  },
  segmentText: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  filterRibbon: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryContainer,
  },
  filterChipText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  listContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  emptyCard: {
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
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    ...theme.typography.titleLg,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  dateLabel: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
  },
  chipText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '600',
  },
  reasonText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    backgroundColor: theme.colors.surfaceLow,
    padding: 8,
    borderRadius: theme.radius.sm,
    marginTop: 8,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  summaryLabel: {
    ...theme.typography.labelMd,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
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
  actionRowSalary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionBtnSalary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  actionBtnSlip: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 10,
  },
  actionTextSlip: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  actionBtnWhatsApp: {
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
  },
  actionTextWhatsApp: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  actionTextSalary: {
    ...theme.typography.labelMd,
    fontSize: 11,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
  },
  modalOverlay: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.titleLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  inputLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  driverSelectPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: 6,
  },
  driverSelectPillActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primaryContainer,
  },
  driverSelectText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  driverSelectTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  typeSegment: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceLow,
  },
  typeBtnActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  typeText: {
    ...theme.typography.labelMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  typeTextActive: {
    color: theme.colors.onPrimary,
  },
  rowTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calcPreviewCard: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radius.md,
    padding: 12,
    marginVertical: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  calcLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  calcValueHighlight: {
    ...theme.typography.titleLg,
    fontWeight: '700',
    color: theme.colors.secondary,
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
  modalInputTouchable: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  modalInputTouchableHighlight: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(254, 242, 242, 0.8)',
  },
  deductionValueText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.error,
  },
  deductiblePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  deductiblePillSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.error,
  },
  deductiblesLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginVertical: 4,
  },
  deductiblesLoadingText: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  deductiblesPanel: {
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: theme.radius.md,
    padding: 12,
    marginVertical: 6,
  },
  deductiblesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deductiblesPanelTitle: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  deductibleCountBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  deductibleCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.error,
  },
  quickToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickToggleBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  quickToggleBtnText: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },
  deductiblesPanelSubtitle: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 15,
  },
  deductibleItemsList: {
    gap: 8,
  },
  deductibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
  },
  deductibleCardSelected: {
    backgroundColor: '#ffffff',
    borderColor: theme.colors.error,
    ...theme.shadows.level1,
  },
  deductibleCardDeselected: {
    backgroundColor: '#f8fafc',
    borderColor: theme.colors.borderLight,
    opacity: 0.6,
  },
  deductibleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deductibleCheckboxSelected: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  categoryBadgeTiny: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.full,
  },
  categoryBadgeDriver: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  categoryBadgeNormal: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  categoryBadgeTinyText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  deductibleDateText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  deductibleNotesText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  deductibleNotesMuted: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.outlineVariant,
    fontStyle: 'italic',
  },
  deductibleStatusHint: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  deductibleAmountText: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  deductibleToggleAction: {
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  deductiblesSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 4,
  },
  deductiblesSummaryText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  deductiblesSummaryValue: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
});
