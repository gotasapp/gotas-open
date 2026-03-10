#!/usr/bin/env node

/**
 * Test Script for NFT Staking Integration
 *
 * This script validates that all staking components are properly integrated
 * Run with: node scripts/test-staking-integration.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

// Test configuration
const tests = [
  {
    name: 'Navigation Integration',
    file: 'src/components/header.tsx',
    checks: [
      {
        description: 'NFT Staking link in navigation',
        pattern: /\{ href: ["']\/nft-staking["'], label: ["']NFT Staking["'] \}/,
        required: true
      }
    ]
  },
  {
    name: 'NFT Card Staking Enhancement',
    file: 'src/components/profile/NFTsTab.tsx',
    checks: [
      {
        description: 'Staking hooks import',
        pattern: /import.*useNFTStakingHook.*from.*['"]@\/hooks\/useNFTStakingHook['"]/,
        required: true
      },
      {
        description: 'Staking status hook import',
        pattern: /import.*useNFTStakingStatus.*from.*['"]@\/hooks\/useNFTStakingHook['"]/,
        required: true
      },
      {
        description: 'Lock/Unlock icons import',
        pattern: /import.*\{ Lock, Unlock.*\}.*from.*['"]lucide-react['"]/,
        required: true
      },
      {
        description: 'Stake handler implementation',
        pattern: /const handleStake = async/,
        required: true
      },
      {
        description: 'Withdraw handler implementation',
        pattern: /const handleWithdraw = async/,
        required: true
      },
      {
        description: 'Auto-approval check',
        pattern: /if \(!isApproved\).*await approve\(\)/s,
        required: true
      },
      {
        description: 'Staking status badge',
        pattern: /Em Stake/,
        required: true
      }
    ]
  },
  {
    name: 'User Profile Sidebar Widget',
    file: 'src/components/ui/user-profile-sidebar.tsx',
    checks: [
      {
        description: 'StakingRewardsWidget import',
        pattern: /import.*StakingRewardsWidget.*from.*['"]@\/components\/staking\/StakingRewardsDisplay['"]/,
        required: true
      },
      {
        description: 'Widget rendering',
        pattern: /<StakingRewardsWidget/,
        required: true
      },
      {
        description: 'Rewards section title',
        pattern: /Recompensas de Stake NFT/,
        required: true
      }
    ]
  },
  {
    name: 'Staking Components Availability',
    file: 'src/components/staking/NFTStakingPanel.tsx',
    checks: [
      {
        description: 'NFTStakingPanel component exists',
        pattern: /export.*function.*NFTStakingPanel/,
        required: true
      }
    ]
  },
  {
    name: 'Staking Page Route',
    file: 'src/app/(protected)/nft-staking/page.tsx',
    checks: [
      {
        description: 'NFT Staking page exists',
        pattern: /export default function NFTStakingPage/,
        required: true
      }
    ]
  },
  {
    name: 'Staking Hooks',
    file: 'src/hooks/useNFTStakingHook.ts',
    checks: [
      {
        description: 'useNFTStakingHook export',
        pattern: /export.*function.*useNFTStakingHook/,
        required: true
      },
      {
        description: 'useNFTStakingStatus export',
        pattern: /export.*function.*useNFTStakingStatus/,
        required: true
      }
    ]
  }
];

// Test runner
function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     NFT Staking Integration Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  tests.forEach(test => {
    console.log(`${colors.yellow}Testing: ${test.name}${colors.reset}`);
    console.log(`File: ${test.file}`);

    const filePath = path.join(process.cwd(), test.file);

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}✗ File not found${colors.reset}\n`);
      failedTests += test.checks.length;
      totalTests += test.checks.length;

      results.push({
        name: test.name,
        file: test.file,
        status: 'failed',
        reason: 'File not found'
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let testPassed = true;
    const failedChecks = [];

    test.checks.forEach(check => {
      totalTests++;
      const passed = check.pattern.test(content);

      if (passed) {
        console.log(`  ${colors.green}✓${colors.reset} ${check.description}`);
        passedTests++;
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${check.description}`);
        failedTests++;
        testPassed = false;
        failedChecks.push(check.description);
      }
    });

    results.push({
      name: test.name,
      file: test.file,
      status: testPassed ? 'passed' : 'failed',
      failedChecks
    });

    console.log('');
  });

  // Summary
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}\n`);

  if (failedTests > 0) {
    console.log(`${colors.red}Failed Components:${colors.reset}`);
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  - ${r.name} (${r.file})`);
        if (r.failedChecks && r.failedChecks.length > 0) {
          r.failedChecks.forEach(check => {
            console.log(`    ${colors.yellow}• ${check}${colors.reset}`);
          });
        } else if (r.reason) {
          console.log(`    ${colors.yellow}• ${r.reason}${colors.reset}`);
        }
      });

    console.log(`\n${colors.red}❌ Integration test failed. Please check the components above.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All integration tests passed successfully!${colors.reset}`);
    console.log(`${colors.green}NFT Staking is fully integrated into the application.${colors.reset}\n`);

    console.log(`${colors.blue}Integration Summary:${colors.reset}`);
    console.log('  1. ✓ NFT Staking added to main navigation');
    console.log('  2. ✓ NFT cards enhanced with staking functionality');
    console.log('  3. ✓ Staking rewards widget added to user profile');
    console.log('  4. ✓ All staking components properly imported');
    console.log('  5. ✓ Auto-approval workflow implemented');
    console.log('  6. ✓ Portuguese localization applied\n');

    console.log(`${colors.blue}Next Steps:${colors.reset}`);
    console.log('  • Start the development server: npm run dev');
    console.log('  • Navigate to /nft-staking to see the full staking interface');
    console.log('  • Check user profile to see NFT cards with staking options');
    console.log('  • View the staking rewards widget in the user sidebar\n');
  }
}

// Run the tests
try {
  runTests();
} catch (error) {
  console.error(`${colors.red}Error running tests: ${error.message}${colors.reset}`);
  process.exit(1);
}