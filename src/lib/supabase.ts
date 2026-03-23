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
          return_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          start_date: string;
          end_date: string;
          status: 'pending' | 'approved' | 'rejected' | 'completed';
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          start_date: string;
          end_date: string;
          status?: 'pending' | 'approved' | 'rejected' | 'completed';
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          start_date?: string;
          end_date?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'completed';
          quantity?: number;
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
