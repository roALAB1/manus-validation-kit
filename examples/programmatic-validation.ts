/**
 * Manus Validation Kit - Programmatic Integration Example
 * 
 * This example demonstrates how to:
 * 1. Run validation programmatically
 * 2. Access the full report object
 * 3. Process and react to validation results
 * 4. Generate custom outputs (Slack, email, dashboard, etc.)
 * 
 * Usage:
 *   npx ts-node examples/programmatic-validation.ts
 */

import {
  validate,
  ValidationEngine,
  SkepticalReasoningEngine,
  LearningLoop,
} from '../src';

import type {
  ValidationReport,
  SkepticalReport,
  ConsensusIssue,
} from '../src/types';

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_PATH = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_PATH, '.validation', 'custom-reports');

// =============================================================================
// MAIN VALIDATION RUNNER
// =============================================================================

async function runFullValidation(): Promise<{
  validation: ValidationReport | undefined;
  skeptical: SkepticalReport | undefined;
}> {
  console.log('\n🚀 Running Full Validation Suite\n');
  console.log(`📁 Project: ${PROJECT_PATH}\n`);

  // Use the high-level validate function for simplicity
  const results = await validate(PROJECT_PATH, {
    layer: 'all',
    fix: false,
  });

  return {
    validation: results.validation,
    skeptical: results.skeptical,
  };
}

// =============================================================================
// REPORT PROCESSING EXAMPLES
// =============================================================================

/**
 * Example: Generate a JSON report for external systems
 */
function generateJsonReport(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): object {
  return {
    timestamp: new Date().toISOString(),
    project: PROJECT_PATH,
    validation: validation ? {
      status: validation.status,
      score: validation.score,
      duration: validation.duration,
      summary: validation.summary,
      criticalIssues: validation.consensusIssues
        .filter(ci => ci.issue.severity === 'critical')
        .map(ci => ({
          code: ci.issue.code,
          message: ci.issue.message,
          file: ci.issue.file,
          validators: ci.validators,
        })),
    } : null,
    skeptical: skeptical ? {
      recommendation: skeptical.assessment.recommendation,
      readinessScore: skeptical.assessment.readinessScore,
      scalabilityScore: skeptical.assessment.scalabilityScore,
      topCritiques: skeptical.critiques.slice(0, 3).map(c => ({
        title: c.title,
        severity: c.severity,
        recommendation: c.recommendation,
      })),
    } : null,
  };
}

/**
 * Example: Generate a Slack-compatible message
 */
function generateSlackMessage(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): object {
  const status = validation?.status || 'unknown';
  const score = validation?.score || 0;
  const criticalCount = validation?.consensusIssues
    .filter(ci => ci.issue.severity === 'critical').length || 0;

  const statusEmoji = status === 'passed' ? ':white_check_mark:' : ':x:';
  const scoreColor = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger';

  return {
    attachments: [
      {
        color: scoreColor,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${statusEmoji} Validation ${status.toUpperCase()}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Score:*\n${score}/100` },
              { type: 'mrkdwn', text: `*Critical Issues:*\n${criticalCount}` },
              { type: 'mrkdwn', text: `*Recommendation:*\n${skeptical?.assessment.recommendation || 'N/A'}` },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Example: Check if deployment should be blocked
 */
function shouldBlockDeployment(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): { blocked: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Block if validation failed
  if (validation?.status === 'failed') {
    reasons.push('Validation status is FAILED');
  }

  // Block if score is below threshold
  if (validation && validation.score < 70) {
    reasons.push(`Validation score (${validation.score}) is below threshold (70)`);
  }

  // Block if critical issues exist
  const criticalCount = validation?.consensusIssues
    .filter(ci => ci.issue.severity === 'critical').length || 0;
  if (criticalCount > 0) {
    reasons.push(`${criticalCount} critical issue(s) found`);
  }

  // Block if skeptical reasoning says stop
  if (skeptical?.assessment.recommendation === 'stop-and-fix') {
    reasons.push('Skeptical reasoning recommends STOP-AND-FIX');
  }

  return {
    blocked: reasons.length > 0,
    reasons,
  };
}

/**
 * Example: Extract actionable items for developers
 */
function extractActionItems(
  validation: ValidationReport | undefined
): Array<{ priority: number; action: string; file?: string }> {
  const items: Array<{ priority: number; action: string; file?: string }> = [];

  if (!validation) return items;

  for (const ci of validation.consensusIssues) {
    const priority = ci.issue.severity === 'critical' ? 1 :
                     ci.issue.severity === 'high' ? 2 :
                     ci.issue.severity === 'medium' ? 3 : 4;

    items.push({
      priority,
      action: ci.issue.suggestion || ci.issue.message,
      file: ci.issue.file,
    });
  }

  // Sort by priority
  return items.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Run validation
    const { validation, skeptical } = await runFullValidation();

    // Generate various outputs
    console.log('\n📊 Processing Results...\n');

    // 1. JSON Report
    const jsonReport = generateJsonReport(validation, skeptical);
    const jsonPath = path.join(OUTPUT_DIR, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`  ✅ JSON report saved to ${jsonPath}`);

    // 2. Slack Message
    const slackMessage = generateSlackMessage(validation, skeptical);
    const slackPath = path.join(OUTPUT_DIR, 'slack-message.json');
    fs.writeFileSync(slackPath, JSON.stringify(slackMessage, null, 2));
    console.log(`  ✅ Slack message saved to ${slackPath}`);

    // 3. Deployment Decision
    const deploymentDecision = shouldBlockDeployment(validation, skeptical);
    console.log(`\n🚦 Deployment Decision: ${deploymentDecision.blocked ? '🛑 BLOCKED' : '✅ ALLOWED'}`);
    if (deploymentDecision.blocked) {
      console.log('   Reasons:');
      for (const reason of deploymentDecision.reasons) {
        console.log(`     - ${reason}`);
      }
    }

    // 4. Action Items
    const actionItems = extractActionItems(validation);
    if (actionItems.length > 0) {
      console.log('\n📋 Action Items (Top 5):');
      for (const item of actionItems.slice(0, 5)) {
        const priorityIcon = item.priority === 1 ? '🔴' :
                             item.priority === 2 ? '🟠' :
                             item.priority === 3 ? '🟡' : '🔵';
        console.log(`   ${priorityIcon} ${item.action}`);
        if (item.file) console.log(`      📄 ${item.file}`);
      }
    }

    console.log('\n✅ Validation complete!\n');

    // Exit with appropriate code
    process.exit(deploymentDecision.blocked ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(2);
  }
}

// Run
main();
