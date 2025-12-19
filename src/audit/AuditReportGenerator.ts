/**
 * @roALAB1/manus-validation-kit
 * Audit Report Generator - Layer 6
 * 
 * Generates human-readable and machine-readable reports from audit findings.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditReport, Finding, CleanupPlan, CleanupAction } from '../types/audit';

export class AuditReportGenerator {
  private report: AuditReport;
  private projectPath: string;

  constructor(report: AuditReport) {
    this.report = report;
    this.projectPath = report.projectPath;
  }

  /**
   * Generate a formatted console report
   */
  generateConsoleReport(): string {
    const lines: string[] = [];
    const { summary, findings } = this.report;

    // Header
    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('  EVIDENCE-BASED CODEBASE AUDIT REPORT');
    lines.push('═'.repeat(70));
    lines.push(`  Project: ${this.projectPath}`);
    lines.push(`  Timestamp: ${this.report.timestamp}`);
    lines.push(`  Duration: ${(this.report.duration / 1000).toFixed(2)}s`);
    lines.push('─'.repeat(70));

    // Summary
    lines.push('');
    lines.push('📊 SUMMARY');
    lines.push('─'.repeat(70));
    lines.push(`  Total Findings:        ${summary.totalFindings}`);
    lines.push(`  🔴 High Confidence:    ${summary.highConfidence}`);
    lines.push(`  🟡 Medium Confidence:  ${summary.mediumConfidence}`);
    lines.push(`  ⚪ Low Confidence:     ${summary.lowConfidence}`);
    lines.push('');
    lines.push('  By Type:');
    lines.push(`    Unused Dependencies: ${summary.unusedDependencies}`);
    lines.push(`    Unused Files:        ${summary.unusedFiles}`);
    lines.push(`    Unused Exports:      ${summary.unusedExports}`);
    lines.push(`    Duplicate Code:      ${summary.duplicateBlocks}`);
    lines.push(`    Circular Deps:       ${summary.circularDependencies}`);
    lines.push(`    Stale Files:         ${summary.staleFiles}`);
    lines.push('─'.repeat(70));

    // High confidence findings (safe to act on)
    const highFindings = findings.filter(f => f.category === 'high');
    if (highFindings.length > 0) {
      lines.push('');
      lines.push('🔴 HIGH CONFIDENCE FINDINGS (Safe to act on)');
      lines.push('─'.repeat(70));
      for (const finding of highFindings) {
        lines.push(this.formatFinding(finding));
      }
    }

    // Medium confidence findings (needs review)
    const mediumFindings = findings.filter(f => f.category === 'medium');
    if (mediumFindings.length > 0) {
      lines.push('');
      lines.push('🟡 MEDIUM CONFIDENCE FINDINGS (Needs human review)');
      lines.push('─'.repeat(70));
      for (const finding of mediumFindings) {
        lines.push(this.formatFinding(finding));
      }
    }

    // Low confidence findings (informational)
    const lowFindings = findings.filter(f => f.category === 'low');
    if (lowFindings.length > 0) {
      lines.push('');
      lines.push('⚪ LOW CONFIDENCE FINDINGS (Informational only)');
      lines.push('─'.repeat(70));
      for (const finding of lowFindings.slice(0, 10)) { // Limit to 10
        lines.push(this.formatFinding(finding));
      }
      if (lowFindings.length > 10) {
        lines.push(`  ... and ${lowFindings.length - 10} more low confidence findings`);
      }
    }

    // Tools used
    lines.push('');
    lines.push('🔧 TOOLS USED');
    lines.push('─'.repeat(70));
    lines.push(`  ${this.report.toolsUsed.join(', ')}`);

    // Errors
    if (this.report.errors.length > 0) {
      lines.push('');
      lines.push('⚠️ ERRORS ENCOUNTERED');
      lines.push('─'.repeat(70));
      for (const error of this.report.errors) {
        lines.push(`  ${error.tool}: ${error.message.slice(0, 60)}...`);
      }
    }

    // Footer
    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('  Run `npm run validate:cleanup -- --dry-run` to preview cleanup actions');
    lines.push('═'.repeat(70));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format a single finding for console output
   */
  private formatFinding(finding: Finding): string {
    const icon = this.getTypeIcon(finding.type);
    const confidence = `[${finding.confidence}%]`;
    
    let output = `\n  ${icon} ${finding.type.toUpperCase()} ${confidence}\n`;
    output += `     Target: ${finding.target}\n`;
    output += `     → ${finding.recommendation}\n`;
    output += `     Evidence: ${finding.evidence[0]?.tool || 'unknown'}\n`;
    
    return output;
  }

  /**
   * Get icon for finding type
   */
  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'unused-dependency': '📦',
      'unused-file': '📁',
      'unused-export': '📤',
      'duplicate-code': '📋',
      'circular-dependency': '🔄',
      'large-dependency': '⚖️',
      'stale-file': '📅',
    };
    return icons[type] || '❓';
  }

  /**
   * Save report to JSON file
   */
  saveJsonReport(outputDir?: string): string {
    const dir = outputDir || path.join(this.projectPath, '.validation', 'reports');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `audit-${this.report.timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.report, null, 2));
    
    return filepath;
  }

  /**
   * Save report to Markdown file
   */
  saveMarkdownReport(outputDir?: string): string {
    const dir = outputDir || path.join(this.projectPath, '.validation', 'reports');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `audit-${this.report.timestamp.replace(/[:.]/g, '-')}.md`;
    const filepath = path.join(dir, filename);

    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(filepath, markdown);
    
    return filepath;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(): string {
    const { summary, findings } = this.report;
    const lines: string[] = [];

    lines.push('# Codebase Audit Report');
    lines.push('');
    lines.push(`**Project:** ${this.projectPath}`);
    lines.push(`**Date:** ${this.report.timestamp}`);
    lines.push(`**Duration:** ${(this.report.duration / 1000).toFixed(2)}s`);
    lines.push('');

    // Summary table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Findings | ${summary.totalFindings} |`);
    lines.push(`| 🔴 High Confidence | ${summary.highConfidence} |`);
    lines.push(`| 🟡 Medium Confidence | ${summary.mediumConfidence} |`);
    lines.push(`| ⚪ Low Confidence | ${summary.lowConfidence} |`);
    lines.push('');

    lines.push('### By Type');
    lines.push('');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    lines.push(`| Unused Dependencies | ${summary.unusedDependencies} |`);
    lines.push(`| Unused Files | ${summary.unusedFiles} |`);
    lines.push(`| Unused Exports | ${summary.unusedExports} |`);
    lines.push(`| Duplicate Code | ${summary.duplicateBlocks} |`);
    lines.push(`| Circular Dependencies | ${summary.circularDependencies} |`);
    lines.push(`| Stale Files | ${summary.staleFiles} |`);
    lines.push('');

    // High confidence findings
    const highFindings = findings.filter(f => f.category === 'high');
    if (highFindings.length > 0) {
      lines.push('## 🔴 High Confidence Findings');
      lines.push('');
      lines.push('> These findings are backed by strong evidence and are safe to act on.');
      lines.push('');
      
      for (const finding of highFindings) {
        lines.push(`### ${this.getTypeIcon(finding.type)} ${finding.target}`);
        lines.push('');
        lines.push(`- **Type:** ${finding.type}`);
        lines.push(`- **Confidence:** ${finding.confidence}%`);
        lines.push(`- **Recommendation:** ${finding.recommendation}`);
        lines.push(`- **Evidence:** ${finding.evidence[0]?.tool}`);
        lines.push('');
        lines.push('```');
        lines.push(finding.evidence[0]?.output || 'No output');
        lines.push('```');
        lines.push('');
      }
    }

    // Medium confidence findings
    const mediumFindings = findings.filter(f => f.category === 'medium');
    if (mediumFindings.length > 0) {
      lines.push('## 🟡 Medium Confidence Findings');
      lines.push('');
      lines.push('> These findings need human review before taking action.');
      lines.push('');
      
      for (const finding of mediumFindings) {
        lines.push(`- **${finding.target}** (${finding.confidence}%): ${finding.recommendation}`);
      }
      lines.push('');
    }

    // Low confidence findings
    const lowFindings = findings.filter(f => f.category === 'low');
    if (lowFindings.length > 0) {
      lines.push('## ⚪ Low Confidence Findings');
      lines.push('');
      lines.push('> These are informational only. Do not act without investigation.');
      lines.push('');
      
      for (const finding of lowFindings.slice(0, 20)) {
        lines.push(`- ${finding.target}: ${finding.recommendation}`);
      }
      if (lowFindings.length > 20) {
        lines.push(`- ... and ${lowFindings.length - 20} more`);
      }
      lines.push('');
    }

    // Tools used
    lines.push('## Tools Used');
    lines.push('');
    lines.push(this.report.toolsUsed.map(t => `- ${t}`).join('\n'));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a cleanup plan for high-confidence findings
   */
  generateCleanupPlan(): CleanupPlan {
    const actions: CleanupAction[] = [];
    const highFindings = this.report.findings.filter(f => f.category === 'high');

    for (const finding of highFindings) {
      let action: CleanupAction | null = null;

      switch (finding.type) {
        case 'unused-dependency':
          action = {
            type: 'remove-dependency',
            target: finding.target,
            finding,
            command: `npm uninstall ${finding.target}`,
          };
          break;

        case 'unused-file':
          action = {
            type: 'archive-file',
            target: finding.target,
            finding,
            command: `mkdir -p _archive && mv "${finding.target}" "_archive/"`,
          };
          break;

        case 'unused-export':
          action = {
            type: 'remove-export',
            target: finding.target,
            finding,
            command: `# Manual: Remove unused export from ${finding.target}`,
          };
          break;
      }

      if (action) {
        actions.push(action);
      }
    }

    // Generate shell script
    const script = this.generateCleanupScript(actions);

    return {
      timestamp: new Date().toISOString(),
      projectPath: this.projectPath,
      actions,
      estimatedImpact: {
        filesRemoved: actions.filter(a => a.type === 'archive-file' || a.type === 'delete-file').length,
        dependenciesRemoved: actions.filter(a => a.type === 'remove-dependency').length,
        sizeFreedKB: 0, // Would need to calculate
      },
      script,
    };
  }

  /**
   * Generate a shell script for cleanup actions
   */
  private generateCleanupScript(actions: CleanupAction[]): string {
    const lines: string[] = [];

    lines.push('#!/bin/bash');
    lines.push('# Manus Validation Kit - Cleanup Script');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('# Review this script before running!');
    lines.push('');
    lines.push('set -e  # Exit on error');
    lines.push('');

    // Group by type
    const depActions = actions.filter(a => a.type === 'remove-dependency');
    const fileActions = actions.filter(a => a.type === 'archive-file' || a.type === 'delete-file');
    const exportActions = actions.filter(a => a.type === 'remove-export');

    if (depActions.length > 0) {
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('# REMOVE UNUSED DEPENDENCIES');
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('');
      for (const action of depActions) {
        lines.push(`# ${action.finding.evidence[0]?.output || ''}`);
        lines.push(action.command || '');
        lines.push('');
      }
    }

    if (fileActions.length > 0) {
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('# ARCHIVE UNUSED FILES');
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push('mkdir -p _archive');
      lines.push('');
      for (const action of fileActions) {
        lines.push(`# ${action.finding.evidence[0]?.output || ''}`);
        lines.push(action.command || '');
        lines.push('');
      }
    }

    if (exportActions.length > 0) {
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('# MANUAL: REMOVE UNUSED EXPORTS');
      lines.push('# ═══════════════════════════════════════════════════════════════');
      lines.push('');
      for (const action of exportActions) {
        lines.push(`# ${action.target}`);
        lines.push(`# ${action.finding.recommendation}`);
        lines.push('');
      }
    }

    lines.push('echo "Cleanup complete!"');

    return lines.join('\n');
  }

  /**
   * Save cleanup script to file
   */
  saveCleanupScript(outputDir?: string): string {
    const plan = this.generateCleanupPlan();
    const dir = outputDir || path.join(this.projectPath, '.validation');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, 'cleanup.sh');
    fs.writeFileSync(filepath, plan.script);
    fs.chmodSync(filepath, '755');

    return filepath;
  }
}
