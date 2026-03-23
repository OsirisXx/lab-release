// Database Diagnostic Script
// Run this with: node check-database.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yjuxwzdboxtukfbwixoj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Database State...\n');

  // Check tables exist
  console.log('📋 Checking Tables:');
  const tables = ['user_profiles', 'inventory_items', 'transactions', 'reservations', 'attendance', 'audit_logs', 'rle_guides'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }

  // Check user profiles
  console.log('\n👤 Checking User Profiles:');
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, name, role, created_at');
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`  ✅ ${user.email} (${user.role}) - ID: ${user.id.slice(0, 8)}...`);
      });
    } else {
      console.log('  ⚠️  No user profiles found!');
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  // Check inventory items
  console.log('\n📦 Checking Inventory Items:');
  try {
    const { data: items, error, count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Total items: ${count}`);
      if (items && items.length > 0) {
        console.log(`  📝 Sample items:`);
        items.slice(0, 3).forEach(item => {
          console.log(`     - ${item.name} (${item.stock_available}/${item.stock_total} available)`);
        });
      }
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  // Check RLE guides
  console.log('\n📚 Checking RLE Guides:');
  try {
    const { data: guides, error, count } = await supabase
      .from('rle_guides')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Total guides: ${count}`);
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  // Check RLS policies
  console.log('\n🔒 Checking RLS Status:');
  try {
    const { data, error } = await supabase.rpc('check_rls_status');
    if (error) {
      console.log('  ℹ️  Cannot check RLS (function may not exist)');
    } else {
      console.log('  ✅ RLS check complete');
    }
  } catch (err) {
    console.log('  ℹ️  RLS check not available');
  }

  console.log('\n✅ Diagnostic complete!\n');
}

checkDatabase().catch(console.error);
