export interface Profile {
  id: string;
  name: string;
  weightUnit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Party {
  id: string;
  name: string;
}

export type GstMode = "standard" | "custom" | "none";

export interface GstConfig {
  enabled: boolean;
  percentage: number;
}

export interface Load {
  id: string;
  loadDate: string; // YYYY-MM-DD
  vehicleNumber: string;
  companyId: string;
  companyName: string;
  partyId: string;
  partyName: string;
  weight: number;
  rate: number;
  driverAdvance: number;
  vehicleRent: number;
  dieselCost: number;
  gstEnabled: boolean;
  gstPercentage: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoadFormValues {
  weight: string;
  vehicleNumber: string;
  companyId: string | null;
  companyName: string;
  partyId: string | null;
  partyName: string;
  rate: string;
  driverAdvance: string;
  vehicleRent: string;
  dieselCost: string;
  gstMode: GstMode;
  customGstPercentage: string;
}

export interface DailySummary {
  loadCount: number;
  totalWeight: number;
  totalBaseAmount: number;
  totalGstAmount: number;
  totalDriverAdvance: number;
  totalVehicleRent: number;
  totalDieselCost: number;
  totalAmount: number;
}

export interface LoadFilters {
  dateFrom?: string;
  dateTo?: string;
  vehicleNumber?: string;
  companyName?: string;
  partyName?: string;
  gst?: "all" | "gst" | "no-gst";
  query?: string;
}
