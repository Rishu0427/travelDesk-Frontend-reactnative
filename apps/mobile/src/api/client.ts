import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { ENV } from '../constants/env';
import type {
  User,
  Vehicle,
  Driver,
  Expense,
  Trip,
  AnalyticsData,
  Role,
  Attendance,
  Salary,
  Company,
  UserProfile,
  UpdateProfileRequest,
} from '../types';

export const getDefaultHost = (): string => {
  // 1. Android-specific explicit override from .env
  if (Platform.OS === 'android' && ENV.API_URL_ANDROID) {
    return ENV.API_URL_ANDROID;
  }

  // 2. Base API URL from .env
  if (ENV.API_URL) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location?.hostname) {
        if (ENV.API_URL.includes('localhost') && window.location.hostname !== 'localhost') {
          return `${window.location.protocol}//${window.location.hostname}:8080/api`;
        }
      }
      return ENV.API_URL;
    }

    // On Android, if the URL contains localhost, map to 10.0.2.2 or Metro host
    if (Platform.OS === 'android' && ENV.API_URL.includes('localhost')) {
      try {
        const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
        if (scriptURL) {
          const match = scriptURL.match(/https?:\/\/([^:\/]+)/);
          if (match && match[1]) {
            const host = match[1];
            if (host !== 'localhost' && host !== '127.0.0.1') {
              return `http://${host}:8080/api`;
            }
          }
        }
      } catch {
        // fallback
      }
      return ENV.API_URL.replace('localhost', '10.0.2.2');
    }

    return ENV.API_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }
  return 'http://localhost:8080/api';
};

class ApiClient {
  async getBaseUrl(): Promise<string> {
    try {
      const customHost = await AsyncStorage.getItem('fleet_custom_host');
      if (customHost && customHost.trim().length > 0) {
        return customHost.trim();
      }
    } catch {
      // fallback
    }
    return getDefaultHost();
  }

  async setCustomHost(host: string) {
    if (host && host.trim().length > 0) {
      await AsyncStorage.setItem('fleet_custom_host', host.trim());
    } else {
      await AsyncStorage.removeItem('fleet_custom_host');
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('fleet_access_token');
    return {
      'Content-Type': 'application/json',
      'X-Client-Platform': Platform.OS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const headers = await this.getHeaders();

    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Connection timed out (${baseUrl}). Check that backend server is running and reachable.`);
      }
      throw new Error(`Network request failed (${url}). Is the backend server running?`);
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        await AsyncStorage.removeItem('fleet_access_token');
        await AsyncStorage.removeItem('fleet_user');
      }
      const error: any = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.errorType = data.errorType;
      error.field = data.field;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // Auth
  async sendOtp(data: { email: string; purpose: 'OWNER_REGISTRATION' | 'DRIVER_REGISTRATION'; name?: string }) {
    return this.request<{ success: boolean; message: string; devOtp?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerOwner(userData: { name: string; email: string; password: string; phone?: string; otp?: string }) {
    const res = await this.request<{
      id: string;
      name: string;
      email: string;
      accessToken?: string;
      refreshToken?: string;
      user?: User;
    }>('/auth/register-owner', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (res.accessToken && res.user) {
      await AsyncStorage.setItem('fleet_access_token', res.accessToken);
      await AsyncStorage.setItem('fleet_user', JSON.stringify(res.user));
    }
    return res;
  }

  async registerDriver(userData: {
    name: string;
    email: string;
    password: string;
    mobile: string;
    licenseNumber?: string | null;
    otp?: string;
    ownerId?: string;
  }) {
    const res = await this.request<{
      id: string;
      name: string;
      email: string;
      accessToken?: string;
      refreshToken?: string;
      user?: User;
    }>('/auth/register-driver', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (res.accessToken && res.user) {
      await AsyncStorage.setItem('fleet_access_token', res.accessToken);
      await AsyncStorage.setItem('fleet_user', JSON.stringify(res.user));
    }
    return res;
  }

  async login(credentials: { email: string; password: string; role: Role }) {
    const res = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...credentials,
        clientPlatform: Platform.OS,
      }),
    });

    await AsyncStorage.setItem('fleet_access_token', res.accessToken);
    await AsyncStorage.setItem('fleet_user', JSON.stringify(res.user));
    return res;
  }

  async logout() {
    await AsyncStorage.removeItem('fleet_access_token');
    await AsyncStorage.removeItem('fleet_user');
  }

  async getSavedUser(): Promise<User | null> {
    const userJson = await AsyncStorage.getItem('fleet_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>('/vehicles');
  }

  async createVehicle(data: Partial<Vehicle> & { assignedDriverId?: string | null }): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: Partial<Vehicle> & { assignedDriverId?: string | null }): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  // Drivers
  async getDrivers(status?: 'ACTIVE' | 'INACTIVE'): Promise<Driver[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<Driver[]>(`/drivers${query}`);
  }

  async createDriver(data: any): Promise<Driver> {
    return this.request<Driver>('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDriver(id: string, data: any): Promise<Driver> {
    return this.request<Driver>(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/drivers/${id}`, {
      method: 'DELETE',
    });
  }

  // Expenses
  async getExpenses(query?: {
    filterType?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    vehicleId?: string;
    driverId?: string;
    driverDeductible?: boolean | string;
  }): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Expense[]>(`/expenses${queryString}`);
  }

  async createExpense(data: {
    category: string;
    amount: number;
    notes?: string;
    vehicleId?: string;
    driverId?: string;
    date?: string;
    driverDeductible?: boolean;
    isDriverDeductible?: boolean;
  }): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Companies
  async getCompanies(query?: { status?: string; search?: string }): Promise<Company[]> {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Company[]>(`/companies${queryString}`);
  }

  async getCompany(id: string): Promise<Company> {
    return this.request<Company>(`/companies/${id}`);
  }

  async createCompany(data: Partial<Company>): Promise<Company> {
    return this.request<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    return this.request<Company>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Trips
  async getTrips(query?: {
    filterType?: string;
    startDate?: string;
    endDate?: string;
    companyName?: string;
    companyId?: string;
    vehicleId?: string;
    driverId?: string;
  }): Promise<Trip[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Trip[]>(`/trips${queryString}`);
  }

  async createTrip(data: {
    companyName: string;
    companyId?: string;
    time: string;
    km: number;
    tripAmount?: number;
    notes?: string;
    vehicleId?: string;
    driverId?: string;
    date?: string;
  }): Promise<Trip> {
    return this.request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
    return this.request<Trip>(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrip(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/trips/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalysis(period: 'daily' | 'weekly' | 'monthly' = 'daily', refDate?: string): Promise<AnalyticsData> {
    const params = new URLSearchParams({ period });
    if (refDate) params.append('refDate', refDate);
    return this.request<AnalyticsData>(`/analytics?${params.toString()}`);
  }

  // Attendance
  async getAttendance(query?: {
    driverId?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim().length > 0) {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Attendance[]>(`/attendance${qs}`);
  }

  async markAttendance(data: {
    driverId: string;
    date: string;
    type: string;
    reason?: string;
  }): Promise<Attendance> {
    return this.request<Attendance>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAttendance(id: string, data: { type?: string; reason?: string }): Promise<Attendance> {
    return this.request<Attendance>(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAttendance(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/attendance/${id}`, {
      method: 'DELETE',
    });
  }

  // Salaries
  async getSalaries(query?: {
    driverId?: string;
    month?: number;
    year?: number;
    paymentStatus?: string;
  }): Promise<Salary[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim().length > 0) {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Salary[]>(`/salaries${qs}`);
  }

  async createOrUpdateSalary(data: {
    driverId: string;
    month: number;
    year: number;
    monthlySalary: number;
    workingDays?: number;
    presentDays?: number;
    leaveDays?: number;
    halfDays?: number;
    salaryPaid?: number;
    bonus?: number;
    deduction?: number;
    remarks?: string;
    paidDate?: string;
  }): Promise<Salary> {
    return this.request<Salary>('/salaries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSalaryPayment(id: string, data: Partial<Salary> & { salaryPaid?: number }): Promise<Salary> {
    return this.request<Salary>(`/salaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSalary(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/salaries/${id}`, {
      method: 'DELETE',
    });
  }

  // Profile
  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/profile');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
    profile: UserProfile;
  }> {
    const res = await this.request<{
      message: string;
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      profile: UserProfile;
    }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (res.accessToken) {
      await AsyncStorage.setItem('fleet_access_token', res.accessToken);
    }
    if (res.user) {
      await AsyncStorage.setItem('fleet_user', JSON.stringify(res.user));
    }

    return res;
  }
}

export const api = new ApiClient();
