#!/bin/bash
# =============================================================================
# Manus Validation Kit - CI/CD Integration Script
# =============================================================================
# This script runs the validation engine and processes the output for CI/CD.
# 
# Usage:
#   ./ci-validation.sh [--layer=code|skeptical|all] [--fail-on-warning]
#
# Exit Codes:
#   0 - Validation passed
#   1 - Validation failed (critical or high severity issues)
#   2 - Validation error (engine failed to run)
# =============================================================================

set -e

# Configuration
REPORTS_DIR=".validation/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORTS_DIR/ci-report-$TIMESTAMP.json"
SUMMARY_FILE="$REPORTS_DIR/ci-summary-$TIMESTAMP.md"

# Parse arguments
LAYER="code"
FAIL_ON_WARNING=false

for arg in "$@"; do
  case $arg in
    --layer=*)
      LAYER="${arg#*=}"
      shift
      ;;
    --fail-on-warning)
      FAIL_ON_WARNING=true
      shift
      ;;
  esac
done

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo "=============================================="
echo "  Manus Validation Kit - CI/CD Runner"
echo "=============================================="
echo "  Layer:           $LAYER"
echo "  Fail on Warning: $FAIL_ON_WARNING"
echo "  Report File:     $REPORT_FILE"
echo "=============================================="
echo ""

# Run validation and capture output
echo "🔍 Running validation..."
echo ""

# Run the validation command
if npx manus-validate validate --layer="$LAYER" --output=json > "$REPORT_FILE" 2>&1; then
  VALIDATION_STATUS="passed"
else
  VALIDATION_STATUS="failed"
fi

# Check if report was generated
if [ ! -f "$REPORT_FILE" ] || [ ! -s "$REPORT_FILE" ]; then
  echo "❌ ERROR: Validation report was not generated."
  exit 2
fi

# Parse the report using Node.js (more reliable than jq for complex JSON)
node << 'EOF' - "$REPORT_FILE" "$SUMMARY_FILE" "$FAIL_ON_WARNING"
const fs = require('fs');
const reportPath = process.argv[2];
const summaryPath = process.argv[3];
const failOnWarning = process.argv[4] === 'true';

try {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  // Extract key metrics
  const status = report.status || 'unknown';
  const score = report.score || 0;
  const summary = report.summary || {};
  const consensusIssues = report.consensusIssues || [];
  
  // Count issues by severity
  const criticalCount = consensusIssues.filter(ci => ci.issue.severity === 'critical').length;
  const highCount = consensusIssues.filter(ci => ci.issue.severity === 'high').length;
  const mediumCount = consensusIssues.filter(ci => ci.issue.severity === 'medium').length;
  
  // Print summary to console
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  VALIDATION RESULTS');
  console.log('══════════════════════════════════════════════');
  console.log(`  Status:   ${status === 'passed' ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Score:    ${score}/100`);
  console.log('──────────────────────────────────────────────');
  console.log(`  Critical: ${criticalCount}`);
  console.log(`  High:     ${highCount}`);
  console.log(`  Medium:   ${mediumCount}`);
  console.log('══════════════════════════════════════════════');
  console.log('');
  
  // Generate Markdown summary
  let md = `# CI Validation Report\n\n`;
  md += `**Status**: ${status === 'passed' ? '✅ PASSED' : '❌ FAILED'}\n`;
  md += `**Score**: ${score}/100\n`;
  md += `**Generated**: ${new Date().toISOString()}\n\n`;
  
  md += `## Issue Summary\n\n`;
  md += `| Severity | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| Critical | ${criticalCount} |\n`;
  md += `| High | ${highCount} |\n`;
  md += `| Medium | ${mediumCount} |\n\n`;
  
  if (consensusIssues.length > 0) {
    md += `## Flagged Issues\n\n`;
    for (const ci of consensusIssues.slice(0, 10)) {
      const icon = ci.issue.severity === 'critical' ? '🔴' : 
                   ci.issue.severity === 'high' ? '🟠' : '🟡';
      md += `### ${icon} ${ci.issue.code}\n\n`;
      md += `- **Severity**: ${ci.issue.severity}\n`;
      md += `- **Message**: ${ci.issue.message}\n`;
      if (ci.issue.file) md += `- **File**: \`${ci.issue.file}\`\n`;
      if (ci.issue.suggestion) md += `- **Suggestion**: ${ci.issue.suggestion}\n`;
      md += `- **Flagged by**: ${ci.validators.join(', ')}\n\n`;
    }
  }
  
  fs.writeFileSync(summaryPath, md);
  console.log(`📄 Summary saved to ${summaryPath}`);
  console.log('');
  
  // Determine exit code
  let exitCode = 0;
  if (criticalCount > 0 || highCount > 0) {
    exitCode = 1;
  } else if (failOnWarning && mediumCount > 0) {
    exitCode = 1;
  }
  
  // Output for CI systems (GitHub Actions, etc.)
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `score=${score}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `critical_count=${criticalCount}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `high_count=${highCount}\n`);
  }
  
  process.exit(exitCode);
  
} catch (error) {
  console.error('❌ Failed to parse validation report:', error.message);
  process.exit(2);
}
EOF

# Capture the exit code from the Node.js script
EXIT_CODE=$?

# Final message
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ CI validation completed successfully."
else
  echo "❌ CI validation failed. Please review the issues above."
fi

exit $EXIT_CODE
