/**
 * Manus Validation Kit - Webhook Integration Example
 * 
 * This example demonstrates how to:
 * 1. Run validation
 * 2. Send the report to an external webhook (Slack, Discord, custom API)
 * 
 * Usage:
 *   WEBHOOK_URL=https://hooks.slack.com/... npx ts-node webhook-integration.ts
 */

import { validate } from '../src';
import type { ValidationReport, SkepticalReport } from '../src/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const WEBHOOK_URL = process.env['WEBHOOK_URL'];
const PROJECT_NAME = process.env['PROJECT_NAME'] || 'Unknown Project';

// =============================================================================
// WEBHOOK PAYLOAD GENERATORS
// =============================================================================

/**
 * Generate a Slack-compatible webhook payload
 */
function generateSlackPayload(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): object {
  const status = validation?.status || 'unknown';
  const score = validation?.score || 0;
  const criticalCount = validation?.consensusIssues
    .filter(ci => ci.issue.severity === 'critical').length || 0;
  const highCount = validation?.consensusIssues
    .filter(ci => ci.issue.severity === 'high').length || 0;

  const statusEmoji = status === 'passed' ? ':white_check_mark:' : ':x:';
  const color = status === 'passed' ? '#36a64f' : '#dc3545';

  return {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${statusEmoji} ${PROJECT_NAME} - Validation ${status.toUpperCase()}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Score*\n${score}/100` },
              { type: 'mrkdwn', text: `*Critical*\n${criticalCount}` },
              { type: 'mrkdwn', text: `*High*\n${highCount}` },
              { type: 'mrkdwn', text: `*Recommendation*\n${skeptical?.assessment.recommendation || 'N/A'}` },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Generate a Discord-compatible webhook payload
 */
function generateDiscordPayload(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): object {
  const status = validation?.status || 'unknown';
  const score = validation?.score || 0;
  const criticalCount = validation?.consensusIssues
    .filter(ci => ci.issue.severity === 'critical').length || 0;

  const color = status === 'passed' ? 0x36a64f : 0xdc3545;

  return {
    embeds: [
      {
        title: `${PROJECT_NAME} - Validation ${status.toUpperCase()}`,
        color,
        fields: [
          { name: 'Score', value: `${score}/100`, inline: true },
          { name: 'Critical Issues', value: `${criticalCount}`, inline: true },
          { name: 'Recommendation', value: skeptical?.assessment.recommendation || 'N/A', inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Generate a generic JSON payload for custom webhooks
 */
function generateGenericPayload(
  validation: ValidationReport | undefined,
  skeptical: SkepticalReport | undefined
): object {
  return {
    event: 'validation_complete',
    timestamp: new Date().toISOString(),
    project: PROJECT_NAME,
    validation: {
      status: validation?.status,
      score: validation?.score,
      duration: validation?.duration,
      issues: {
        total: validation?.summary.totalIssues || 0,
        critical: validation?.summary.criticalIssues || 0,
        high: validation?.summary.highIssues || 0,
      },
    },
    skeptical: {
      recommendation: skeptical?.assessment.recommendation,
      readinessScore: skeptical?.assessment.readinessScore,
      scalabilityScore: skeptical?.assessment.scalabilityScore,
    },
  };
}

// =============================================================================
// WEBHOOK SENDER
// =============================================================================

async function sendWebhook(url: string, payload: object): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  if (!WEBHOOK_URL) {
    console.error('❌ WEBHOOK_URL environment variable is required.');
    console.error('');
    console.error('Usage:');
    console.error('  WEBHOOK_URL=https://hooks.slack.com/... npx ts-node webhook-integration.ts');
    process.exit(1);
  }

  console.log('');
  console.log('🚀 Running validation...');
  console.log('');

  try {
    // Run validation
    const results = await validate(process.cwd(), { layer: 'all' });
    const { validation, skeptical } = results;

    console.log(`✅ Validation complete: ${validation?.status || 'unknown'}`);
    console.log('');

    // Detect webhook type and generate appropriate payload
    let payload: object;
    
    if (WEBHOOK_URL.includes('slack.com')) {
      console.log('📤 Sending to Slack...');
      payload = generateSlackPayload(validation, skeptical);
    } else if (WEBHOOK_URL.includes('discord.com')) {
      console.log('📤 Sending to Discord...');
      payload = generateDiscordPayload(validation, skeptical);
    } else {
      console.log('📤 Sending to custom webhook...');
      payload = generateGenericPayload(validation, skeptical);
    }

    // Send webhook
    await sendWebhook(WEBHOOK_URL, payload);
    console.log('✅ Webhook sent successfully!');
    console.log('');

    // Exit with appropriate code
    process.exit(validation?.status === 'passed' ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(2);
  }
}

main();
