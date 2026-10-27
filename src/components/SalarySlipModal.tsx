import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Salary, Driver, DriverSummary } from '../types';
import {
  downloadSalarySlipPdf,
  shareSalarySlipOnWhatsApp,
  formatRupee,
} from '../utils/salarySlip';
import {
  X,
  Download,
  Share2,
  MessageCircle,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SalarySlipModalProps {
  visible: boolean;
  onClose: () => void;
  salary: Salary | null;
  driver?: Driver | DriverSummary | null;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  visible,
  onClose,
  salary,
  driver,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [sharingWa, setSharingWa] = useState(false);

  if (!salary) return null;

  const driverName = driver?.name || salary.driver?.name || 'Driver';
  const driverMobile = driver?.mobile || salary.driver?.mobile || 'N/A';
  const monthName = MONTH_NAMES[salary.month - 1] || `Month ${salary.month}`;
  const payPeriod = `${monthName} ${salary.year}`;

  const baseMonthly = salary.monthlySalary || 0;
  const workingDays = salary.workingDays || 26;
  const presentDays = salary.presentDays || 0;
  const halfDays = salary.halfDays || 0;
  const leaveDays = salary.leaveDays || 0;

  const perDay = workingDays > 0 ? baseMonthly / workingDays : 0;
  const effectivePresent = presentDays + halfDays * 0.5;
  const earnedBase = Math.round(perDay * effectivePresent);
  const bonus = salary.bonus || 0;
  const deduction = salary.deduction || 0;
  const grossEarned = Math.round(earnedBase + bonus - deduction);
  const salaryPaid = salary.salaryPaid || 0;
  const pendingSalary = Math.max(0, grossEarned - salaryPaid);

  const isPaid = salary.paymentStatus === 'PAID';
  const isPartial = salary.paymentStatus === 'PARTIALLY_PAID';
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

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadSalarySlipPdf(salary, driver);
    } catch (err: any) {
      Alert.alert('PDF Error', err.message || 'Failed to generate PDF salary slip.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setSharingWa(true);
    try {
      await shareSalarySlipOnWhatsApp(salary, driver);
    } catch (err: any) {
      Alert.alert('WhatsApp Error', err.message || 'Failed to open WhatsApp.');
    } finally {
      setSharingWa(false);
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
                <FileText size={18} color={theme.colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.title}>Salary Slip / Voucher</Text>
                <Text style={styles.subtitle}>{payPeriod} • TravelDesk</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Voucher Card Container */}
            <View style={styles.voucherCard}>
              {/* Slip Header Banner */}
              <View style={styles.voucherBanner}>
                <View>
                  <Text style={styles.bannerCompany}>TravelDesk Fleet</Text>
                  <Text style={styles.bannerSub}>Monthly Compensation Voucher</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {salary.paymentStatus}
                  </Text>
                </View>
              </View>

              {/* Driver Details Box */}
              <View style={styles.driverSection}>
                <View style={styles.driverAvatar}>
                  <User size={20} color={theme.colors.primaryContainer} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.driverNameText}>{driverName}</Text>
                  <Text style={styles.driverSubText}>
                    📱 {driverMobile} • 📅 {payPeriod}
                  </Text>
                </View>
              </View>

              {/* Attendance Mini Grid */}
              <View style={styles.attendanceGrid}>
                <View style={styles.attBox}>
                  <Text style={styles.attVal}>{workingDays}</Text>
                  <Text style={styles.attLabel}>Month Days</Text>
                </View>
                <View style={styles.attBox}>
                  <Text style={[styles.attVal, { color: theme.colors.present }]}>
                    {presentDays}
                  </Text>
                  <Text style={styles.attLabel}>Present</Text>
                </View>
                <View style={styles.attBox}>
                  <Text style={[styles.attVal, { color: theme.colors.halfDay }]}>
                    {halfDays}
                  </Text>
                  <Text style={styles.attLabel}>Half Days</Text>
                </View>
                <View style={styles.attBox}>
                  <Text style={[styles.attVal, { color: theme.colors.leave }]}>
                    {leaveDays}
                  </Text>
                  <Text style={styles.attLabel}>Leaves</Text>
                </View>
              </View>

              {/* Earnings & Deductions Breakdown */}
              <View style={styles.breakdownContainer}>
                {/* Earnings List */}
                <View style={styles.breakdownCol}>
                  <Text style={styles.colTitle}>Earnings</Text>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Base Rate</Text>
                    <Text style={styles.lineVal}>{formatRupee(baseMonthly)}</Text>
                  </View>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Earned ({effectivePresent}d)</Text>
                    <Text style={styles.lineVal}>{formatRupee(earnedBase)}</Text>
                  </View>
                  {bonus > 0 && (
                    <View style={styles.lineRow}>
                      <Text style={styles.lineLabel}>Bonus</Text>
                      <Text style={[styles.lineVal, { color: theme.colors.secondary }]}>
                        +{formatRupee(bonus)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.lineRow, styles.totalSubRow]}>
                    <Text style={styles.subTotalLabel}>Gross Earnings</Text>
                    <Text style={styles.subTotalVal}>{formatRupee(earnedBase + bonus)}</Text>
                  </View>
                </View>

                {/* Deductions List */}
                <View style={[styles.breakdownCol, { borderLeftWidth: 1, borderLeftColor: theme.colors.borderLight, paddingLeft: 10 }]}>
                  <Text style={[styles.colTitle, { color: theme.colors.error }]}>Deductions</Text>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Deductibles</Text>
                    <Text style={[styles.lineVal, { color: theme.colors.error }]}>
                      -{formatRupee(deduction)}
                    </Text>
                  </View>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Other Fines</Text>
                    <Text style={styles.lineVal}>₹0</Text>
                  </View>
                  <View style={[styles.lineRow, styles.totalSubRow]}>
                    <Text style={styles.subTotalLabel}>Total Deduct</Text>
                    <Text style={[styles.subTotalVal, { color: theme.colors.error }]}>
                      -{formatRupee(deduction)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Net Payable Highlight Card */}
              <View style={styles.netHighlightCard}>
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Net Payable Salary:</Text>
                  <Text style={styles.netAmount}>{formatRupee(grossEarned)}</Text>
                </View>

                <View style={styles.disburseRow}>
                  <View>
                    <Text style={styles.disburseLabel}>Amount Paid</Text>
                    <Text style={styles.disbursePaid}>{formatRupee(salaryPaid)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.disburseLabel}>Pending Due</Text>
                    <Text style={[styles.disbursePending, pendingSalary > 0 && { color: theme.colors.error }]}>
                      {formatRupee(pendingSalary)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Remarks */}
              {salary.remarks ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Remarks / Notes:</Text>
                  <Text style={styles.remarksContent}>{salary.remarks}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsBar}>
            {/* WhatsApp Share Button */}
            <TouchableOpacity
              style={[styles.whatsappBtn, sharingWa && { opacity: 0.7 }]}
              onPress={handleShareWhatsApp}
              disabled={sharingWa}
              activeOpacity={0.85}
            >
              {sharingWa ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MessageCircle size={18} color="#ffffff" />
                  <Text style={styles.whatsappBtnText}>Send on WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Download PDF Button */}
            <TouchableOpacity
              style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
              onPress={handleDownloadPdf}
              disabled={downloading}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Download size={18} color="#ffffff" />
                  <Text style={styles.downloadBtnText}>Download / Print PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.titleLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.bodyMd,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    maxHeight: 460,
  },
  voucherCard: {
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
    marginBottom: 10,
  },
  voucherBanner: {
    backgroundColor: '#004ac6',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerCompany: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  bannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surfaceLow,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  driverSubText: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  attendanceGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  attBox: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderLight,
  },
  attVal: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  attLabel: {
    ...theme.typography.bodyMd,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  breakdownContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  breakdownCol: {
    flex: 1,
  },
  colTitle: {
    ...theme.typography.labelMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  lineLabel: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  lineVal: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  totalSubRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 4,
    paddingTop: 4,
  },
  subTotalLabel: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  subTotalVal: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  netHighlightCard: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    margin: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
  },
  netLabel: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  netAmount: {
    ...theme.typography.titleLg,
    fontSize: 16,
    fontWeight: '800',
    color: '#004ac6',
  },
  disburseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disburseLabel: {
    ...theme.typography.bodyMd,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  disbursePaid: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  disbursePending: {
    ...theme.typography.titleLg,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  remarksBox: {
    padding: 10,
    backgroundColor: '#fffbeb',
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
  },
  remarksLabel: {
    ...theme.typography.labelMd,
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  remarksContent: {
    ...theme.typography.bodyMd,
    fontSize: 11,
    color: '#78350f',
    marginTop: 2,
  },
  actionsBar: {
    gap: 8,
    marginTop: theme.spacing.md,
  },
  whatsappBtn: {
    height: 48,
    backgroundColor: '#25D366', // Official WhatsApp green
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.level1,
  },
  whatsappBtnText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  downloadBtn: {
    height: 48,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.level1,
  },
  downloadBtnText: {
    ...theme.typography.titleLg,
    fontSize: 14,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
});
