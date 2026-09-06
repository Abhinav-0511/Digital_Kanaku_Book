/**
 * Hand-written to match supabase/migrations/0001_init_schema.sql.
 * Once the project is linked, regenerate with:
 *   supabase gen types typescript --linked > src/types/database.types.ts
 * and reconcile any drift.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          weight_unit: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          weight_unit?: string;
        };
        Update: {
          name?: string;
          weight_unit?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          name_normalized: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          name_normalized: string;
        };
        Update: {
          name?: string;
          name_normalized?: string;
        };
        Relationships: [];
      };
      parties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          name_normalized: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          name_normalized: string;
        };
        Update: {
          name?: string;
          name_normalized?: string;
        };
        Relationships: [];
      };
      loads: {
        Row: {
          id: string;
          user_id: string;
          load_date: string;
          vehicle_number: string;
          vehicle_number_normalized: string;
          company_id: string;
          party_id: string;
          weight: number;
          rate: number;
          driver_advance: number;
          gst_enabled: boolean;
          gst_percentage: number;
          base_amount: number;
          gst_amount: number;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          load_date?: string;
          vehicle_number: string;
          vehicle_number_normalized: string;
          company_id: string;
          party_id: string;
          weight: number;
          rate: number;
          driver_advance?: number;
          gst_enabled?: boolean;
          gst_percentage?: number;
        };
        Update: {
          load_date?: string;
          vehicle_number?: string;
          vehicle_number_normalized?: string;
          company_id?: string;
          party_id?: string;
          weight?: number;
          rate?: number;
          driver_advance?: number;
          gst_enabled?: boolean;
          gst_percentage?: number;
        };
        Relationships: [
          {
            foreignKeyName: "loads_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loads_party_id_fkey";
            columns: ["party_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
