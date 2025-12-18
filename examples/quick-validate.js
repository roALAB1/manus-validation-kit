#!/usr/bin/env node
/**
 * Manus Validation Kit - Quick Validation Script
 * 
 * A simple, copy-paste-ready script to run validation from any Node.js project.
 * 
 * Usage:
 *   node quick-validate.js
 *   node quick-validate.js --json
 *   node quick-validate.js --ci
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputJson: process.argv.includes('--json'),
  ciMode: process.argv.includes('--ci'),
  reportsDir: '.validation/reports',
};

// Ensure reports directory exists
if (!fs.existsSync(CONFIG.reportsDir)) {
  fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
}

// Generate timestamp for report filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(CONFIG.reportsDir, `quick-report-${timestamp}.json`);

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  MANUS VALIDATION KIT - Quick Validate');
console.log('═══════════════════════════════════════════════');
console.log('');

try {
  // Run validation
  console.log('🔍 Running validation...');
  console.log('');
  
  const result = execSync('npx manus-validate validate --ci', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });

  // Validation passed
  console.log('✅ Validation PASSED');
  console.log('');

  if (CONFIG.outputJson) {
    // Find the latest report file
    const reports = fs.readdirSync(CONFIG.reportsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (reports.length > 0) {
      const latestReport = fs.readFileSync(
        path.join(CONFIG.reportsDir, reports[0]),
        'utf-8'
      );
      console.log(latestReport);
    }
  }

  process.exit(0);

} catch (error) {
  // Validation failed or errored
  console.log('❌ Validation FAILED');
  console.log('');

  if (error.stdout) {
    console.log(error.stdout);
  }
  if (error.stderr) {
    console.error(error.stderr);
  }

  // In CI mode, exit with error code
  if (CONFIG.ciMode) {
    process.exit(1);
  }

  // Otherwise, just log and continue
  console.log('');
  console.log('💡 Run with --ci flag to exit with error code on failure.');
  process.exit(0);
}
