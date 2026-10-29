export type Role = 'OWNER' | 'DRIVER' | 'ADMIN';

export type FuelType = 'CNG' | 'PETROL' | 'DIESEL' | 'EV';

export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export type ExpenseCategory = 'CNG' | 'PETROL' | 'DIESEL' | 'OTHER' | 'TOLL' | 'PARKING' | 'MAINTENANCE' | 'DRIVER_EXPENSE';

export type AttendanceType = 'PRESENT' | 'LEAVE' | 'HALF_DAY';

export type SalaryPaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  mobile?: string | null;
  ownerId?: string | null;
}

export interface AuthRequest {
  email: string;
  password: string;
  role?: Role;
}

export interface RegisterOwnerRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  otp?: string;
}

export interface RegisterDriverRequest {
  name: string;
  email: string;
  password: string;
  mobile: string;
  licenseNumber?: string | null;
  otp: string;
  ownerId?: string;
}

export interface SendOtpRequest {
  email: string;
  purpose: 'OWNER_REGISTRATION' | 'DRIVER_REGISTRATION';
  name?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  devOtp?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  role: Role;
  ownerId?: string | null;
  licenseNumber?: string | null;
  status?: DriverStatus | null;
  salary?: number | null;
  assignedVehicleId?: string | null;
  assignedVehicle?: VehicleSummary | null;
  owner?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  stats?: {
    vehicles: number;
    drivers: number;
    trips: number;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  password?: string;
}

export interface DriverSummary {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

export interface VehicleSummary {
  id: string;
  vehicleNumber: string;
  model: string;
  fuelType?: FuelType;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  vehicleNumber: string;
  model: string;
  fuelType: FuelType;
  manufacturer?: string | null;
  assignedDriverId?: string | null;
  assignedDriver?: DriverSummary | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  mobile: string;
  licenseNumber?: string | null;
  salary?: number | null;
  status: DriverStatus;
  assignedVehicleId?: string | null;
  assignedVehicle?: VehicleSummary | null;
  createdAt: string;
  updatedAt?: string;
}

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface CompanySummary {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
}

export interface Company {
  id: string;
  ownerId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  ratePerKm?: number | null;
  notes?: string | null;
  status: CompanyStatus;
  totalTrips?: number;
  totalRevenue?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Trip {
  id: string;
  ownerId: string;
  driverId: string;
  vehicleId?: string | null;
  companyId?: string | null;
  companyName: string;
  time: string;
  km: number;
  tripAmount?: number;
  date: string;
  notes?: string | null;
  driver?: DriverSummary | null;
  vehicle?: VehicleSummary | null;
  company?: CompanySummary | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  ownerId: string;
  driverId?: string | null;
  vehicleId?: string | null;
  category: ExpenseCategory;
  amount: number;
  notes?: string | null;
  driverDeductible?: boolean;
  isDriverDeductible?: boolean;
  date: string;
  driver?: DriverSummary | null;
  vehicle?: VehicleSummary | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  ownerId: string;
  driverId: string;
  driver?: DriverSummary | null;
  date: string;
  type: AttendanceType;
  reason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Salary {
  id: string;
  ownerId: string;
  driverId: string;
  driver?: DriverSummary | null;
  month: number;
  year: number;
  monthlySalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  halfDays: number;
  salaryPaid: number;
  pendingSalary: number;
  bonus: number;
  deduction: number;
  paymentStatus: SalaryPaymentStatus;
  paidDate?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AnalyticsSummary {
  totalExpense: number;
  cngExpense: number;
  petrolExpense: number;
  otherExpense: number;
  driverDeductibleExpense?: number;
  totalTrips: number;
  totalKm: number;
  totalTripAmount: number;
  totalVehicles: number;
  totalDrivers: number;
}

export interface AnalyticsData {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  summary: AnalyticsSummary;
  expenses: Expense[];
  trips: Trip[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}
