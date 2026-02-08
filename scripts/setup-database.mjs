#!/usr/bin/env node
/**
 * Database Setup Script
 * Runs the schema SQL against your Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local is loaded.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read the schema SQL file
const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');

// Split SQL into individual statements
const statements = schemaSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function runSchema() {
  console.log('🍷 WineJourney Database Setup');
  console.log('============================\n');
  console.log(`Connecting to: ${supabaseUrl}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    // Skip empty statements
    if (!statement || statement.length < 5) continue;

    // Get first line for logging
    const firstLine = statement.split('\n')[0].substring(0, 60);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try direct query for simpler statements
        const { error: error2 } = await supabase.from('_exec').select(statement);
        if (error2 && !error2.message.includes('already exists')) {
          console.log(`⚠️  ${firstLine}...`);
          console.log(`   Error: ${error.message}\n`);
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        console.log(`✓ ${firstLine}...`);
        successCount++;
      }
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message?.includes('already exists')) {
        console.log(`⚠️  ${firstLine}...`);
        errorCount++;
      }
    }
  }

  console.log('\n============================');
  console.log(`Setup complete! ✓ ${successCount} | ⚠️ ${errorCount}`);
  console.log('\nNote: Some warnings are expected if tables already exist.');
}

runSchema().catch(console.error);
