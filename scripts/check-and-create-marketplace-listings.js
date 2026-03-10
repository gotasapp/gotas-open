const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAndCreateMarketplaceListings() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking if marketplace_listings table exists...');
    
    // Verificar se a tabela marketplace_listings existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'marketplace_listings'
      )
    `);

    const exists = tableExists.rows[0].exists;
    console.log(`📋 Table marketplace_listings exists: ${exists}`);

    if (!exists) {
      console.log('📝 Table does not exist. Running migration...');
      
      // Ler o arquivo de migration
      const migrationPath = path.join(__dirname, '../db/migrations/add_marketplace_listings.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log('⚡ Executing marketplace_listings migration...');
      
      // Executar a migration
      await client.query(migrationSQL);
      
      console.log('✅ Migration completed successfully!');
      
      // Verificar novamente
      const tableExistsAfter = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'marketplace_listings'
        )
      `);
      
      console.log(`🎉 Table now exists: ${tableExistsAfter.rows[0].exists}`);
      
    } else {
      console.log('✅ Table already exists. No migration needed.');
      
      // Mostrar estrutura da tabela
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'marketplace_listings'
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
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

checkAndCreateMarketplaceListings();