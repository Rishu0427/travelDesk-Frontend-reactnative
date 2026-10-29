import { Platform } from 'react-native';

/**
 * Centralized Environment Configuration for TravelDesk Mobile App.
 *
 * Variables prefixed with EXPO_PUBLIC_ are read automatically from .env
 * by Expo CLI at bundle time without requiring third-party libraries.
 */
export const ENV = {
  /**
   * Base API URL (e.g., "http://localhost:8080/api")
   */
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api',

  /**
   * Optional platform override for Android (e.g. "http://10.0.2.2:8080/api" or "http://192.168.31.152:8080/api")
   */
  API_URL_ANDROID: process.env.EXPO_PUBLIC_API_URL_ANDROID,

  /**
   * Runtime environment mode
   */
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
} as const;
