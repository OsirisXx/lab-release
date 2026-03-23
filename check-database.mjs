// Database Diagnostic Script (ES Module)
// Run this with: node check-database.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
let supabaseUrl = 'https://yjuxwzdboxtukfbwixoj.supabase.co';
let supabaseKey;

try {
  const envFile = readFileSync('.env', 'utf-8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  // Try .env.local
  try {
    const envFile = readFileSync('.env.local', 'utf-8');
    const lines = envFile.split('\n');
    for (const line of lines) {
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  } catch (err2) {
    console.error('❌ Could not read .env or .env.local file');
    console.log('Please provide your VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
}

if (!supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_ANON_KEY');
  console.log('Please add it to .env or .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Database State...\n');
  console.log(`📡 Supabase URL: ${supabaseUrl}\n`);

  // Check tables exist
  console.log('📋 Checking Tables:');
  const tables = ['user_profiles', 'inventory_items', 'transactions', 'reservations', 'attendance', 'audit_logs', 'rle_guides'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message} (${error.code})`);
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
      console.log(`  ❌ Error: ${error.message} (${error.code})`);
      console.log(`  Details: ${JSON.stringify(error.details)}`);
    } else if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`  ✅ ${user.email} (${user.role}) - ID: ${user.id.slice(0, 8)}...`);
      });
    } else {
      console.log('  ⚠️  No user profiles found!');
      console.log('  This means users signed up but profiles were not created.');
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
      console.log(`  ❌ Error: ${error.message} (${error.code})`);
    } else {
      console.log(`  ✅ Total items: ${count}`);
      if (items && items.length > 0) {
        console.log(`  📝 Sample items:`);
        items.slice(0, 3).forEach(item => {
          console.log(`     - ${item.name} (${item.stock_available}/${item.stock_total} available)`);
        });
        
        // Check for recently added items
        const recent = items.filter(i => {
          const created = new Date(i.created_at);
          const now = new Date();
          return (now - created) < 3600000; // Last hour
        });
        if (recent.length > 0) {
          console.log(`  🆕 Recently added (last hour): ${recent.length} items`);
          recent.forEach(item => {
            console.log(`     - ${item.name} (added ${new Date(item.created_at).toLocaleTimeString()})`);
          });
        }
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
      console.log(`  ❌ Error: ${error.message} (${error.code})`);
      if (error.code === 'PGRST204' || error.code === '42P01') {
        console.log(`  ℹ️  Table 'rle_guides' does not exist. Run 03-rle-guides.sql`);
      }
    } else {
      console.log(`  ✅ Total guides: ${count}`);
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  // Check auth users
  console.log('\n🔐 Checking Auth Users:');
  console.log('  ℹ️  Cannot query auth.users directly from client');
  console.log('  Go to Supabase Dashboard → Authentication → Users to see auth users');

  console.log('\n✅ Diagnostic complete!\n');
  
  console.log('📝 Summary:');
  console.log('  - If tables show 404/PGRST204: Table does not exist, run SQL files');
  console.log('  - If user_profiles is empty: Users exist in auth but not in user_profiles table');
  console.log('  - If inventory_items shows your item: Item was created successfully');
  console.log('  - If 406 errors: User profile missing, need to manually insert or re-signup');
}

checkDatabase().catch(console.error);
