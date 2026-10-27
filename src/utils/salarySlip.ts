import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import type { Salary, Driver, DriverSummary } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calculate net payable for a salary
 */
export const calculateNetPayable = (salary: Salary): number => {
  const earnedBase =
    salary.workingDays > 0
      ? (salary.monthlySalary / salary.workingDays) * ((salary.presentDays || 0) + (salary.halfDays || 0) * 0.5)
      : (salary.monthlySalary || 0);
  return Math.max(0, Math.round(earnedBase + (salary.bonus || 0) - (salary.deduction || 0)));
};

/**
 * Format currency in Indian Rupees
 */
export const formatRupee = (val?: number | null): string => {
  const num = typeof val === 'number' ? val : 0;
  return '₹' + num.toLocaleString('en-IN');
};

/**
 * Generate a clean, executive, printable HTML salary slip
 */
export const generateSalarySlipHtml = (salary: Salary, driver?: Driver | DriverSummary | null): string => {
  const driverName = driver?.name || salary.driver?.name || 'Fleet Driver';
  const driverMobile = driver?.mobile || salary.driver?.mobile || 'N/A';
  const driverEmail = driver?.email || salary.driver?.email || 'N/A';
  const licenseNumber = (driver as any)?.licenseNumber || 'N/A';

  const monthName = MONTH_NAMES[salary.month - 1] || `Month ${salary.month}`;
  const year = salary.year;
  const payPeriod = `${monthName} ${year}`;

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

  const paymentStatus = salary.paymentStatus || 'PENDING';
  const statusColor =
    paymentStatus === 'PAID'
      ? '#059669'
      : paymentStatus === 'PARTIALLY_PAID'
      ? '#d97706'
      : '#ba1a1a';
  const statusBg =
    paymentStatus === 'PAID'
      ? '#ecfdf5'
      : paymentStatus === 'PARTIALLY_PAID'
      ? '#fffbeb'
      : '#fef2f2';

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Salary Slip - ${driverName} - ${payPeriod}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: #ffffff;
      color: #191b23;
      padding: 32px;
      font-size: 13px;
      line-height: 1.5;
    }
    .slip-container {
      max-width: 720px;
      margin: 0 auto;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #004ac6, #2563eb);
      color: #ffffff;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .company-sub {
      font-size: 12px;
      opacity: 0.9;
    }
    .slip-badge {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: right;
    }
    .sub-bar {
      background: #f8fafc;
      padding: 12px 28px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #475569;
    }
    .status-pill {
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusColor}40;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 11px;
    }
    .section {
      padding: 20px 28px;
      border-bottom: 1px solid #f1f5f9;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: flex;
      gap: 20px;
    }
    .grid-col {
      flex: 1;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 12.5px;
      border-bottom: 1px dashed #f1f5f9;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 9px 12px;
      font-size: 12.5px;
      border-bottom: 1px solid #f1f5f9;
    }
    .td-num {
      text-align: right;
      font-weight: 600;
    }
    .th-num {
      text-align: right;
    }
    .summary-card {
      background: #fafaf9;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 18px 28px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
    }
    .summary-row.total {
      border-top: 2px solid #cbd5e1;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .summary-row.pending {
      color: #ba1a1a;
      font-weight: 700;
    }
    .summary-row.paid {
      color: #059669;
      font-weight: 700;
    }
    .remarks-box {
      margin: 0 28px 18px 28px;
      padding: 12px 16px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 12px;
      color: #334155;
    }
    .remarks-box strong {
      color: #0f172a;
    }
    .footer {
      padding: 20px 28px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-note {
      font-size: 11px;
      color: #94a3b8;
      max-width: 320px;
    }
    .sign-box {
      text-align: center;
      width: 180px;
    }
    .sign-line {
      border-top: 1px solid #94a3b8;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    @media print {
      body {
        padding: 0;
      }
      .slip-container {
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="company-title">TravelDesk Fleet & Logistics</div>
        <div class="company-sub">Fleet Operations & Driver Payroll Management</div>
      </div>
      <div class="slip-badge">
        Payslip<br />
        <span style="font-size: 14px; font-weight: 800;">${payPeriod}</span>
      </div>
    </div>

    <!-- Sub Bar -->
    <div class="sub-bar">
      <div>Issue Date: <strong>${currentDate}</strong></div>
      <div>Payment Status: <span class="status-pill">${paymentStatus}</span></div>
    </div>

    <!-- Driver & Attendance Info -->
    <div class="section">
      <div class="grid-2">
        <div class="grid-col">
          <div class="section-title">Driver Information</div>
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">${driverName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile</span>
            <span class="info-value">${driverMobile}</span>
          </div>
          <div class="info-row">
            <span class="info-label">License No.</span>
            <span class="info-value">${licenseNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Designation</span>
            <span class="info-value">Fleet Driver</span>
          </div>
        </div>

        <div class="grid-col">
          <div class="section-title">Attendance Summary</div>
          <div class="info-row">
            <span class="info-label">Total Month Days</span>
            <span class="info-value">${workingDays} days</span>
          </div>
          <div class="info-row">
            <span class="info-label">Days Present</span>
            <span class="info-value" style="color: #059669;">${presentDays} days</span>
          </div>
          <div class="info-row">
            <span class="info-label">Half Days</span>
            <span class="info-value" style="color: #d97706;">${halfDays} days</span>
          </div>
          <div class="info-row">
            <span class="info-label">Leaves Taken</span>
            <span class="info-value" style="color: #ba1a1a;">${leaveDays} days</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Earnings & Deductions Table -->
    <div class="section">
      <div class="grid-2">
        <!-- Earnings Col -->
        <div class="grid-col">
          <div class="section-title">Earnings Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="th-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Monthly Base Rate</td>
                <td class="td-num">₹${baseMonthly.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Attendance Earned (${effectivePresent}d)</td>
                <td class="td-num">₹${earnedBase.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Bonus / Incentives</td>
                <td class="td-num" style="color: #059669;">+₹${bonus.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td>Total Gross Earnings</td>
                <td class="td-num">₹${(earnedBase + bonus).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deductions Col -->
        <div class="grid-col">
          <div class="section-title">Deductions Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="th-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Driver Deductibles (Fuel/Toll/Advance)</td>
                <td class="td-num" style="color: #ba1a1a;">-₹${deduction.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Other Fines / Damage</td>
                <td class="td-num">₹0</td>
              </tr>
              <tr>
                <td>&nbsp;</td>
                <td class="td-num">&nbsp;</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td>Total Deductions</td>
                <td class="td-num" style="color: #ba1a1a;">-₹${deduction.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Net Summary -->
    <div class="summary-card">
      <div class="summary-row">
        <span>Gross Earnings</span>
        <span>₹${(earnedBase + bonus).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Total Deductions</span>
        <span style="color: #ba1a1a;">-₹${deduction.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row total">
        <span>Net Payable Compensation</span>
        <span style="color: #004ac6;">₹${grossEarned.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row paid" style="margin-top: 8px;">
        <span>Amount Disbursed / Paid</span>
        <span>₹${salaryPaid.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row pending">
        <span>Remaining Pending Balance</span>
        <span>₹${pendingSalary.toLocaleString('en-IN')}</span>
      </div>
    </div>

    ${
      salary.remarks
        ? `
    <div class="remarks-box">
      <strong>Payment Notes / Remarks:</strong> ${salary.remarks}
    </div>`
        : ''
    }

    <!-- Footer -->
    <div class="footer">
      <div class="footer-note">
        This is a computer-generated salary slip and payment voucher generated via TravelDesk Fleet Portal. For queries, contact fleet administration.
      </div>
      <div class="sign-box">
        <div class="sign-line">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Generate formatted text message for WhatsApp sharing
 */
export const generateSalarySlipTextMessage = (salary: Salary, driver?: Driver | DriverSummary | null): string => {
  const driverName = driver?.name || salary.driver?.name || 'Driver';
  const monthName = MONTH_NAMES[salary.month - 1] || `Month ${salary.month}`;
  const payPeriod = `${monthName} ${salary.year}`;

  const baseMonthly = salary.monthlySalary || 0;
  const workingDays = salary.workingDays || 26;
  const presentDays = salary.presentDays || 0;
  const halfDays = salary.halfDays || 0;
  const effectivePresent = presentDays + halfDays * 0.5;
  const perDay = workingDays > 0 ? baseMonthly / workingDays : 0;
  const earnedBase = Math.round(perDay * effectivePresent);
  const bonus = salary.bonus || 0;
  const deduction = salary.deduction || 0;
  const grossEarned = Math.round(earnedBase + bonus - deduction);
  const salaryPaid = salary.salaryPaid || 0;
  const pendingSalary = Math.max(0, grossEarned - salaryPaid);

  return `📄 *TRAVELDESK FLEET - SALARY SLIP*
━━━━━━━━━━━━━━━━━━━━
👤 *Driver:* ${driverName}
📅 *Period:* ${payPeriod}
📊 *Payment Status:* ${salary.paymentStatus}

💼 *Earnings:*
• Monthly Base Rate: ₹${baseMonthly.toLocaleString('en-IN')}
• Attendance: ${presentDays} present (${effectivePresent}/${workingDays} days)
• Base Earned: ₹${earnedBase.toLocaleString('en-IN')}
${bonus > 0 ? `• Bonus / Allowance: ₹${bonus.toLocaleString('en-IN')}\n` : ''}• *Gross Earnings:* ₹${(earnedBase + bonus).toLocaleString('en-IN')}

✂️ *Deductions:*
• Driver Deductibles: ₹${deduction.toLocaleString('en-IN')}
• *Total Deductions:* ₹${deduction.toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━━━
💰 *Net Payable:* ₹${grossEarned.toLocaleString('en-IN')}
💵 *Amount Paid:* ₹${salaryPaid.toLocaleString('en-IN')}
⏳ *Pending Balance:* ₹${pendingSalary.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━
${salary.remarks ? `📝 *Notes:* ${salary.remarks}\n` : ''}_Generated via TravelDesk Fleet Portal_`;
};

/**
 * Generate and download / share PDF file using expo-print and expo-sharing
 */
export const downloadSalarySlipPdf = async (
  salary: Salary,
  driver?: Driver | DriverSummary | null
): Promise<string> => {
  const html = generateSalarySlipHtml(salary, driver);
  const driverName = (driver?.name || salary.driver?.name || 'driver').replace(/[^a-zA-Z0-9]/g, '_');
  const monthName = MONTH_NAMES[salary.month - 1] || `${salary.month}`;

  if (Platform.OS === 'web') {
    // On web, open print dialog or view
    await Print.printAsync({ html });
    return '';
  }

  // On native mobile (iOS / Android), create a PDF file
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Prompt user to save/download/share via native sharing dialog
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Salary Slip - ${driverName} - ${monthName} ${salary.year}`,
    });
  }

  return uri;
};

/**
 * Share Salary Slip directly to Driver on WhatsApp
 */
export const shareSalarySlipOnWhatsApp = async (
  salary: Salary,
  driver?: Driver | DriverSummary | null
): Promise<void> => {
  const rawMobile = driver?.mobile || salary.driver?.mobile || '';
  let cleanMobile = rawMobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length === 10) {
    cleanMobile = '91' + cleanMobile; // default country code India
  }

  const message = generateSalarySlipTextMessage(salary, driver);
  const encoded = encodeURIComponent(message);

  const nativeWhatsappUrl = cleanMobile
    ? `whatsapp://send?phone=${cleanMobile}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  const webWhatsappUrl = cleanMobile
    ? `https://wa.me/${cleanMobile}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(nativeWhatsappUrl);
    if (supported) {
      await Linking.openURL(nativeWhatsappUrl);
    } else {
      await Linking.openURL(webWhatsappUrl);
    }
  } catch {
    await Linking.openURL(webWhatsappUrl);
  }
};
