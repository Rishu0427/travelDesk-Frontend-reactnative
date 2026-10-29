import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Universal confirm action that works reliably across Web (via window.confirm)
 * and Native iOS/Android (via Alert.alert).
 * In React Native Web, Alert.alert is an empty no-op function by default.
 */
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Delete'
) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = window.confirm(text);
    if (ok) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
};

/**
 * Universal alert info dialog that works on Web and Native.
 */
export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = message ? `${title}\n\n${message}` : title;
    window.alert(text);
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Global Alert polyfill for React Native Web.
 * This ensures that standard Alert.alert(...) calls from any component
 * trigger window.alert or window.confirm instead of being silently ignored.
 */
export const setupAlertPolyfill = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      _options?: any
    ) => {
      const fullText = [title, message].filter(Boolean).join('\n\n');

      if (!buttons || buttons.length === 0) {
        window.alert(fullText);
        return;
      }

      if (buttons.length === 1) {
        window.alert(fullText);
        buttons[0]?.onPress?.();
        return;
      }

      const confirmed = window.confirm(fullText);
      if (confirmed) {
        const confirmBtn =
          buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
        confirmBtn?.onPress?.();
      } else {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      }
    };
  }
};
