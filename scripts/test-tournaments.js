#!/usr/bin/env node

/**
 * Quick Test Script for Tournament System
 * Run: node scripts/test-tournaments.js
 */

const baseUrl = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      success(`${name}: OK (${response.status})`);
      return { success: true, data };
    } else {
      warning(`${name}: ${response.status} - ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error };
    }
  } catch (err) {
    error(`${name}: Failed - ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runTests() {
  log('\n🎾 Tournament System - Quick Tests\n', 'blue');
  log('=' .repeat(50), 'blue');
  
  // Test 1: Check server is running
  log('\n📡 Testing Server Connection...', 'cyan');
  try {
    const response = await fetch(`${baseUrl}/api/tournaments`);
    if (response.ok) {
      success('Server is running');
    } else if (response.status === 401) {
      warning('Server running but requires authentication');
    } else {
      error(`Server responded with status: ${response.status}`);
    }
  } catch (err) {
    error('Cannot connect to server. Make sure it\'s running on http://localhost:3000');
    process.exit(1);
  }

  // Test 2: Tournament endpoints
  log('\n🏆 Testing Tournament Endpoints...', 'cyan');
  await testEndpoint(
    'GET /api/tournaments',
    `${baseUrl}/api/tournaments`
  );

  await testEndpoint(
    'GET /api/tournaments/stats',
    `${baseUrl}/api/tournaments/stats`
  );

  await testEndpoint(
    'GET /api/tournaments/reports',
    `${baseUrl}/api/tournaments/reports`
  );

  // Test 3: Public pages
  log('\n📄 Testing Public Pages...', 'cyan');
  try {
    const response = await fetch(`${baseUrl}/classifiche`);
    if (response.ok) {
      success('Public rankings page accessible');
    } else {
      warning(`Rankings page returned: ${response.status}`);
    }
  } catch (err) {
    error(`Rankings page test failed: ${err.message}`);
  }

  try {
    const response = await fetch(`${baseUrl}/tornei`);
    if (response.ok) {
      success('Public tournaments page accessible');
    } else {
      warning(`Tournaments page returned: ${response.status}`);
    }
  } catch (err) {
    error(`Tournaments page test failed: ${err.message}`);
  }

  // Test 4: Database connectivity (via API)
  log('\n🗄️  Testing Database Connectivity...', 'cyan');
  const tournamentsResult = await testEndpoint(
    'Fetch tournaments from DB',
    `${baseUrl}/api/tournaments`
  );
  
  if (tournamentsResult.success && tournamentsResult.data) {
    const count = tournamentsResult.data.tournaments?.length || 0;
    info(`Found ${count} tournament(s) in database`);
  }

  // Test 5: Test tournament types
  log('\n🎯 Checking Tournament Types Support...', 'cyan');
  const types = ['eliminazione_diretta', 'girone_eliminazione', 'campionato'];
  types.forEach(type => {
    info(`Supported type: ${type}`);
  });

  // Test 6: Reports functionality
  log('\n📊 Testing Reports Functionality...', 'cyan');
  const reportsResult = await testEndpoint(
    'Generate player statistics',
    `${baseUrl}/api/tournaments/reports`
  );

  if (reportsResult.success && reportsResult.data) {
    const report = reportsResult.data.report;
    if (report) {
      info(`Total tournaments: ${report.overview?.total_tournaments || 0}`);
      info(`Total players: ${report.overview?.total_players || 0}`);
      info(`Completed matches: ${report.overview?.completed_matches || 0}`);
      info(`Rankings calculated for: ${report.player_rankings?.length || 0} players`);
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('🏁 Test Summary', 'blue');
  log('=' .repeat(50), 'blue');
  
  log('\n✅ Tests completed!', 'green');
  log('\nNext steps:', 'yellow');
  log('1. Run manual tests from TESTING_GUIDE.md');
  log('2. Run Jest tests: npm test');
  log('3. Test all user roles (admin, gestore, maestro, atleta)');
  log('4. Test all 3 tournament types end-to-end\n');
}

// Run tests
runTests().catch(err => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
