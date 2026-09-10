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
  companyId: string | null;
  companyName: string;
  partyId: string | null;
  partyName: string;
  weight: number;
  rate: number;
  companyRate: number;
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
  companyRate: string;
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
  /** Sum of per-load party amounts (paid), GST-inclusive, 0 where party is blank/"Myself". */
  totalPartyAmount: number;
  /** Sum of per-load company amounts (received), GST-inclusive, 0 where company is blank/"Godown". */
  totalCompanyAmount: number;
  totalGstAmount: number;
  totalDriverAdvance: number;
  totalVehicleRent: number;
  totalDieselCost: number;
  totalAmount: number;
}

export type PaymentType = "paid" | "received";

export interface Payment {
  id: string;
  paymentDate: string; // YYYY-MM-DD
  paymentType: PaymentType;
  partyId: string | null;
  partyName: string;
  companyId: string | null;
  companyName: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  partyName?: string;
  companyName?: string;
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
