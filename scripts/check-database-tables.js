const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabaseTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database tables...');
    
    // Listar todas as tabelas
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 All tables in database:');
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });

    // Verificar especificamente tabelas relacionadas a assets
    console.log('\n🎯 Looking for asset-related tables:');
    const assetTables = tablesResult.rows.filter(table => 
      table.table_name.toLowerCase().includes('asset')
    );
    
    if (assetTables.length > 0) {
      assetTables.forEach(table => {
        console.log(`  ✓ Found: ${table.table_name}`);
      });
    } else {
      console.log('  ❌ No tables containing "asset" found');
    }

    // Verificar se marketplace_listings existe
    const marketplaceExists = tablesResult.rows.some(table => 
      table.table_name === 'marketplace_listings'
    );
    console.log(`\n🏪 marketplace_listings exists: ${marketplaceExists}`);

    // Se encontrou tabelas de asset, verificar estrutura
    if (assetTables.length > 0) {
      for (const table of assetTables) {
        console.log(`\n📊 Structure of ${table.table_name}:`);
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        columns.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Verificar se tem dados
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        console.log(`  📦 Total records: ${countResult.rows[0].count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('💥 Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured in .env.local');
  process.exit(1);
}

checkDatabaseTables();