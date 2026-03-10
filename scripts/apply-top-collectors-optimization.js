#!/usr/bin/env node

/**
 * Script to apply Top Collectors query optimization
 * Run with: node scripts/apply-top-collectors-optimization.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

async function checkTableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function checkIndexExists(indexName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM pg_indexes
      WHERE indexname = $1
    )
  `, [indexName]);
  return result.rows[0].exists;
}

async function executeSQL(sql, description) {
  try {
    console.log(`\n📦 ${description}...`);
    const startTime = Date.now();
    await pool.query(sql);
    const duration = Date.now() - startTime;
    console.log(`✅ Completed in ${duration}ms`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function applyOptimization() {
  console.log('🚀 Starting Top Collectors Query Optimization\n');
  console.log('=' .repeat(50));

  try {
    // Check current performance (baseline)
    console.log('\n📊 Testing current query performance...');
    const baselineStart = Date.now();
    const baselineResult = await pool.query(`
      SELECT
        u.id,
        u.wallet_address,
        SUM(CASE
          WHEN n.rarity::TEXT = 'legendary' THEN 10
          WHEN n.rarity::TEXT = 'epic' THEN 2
          WHEN n.rarity::TEXT = 'common' THEN 1
          ELSE 0
        END) AS total_points
      FROM users u
      JOIN userassetclaims uac ON u.id = uac.user_id
      JOIN nfts n ON uac.nft_id = n.id
      WHERE n.status = 'active'
      GROUP BY u.id, u.wallet_address
      HAVING SUM(CASE
        WHEN n.rarity::TEXT = 'legendary' THEN 10
        WHEN n.rarity::TEXT = 'epic' THEN 2
        WHEN n.rarity::TEXT = 'common' THEN 1
        ELSE 0
      END) > 0
      ORDER BY total_points DESC
      LIMIT 10
    `);
    const baselineTime = Date.now() - baselineStart;
    console.log(`⏱️  Baseline query time: ${baselineTime}ms`);

    // Phase 1: Create indexes
    console.log('\n📚 Phase 1: Creating Indexes');
    console.log('-'.repeat(30));

    // Check and create indexes
    const indexes = [
      {
        name: 'idx_userassetclaims_user_nft',
        sql: `CREATE INDEX IF NOT EXISTS idx_userassetclaims_user_nft
              ON userassetclaims(user_id, nft_id)
              WHERE burned_at IS NULL`,
        description: 'Composite index for userassetclaims'
      },
      {
        name: 'idx_nfts_status_rarity',
        sql: `CREATE INDEX IF NOT EXISTS idx_nfts_status_rarity
              ON nfts(status, rarity)
              WHERE status = 'active'`,
        description: 'Partial index for active NFTs'
      },
      {
        name: 'idx_users_profile_data',
        sql: `CREATE INDEX IF NOT EXISTS idx_users_profile_data
              ON users(id, wallet_address, display_name, profile_image_url, username, created_at)`,
        description: 'Covering index for user data'
      }
    ];

    for (const index of indexes) {
      const exists = await checkIndexExists(index.name);
      if (exists) {
        console.log(`⏭️  ${index.name} already exists, skipping...`);
      } else {
        await executeSQL(index.sql, index.description);
      }
    }

    // Phase 2: Create summary table
    console.log('\n📊 Phase 2: Creating Summary Table');
    console.log('-'.repeat(30));

    const summaryTableExists = await checkTableExists('user_points_summary');

    if (summaryTableExists) {
      console.log('⏭️  Summary table already exists, skipping creation...');
    } else {
      // Create summary table
      await executeSQL(`
        CREATE TABLE user_points_summary (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          wallet_address VARCHAR(42) NOT NULL,
          display_name VARCHAR(255),
          profile_image_url TEXT,
          username VARCHAR(255),
          created_at TIMESTAMP,
          total_points INTEGER DEFAULT 0,
          total_cards INTEGER DEFAULT 0,
          legendary_count INTEGER DEFAULT 0,
          epic_count INTEGER DEFAULT 0,
          common_count INTEGER DEFAULT 0,
          last_claim_date TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, 'Creating summary table');

      // Create index for ranking
      await executeSQL(`
        CREATE INDEX idx_user_points_summary_ranking
        ON user_points_summary(total_points DESC, created_at ASC)
        WHERE total_points > 0
      `, 'Creating ranking index');

      // Create update function
      await executeSQL(`
        CREATE OR REPLACE FUNCTION update_user_points_summary(p_user_id INTEGER)
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        DECLARE
          v_user_data RECORD;
          v_points_data RECORD;
        BEGIN
          SELECT wallet_address, display_name, profile_image_url, username, created_at
          INTO v_user_data
          FROM users
          WHERE id = p_user_id;

          SELECT
            COALESCE(SUM(CASE n.rarity::TEXT
              WHEN 'legendary' THEN 10
              WHEN 'epic' THEN 2
              WHEN 'common' THEN 1
              ELSE 0
            END), 0) AS total_points,
            COUNT(DISTINCT uac.id) as total_cards,
            COUNT(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 END) as legendary_count,
            COUNT(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 END) as epic_count,
            COUNT(CASE WHEN n.rarity::TEXT = 'common' THEN 1 END) as common_count,
            MAX(uac.claimed_at) as last_claim_date
          INTO v_points_data
          FROM userassetclaims uac
          JOIN nfts n ON uac.nft_id = n.id
          WHERE uac.user_id = p_user_id
            AND uac.burned_at IS NULL
            AND n.status = 'active';

          INSERT INTO user_points_summary (
            user_id, wallet_address, display_name, profile_image_url, username, created_at,
            total_points, total_cards, legendary_count, epic_count, common_count,
            last_claim_date, updated_at
          ) VALUES (
            p_user_id, v_user_data.wallet_address, v_user_data.display_name,
            v_user_data.profile_image_url, v_user_data.username, v_user_data.created_at,
            v_points_data.total_points, v_points_data.total_cards,
            v_points_data.legendary_count, v_points_data.epic_count, v_points_data.common_count,
            v_points_data.last_claim_date, CURRENT_TIMESTAMP
          )
          ON CONFLICT (user_id) DO UPDATE SET
            wallet_address = EXCLUDED.wallet_address,
            display_name = EXCLUDED.display_name,
            profile_image_url = EXCLUDED.profile_image_url,
            username = EXCLUDED.username,
            total_points = EXCLUDED.total_points,
            total_cards = EXCLUDED.total_cards,
            legendary_count = EXCLUDED.legendary_count,
            epic_count = EXCLUDED.epic_count,
            common_count = EXCLUDED.common_count,
            last_claim_date = EXCLUDED.last_claim_date,
            updated_at = CURRENT_TIMESTAMP;
        END;
        $$
      `, 'Creating update function');

      // Create trigger function
      await executeSQL(`
        CREATE OR REPLACE FUNCTION trigger_update_user_points()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            PERFORM update_user_points_summary(NEW.user_id);
          ELSIF TG_OP = 'DELETE' THEN
            PERFORM update_user_points_summary(OLD.user_id);
          END IF;
          RETURN NEW;
        END;
        $$
      `, 'Creating trigger function');

      // Create trigger
      await executeSQL(`
        DROP TRIGGER IF EXISTS trg_update_user_points ON userassetclaims;
        CREATE TRIGGER trg_update_user_points
        AFTER INSERT OR UPDATE OR DELETE ON userassetclaims
        FOR EACH ROW
        EXECUTE FUNCTION trigger_update_user_points()
      `, 'Creating update trigger');
    }

    // Phase 3: Populate summary table
    console.log('\n📝 Phase 3: Populating Summary Table');
    console.log('-'.repeat(30));

    const countResult = await pool.query('SELECT COUNT(*) FROM user_points_summary');
    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount > 0) {
      console.log(`ℹ️  Summary table already has ${currentCount} records`);
      console.log('Do you want to rebuild? This will take a few seconds.');
      // In a real script, you'd prompt for confirmation here
    }

    console.log('Populating summary table with existing data...');
    const populateStart = Date.now();

    await pool.query(`
      INSERT INTO user_points_summary (
        user_id, wallet_address, display_name, profile_image_url, username, created_at,
        total_points, total_cards, legendary_count, epic_count, common_count, last_claim_date
      )
      SELECT
        u.id,
        u.wallet_address,
        u.display_name,
        u.profile_image_url,
        u.username,
        u.created_at,
        COALESCE(SUM(CASE n.rarity::TEXT
          WHEN 'legendary' THEN 10
          WHEN 'epic' THEN 2
          WHEN 'common' THEN 1
          ELSE 0
        END), 0) AS total_points,
        COUNT(DISTINCT uac.id) as total_cards,
        COUNT(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 END) as legendary_count,
        COUNT(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 END) as epic_count,
        COUNT(CASE WHEN n.rarity::TEXT = 'common' THEN 1 END) as common_count,
        MAX(uac.claimed_at) as last_claim_date
      FROM users u
      LEFT JOIN userassetclaims uac ON u.id = uac.user_id AND uac.burned_at IS NULL
      LEFT JOIN nfts n ON uac.nft_id = n.id AND n.status = 'active'
      GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        total_cards = EXCLUDED.total_cards,
        legendary_count = EXCLUDED.legendary_count,
        epic_count = EXCLUDED.epic_count,
        common_count = EXCLUDED.common_count,
        last_claim_date = EXCLUDED.last_claim_date,
        updated_at = CURRENT_TIMESTAMP
    `);

    const populateTime = Date.now() - populateStart;
    console.log(`✅ Summary table populated in ${populateTime}ms`);

    // Phase 4: Test optimized performance
    console.log('\n🏁 Phase 4: Performance Comparison');
    console.log('-'.repeat(30));

    // Test with summary table
    const optimizedStart = Date.now();
    const optimizedResult = await pool.query(`
      SELECT *
      FROM user_points_summary
      WHERE total_points > 0
      ORDER BY total_points DESC, created_at ASC
      LIMIT 10
    `);
    const optimizedTime = Date.now() - optimizedStart;

    // Display results
    console.log('\n📈 Performance Results:');
    console.log('=' .repeat(50));
    console.log(`Original Query Time: ${baselineTime}ms`);
    console.log(`Optimized Query Time: ${optimizedTime}ms`);
    console.log(`Improvement: ${Math.round((1 - optimizedTime/baselineTime) * 100)}%`);
    console.log(`Speed Increase: ${Math.round(baselineTime/optimizedTime)}x faster`);

    // Update API endpoint
    console.log('\n🔄 Phase 5: Updating API Endpoint');
    console.log('-'.repeat(30));

    const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'top-collectors', 'route.ts');
    const backupPath = path.join(__dirname, '..', 'src', 'app', 'api', 'top-collectors', 'route.backup.ts');
    const optimizedPath = path.join(__dirname, '..', 'src', 'app', 'api', 'top-collectors', 'route-final.ts');

    if (fs.existsSync(optimizedPath)) {
      // Backup original file
      if (fs.existsSync(routePath) && !fs.existsSync(backupPath)) {
        fs.copyFileSync(routePath, backupPath);
        console.log('✅ Original route backed up to route.backup.ts');
      }

      // Copy optimized version
      fs.copyFileSync(optimizedPath, routePath);
      console.log('✅ API endpoint updated with optimized version');
    } else {
      console.log('⚠️  Optimized route file not found, please update manually');
    }

    console.log('\n✨ Optimization Complete!');
    console.log('=' .repeat(50));
    console.log('\n📝 Next Steps:');
    console.log('1. Test the /api/top-collectors endpoint');
    console.log('2. Monitor performance with the admin dashboard');
    console.log('3. Clear cache if needed: DELETE /api/top-collectors');

  } catch (error) {
    console.error('\n❌ Error during optimization:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the optimization
applyOptimization();