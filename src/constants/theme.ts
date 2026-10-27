/**
 * Material Design 3 / Modern Enterprise Minimalist Theme
 * Directly aligned with /Users/shubham/TravelDesk/design/design.md
 */

export const theme = {
  colors: {
    // Canvas & Surfaces
    background: '#faf8ff',
    onBackground: '#191b23',
    surface: '#ffffff',
    surfaceLow: '#f3f3fe',
    surfaceContainer: '#ededf9',
    surfaceHigh: '#e7e7f3',
    surfaceHighest: '#e1e2ed',
    onSurface: '#191b23',
    onSurfaceVariant: '#434655',
    outline: '#737686',
    outlineVariant: '#c3c6d7',
    borderLight: '#e2e8f0',

    // Primary - Deep Blue / Royal Accent
    primary: '#004ac6',
    primaryContainer: '#2563eb',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#eeefff',
    primaryLight: 'rgba(37, 99, 235, 0.08)',
    primaryBorder: 'rgba(37, 99, 235, 0.25)',

    // Secondary - Emerald / Success
    secondary: '#006c49',
    secondaryContainer: '#6cf8bb',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#00714d',
    secondaryLight: 'rgba(0, 108, 73, 0.12)',

    // Tertiary - Warm Terracotta / Warnings & Accents
    tertiary: '#943700',
    tertiaryContainer: '#bc4800',
    onTertiary: '#ffffff',
    tertiaryLight: 'rgba(188, 72, 0, 0.12)',

    // Error / Destructive
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',
    errorLight: 'rgba(186, 26, 26, 0.12)',

    // Semantic Status Colors
    cng: '#059669',
    cngBg: 'rgba(5, 150, 105, 0.12)',
    petrol: '#2563eb',
    petrolBg: 'rgba(37, 99, 235, 0.12)',
    diesel: '#d97706',
    dieselBg: 'rgba(217, 119, 6, 0.12)',
    ev: '#0284c7',
    evBg: 'rgba(2, 132, 199, 0.12)',
    other: '#7c3aed',
    otherBg: 'rgba(124, 58, 237, 0.12)',

    // Attendance
    present: '#006c49',
    presentBg: 'rgba(0, 108, 73, 0.12)',
    leave: '#ba1a1a',
    leaveBg: 'rgba(186, 26, 26, 0.12)',
    halfDay: '#bc4800',
    halfDayBg: 'rgba(188, 72, 0, 0.12)',

    // Salary Status
    paid: '#006c49',
    paidBg: 'rgba(0, 108, 73, 0.12)',
    partiallyPaid: '#bc4800',
    partiallyPaidBg: 'rgba(188, 72, 0, 0.12)',
    pending: '#ba1a1a',
    pendingBg: 'rgba(186, 26, 26, 0.12)',
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    gutter: 16,
  },

  typography: {
    headlineLgMobile: {
      fontSize: 26,
      fontWeight: '600' as const,
      lineHeight: 34,
    },
    headlineMd: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    headlineSm: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    titleLg: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyLg: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMd: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    labelLg: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    labelMd: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    labelSm: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 14,
    },
  },

  shadows: {
    level1: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    level2: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
    },
  },
};
