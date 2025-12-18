/**
 * @roALAB1/manus-validation-kit
 * Core Validation Engine
 * 
 * The heart of the validation system. Orchestrates all 10 validators
 * and applies consensus scoring to determine if code is production-ready.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  ValidationEngineConfig,
  ValidationResult,
  ValidationReport,
  ValidationIssue,
  ConsensusIssue,
  ValidationSummary,
  ValidationStatus,
  ValidatorConfig,
} from '../types';
import { DEFAULT_VALIDATORS } from '../config/default.config';

const execAsync = promisify(exec);

export class ValidationEngine {
  private config: ValidationEngineConfig;
  private projectPath: string;

  constructor(projectPath: string, config?: Partial<ValidationEngineConfig>) {
    this.projectPath = projectPath;
    this.config = {
      ...DEFAULT_VALIDATORS,
      ...config,
      validators: {
        ...DEFAULT_VALIDATORS.validators,
        ...config?.validators,
      },
      consensus: {
        ...DEFAULT_VALIDATORS.consensus,
        ...config?.consensus,
      },
    };
  }

  /**
   * Run all enabled validators and generate a comprehensive report
   */
  async validate(validatorNames?: string[]): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];

    const validatorsToRun = this.getValidatorsToRun(validatorNames);

    console.log(`\n🔍 Running ${validatorsToRun.length} validators...\n`);

    for (const [name, config] of validatorsToRun) {
      if (!config.enabled) {
        results.push(this.createSkippedResult(name, config));
        continue;
      }

      console.log(`  ⏳ ${config.name}...`);
      const result = await this.runValidator(name, config);
      results.push(result);

      const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      console.log(`  ${statusIcon} ${config.name} (${result.duration}ms)`);
    }

    const consensusIssues = this.applyConsensus(results);
    const summary = this.generateSummary(results);
    const score = this.calculateScore(results, consensusIssues);
    const status = this.determineOverallStatus(results, consensusIssues);

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      status,
      score,
      results,
      consensusIssues,
      summary,
    };

    this.printSummary(report);

    return report;
  }

  /**
   * Run a single validator
   */
  private async runValidator(name: string, config: ValidatorConfig): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(config.command, {
        cwd: this.projectPath,
        timeout: config.timeout,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      const issues = this.parseValidatorOutput(name, stdout, stderr);
      const status: ValidationStatus = issues.some(i => i.severity === 'critical' || i.severity === 'high')
        ? 'failed'
        : 'passed';

      return {
        validator: name,
        status,
        weight: config.weight,
        duration: Date.now() - startTime,
        issues,
        metadata: { stdout: stdout.slice(0, 1000), stderr: stderr.slice(0, 1000) },
      };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string; code?: number };
      
      // Some validators exit with non-zero on issues (e.g., eslint)
      if (err.stdout || err.stderr) {
        const issues = this.parseValidatorOutput(name, err.stdout || '', err.stderr || '');
        return {
          validator: name,
          status: issues.length > 0 ? 'failed' : 'error',
          weight: config.weight,
          duration: Date.now() - startTime,
          issues,
          metadata: { error: err.message, code: err.code },
        };
      }

      return {
        validator: name,
        status: 'error',
        weight: config.weight,
        duration: Date.now() - startTime,
        issues: [{
          severity: 'critical',
          code: 'VALIDATOR_ERROR',
          message: `Validator failed to execute: ${err.message}`,
        }],
        metadata: { error: err.message },
      };
    }
  }

  /**
   * Parse validator output into structured issues
   */
  private parseValidatorOutput(validator: string, stdout: string, stderr: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const output = stdout + stderr;

    // Try to parse as JSON first (many tools support JSON output)
    try {
      const json = JSON.parse(output);
      if (Array.isArray(json)) {
        return json.map(item => this.normalizeIssue(validator, item));
      }
      if (json.results || json.errors || json.issues) {
        const items = json.results || json.errors || json.issues || [];
        return items.map((item: unknown) => this.normalizeIssue(validator, item));
      }
    } catch {
      // Not JSON, parse as text
    }

    // Parse common error patterns
    const errorPatterns = [
      /error\s+TS(\d+):\s+(.+)/gi,
      /(\S+):(\d+):(\d+):\s+(error|warning):\s+(.+)/gi,
      /✖\s+(.+)/gi,
      /ERROR:\s+(.+)/gi,
    ];

    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        issues.push({
          severity: match[4]?.toLowerCase() === 'warning' ? 'medium' : 'high',
          code: `${validator.toUpperCase()}_ERROR`,
          message: match[match.length - 1] || match[0],
          file: match[1]?.includes('.') ? match[1] : undefined,
          line: match[2] ? parseInt(match[2], 10) : undefined,
          column: match[3] ? parseInt(match[3], 10) : undefined,
        });
      }
    }

    return issues;
  }

  /**
   * Normalize an issue from various formats
   */
  private normalizeIssue(validator: string, item: unknown): ValidationIssue {
    const obj = item as Record<string, unknown>;
    return {
      severity: this.normalizeSeverity(obj['severity'] || obj['level'] || 'medium'),
      code: String(obj['code'] || obj['ruleId'] || obj['rule'] || `${validator.toUpperCase()}_ISSUE`),
      message: String(obj['message'] || obj['text'] || obj['description'] || 'Unknown issue'),
      file: obj['file'] || obj['filePath'] ? String(obj['file'] || obj['filePath']) : undefined,
      line: typeof obj['line'] === 'number' ? obj['line'] : undefined,
      column: typeof obj['column'] === 'number' ? obj['column'] : undefined,
      suggestion: obj['suggestion'] || obj['fix'] ? String(obj['suggestion'] || obj['fix']) : undefined,
    };
  }

  /**
   * Normalize severity string to ValidationSeverity
   */
  private normalizeSeverity(severity: unknown): ValidationIssue['severity'] {
    const s = String(severity).toLowerCase();
    if (s === 'critical' || s === 'fatal' || s === 'error' && s.includes('critical')) return 'critical';
    if (s === 'high' || s === 'error') return 'high';
    if (s === 'medium' || s === 'warning' || s === 'warn') return 'medium';
    if (s === 'low' || s === 'minor') return 'low';
    return 'info';
  }

  /**
   * Apply consensus rules to determine which issues should be flagged
   */
  private applyConsensus(results: ValidationResult[]): ConsensusIssue[] {
    const issueMap = new Map<string, ConsensusIssue>();

    for (const result of results) {
      for (const issue of result.issues) {
        const key = `${issue.file || ''}:${issue.line || ''}:${issue.code}:${issue.message}`;
        
        if (issueMap.has(key)) {
          const existing = issueMap.get(key)!;
          existing.validators.push(result.validator);
          existing.combinedWeight += result.weight;
        } else {
          issueMap.set(key, {
            issue,
            validators: [result.validator],
            combinedWeight: result.weight,
            flaggedByConsensus: false,
          });
        }
      }
    }

    // Apply consensus rules
    for (const consensusIssue of issueMap.values()) {
      const { minValidatorsToFlag, singleValidatorThreshold } = this.config.consensus;
      
      consensusIssue.flaggedByConsensus =
        consensusIssue.validators.length >= minValidatorsToFlag ||
        consensusIssue.combinedWeight >= singleValidatorThreshold;
    }

    return Array.from(issueMap.values());
  }

  /**
   * Calculate overall validation score (0-100)
   */
  private calculateScore(results: ValidationResult[], consensusIssues: ConsensusIssue[]): number {
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const passedWeight = results
      .filter(r => r.status === 'passed')
      .reduce((sum, r) => sum + r.weight, 0);

    const baseScore = (passedWeight / totalWeight) * 100;

    // Deduct points for consensus issues
    const flaggedIssues = consensusIssues.filter(ci => ci.flaggedByConsensus);
    const criticalCount = flaggedIssues.filter(ci => ci.issue.severity === 'critical').length;
    const highCount = flaggedIssues.filter(ci => ci.issue.severity === 'high').length;

    const deduction = (criticalCount * 10) + (highCount * 5);

    return Math.max(0, Math.round(baseScore - deduction));
  }

  /**
   * Determine overall validation status
   */
  private determineOverallStatus(results: ValidationResult[], consensusIssues: ConsensusIssue[]): ValidationStatus {
    const hasRequiredFailure = results.some(r => {
      const config = this.config.validators[r.validator];
      return config?.required && r.status === 'failed';
    });

    if (hasRequiredFailure) return 'failed';

    const hasCriticalConsensus = consensusIssues.some(
      ci => ci.flaggedByConsensus && ci.issue.severity === 'critical'
    );

    if (hasCriticalConsensus) return 'failed';

    const hasAnyError = results.some(r => r.status === 'error');
    if (hasAnyError) return 'error';

    return 'passed';
  }

  /**
   * Generate validation summary
   */
  private generateSummary(results: ValidationResult[]): ValidationSummary {
    const allIssues = results.flatMap(r => r.issues);

    return {
      totalValidators: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
      highIssues: allIssues.filter(i => i.severity === 'high').length,
    };
  }

  /**
   * Get validators to run based on input
   */
  private getValidatorsToRun(validatorNames?: string[]): [string, ValidatorConfig][] {
    const allValidators = Object.entries(this.config.validators);

    if (!validatorNames || validatorNames.length === 0) {
      return allValidators;
    }

    return allValidators.filter(([name]) => validatorNames.includes(name));
  }

  /**
   * Create a skipped result for disabled validators
   */
  private createSkippedResult(name: string, config: ValidatorConfig): ValidationResult {
    return {
      validator: name,
      status: 'skipped',
      weight: config.weight,
      duration: 0,
      issues: [],
      metadata: { reason: 'Validator disabled' },
    };
  }

  /**
   * Print summary to console
   */
  private printSummary(report: ValidationReport): void {
    console.log('\n' + '═'.repeat(60));
    console.log('  VALIDATION REPORT');
    console.log('═'.repeat(60));
    console.log(`  Status: ${report.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Score:  ${report.score}/100`);
    console.log(`  Time:   ${report.duration}ms`);
    console.log('─'.repeat(60));
    console.log(`  Validators: ${report.summary.passed}/${report.summary.totalValidators} passed`);
    console.log(`  Issues:     ${report.summary.totalIssues} total (${report.summary.criticalIssues} critical, ${report.summary.highIssues} high)`);
    console.log('═'.repeat(60) + '\n');
  }
}

export default ValidationEngine;
