import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'ci' | 'sa';
          ci_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role: 'ci' | 'sa';
          ci_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'ci' | 'sa';
          ci_id?: string | null;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          category: 'consumable' | 'non-consumable';
          unit: string;
          stock_total: number;
          stock_available: number;
          condition: 'Good' | 'Defective' | 'Mixed';
          location: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'consumable' | 'non-consumable';
          unit: string;
          stock_total: number;
          stock_available: number;
          condition: 'Good' | 'Defective' | 'Mixed';
          location: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'consumable' | 'non-consumable';
          unit?: string;
          stock_total?: number;
          stock_available?: number;
          condition?: 'Good' | 'Defective' | 'Mixed';
          location?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          type: 'borrow' | 'return' | 'reserve';
          status: 'pending' | 'approved' | 'returned' | 'overdue' | 'rejected';
          quantity: number;
          borrow_date: string;
          due_date: string;
          due_at: string;
          reservation_id: string | null;
          stock_deducted: boolean;
          return_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          type: 'borrow' | 'return' | 'reserve';
          status?: 'pending' | 'approved' | 'returned' | 'overdue' | 'rejected';
          quantity: number;
          borrow_date: string;
          due_date: string;
          reservation_id?: string | null;
          stock_deducted?: boolean;
          due_at?: string;
          return_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          type?: 'borrow' | 'return' | 'reserve';
          status?: 'pending' | 'approved' | 'returned' | 'overdue' | 'rejected';
          quantity?: number;
          borrow_date?: string;
          due_date?: string;
          due_at?: string;
          reservation_id?: string | null;
          stock_deducted?: boolean;
          return_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      extension_requests: {
        Row: {
          id: string;
          transaction_id: string;
          requested_by: string;
          reviewed_by: string | null;
          requested_days: 1;
          reason: string | null;
          status: 'pending' | 'approved' | 'rejected';
          requested_at: string;
          reviewed_at: string | null;
          review_note: string | null;
          previous_due_date: string | null;
          previous_due_at: string | null;
          approved_due_date: string | null;
          approved_due_at: string | null;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          requested_by: string;
          reviewed_by?: string | null;
          requested_days?: 1;
          reason?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_at?: string | null;
          review_note?: string | null;
          previous_due_date?: string | null;
          previous_due_at?: string | null;
          approved_due_date?: string | null;
          approved_due_at?: string | null;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          requested_by?: string;
          reviewed_by?: string | null;
          requested_days?: 1;
          reason?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_at?: string | null;
          review_note?: string | null;
          previous_due_date?: string | null;
          previous_due_at?: string | null;
          approved_due_date?: string | null;
          approved_due_at?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          start_date: string;
          end_date: string;
          status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired' | 'failed';
          quantity: number;
          stock_held_quantity: number;
          issued_transaction_id: string | null;
          issued_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          start_date: string;
          end_date: string;
          status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired' | 'failed';
          quantity: number;
          stock_held_quantity?: number;
          issued_transaction_id?: string | null;
          issued_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          start_date?: string;
          end_date?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired' | 'failed';
          quantity?: number;
          stock_held_quantity?: number;
          issued_transaction_id?: string | null;
          issued_at?: string | null;
          created_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          time_in: string;
          time_out: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          time_in: string;
          time_out?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          time_in?: string;
          time_out?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          details: string;
          category: 'inventory' | 'transaction' | 'user' | 'system';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          details: string;
          category: 'inventory' | 'transaction' | 'user' | 'system';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          details?: string;
          category?: 'inventory' | 'transaction' | 'user' | 'system';
          created_at?: string;
        };
      };
    };
  };
};
