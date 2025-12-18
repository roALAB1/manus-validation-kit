/**
 * @roALAB1/manus-validation-kit
 * Learning Loop Engine (Layer 3)
 * 
 * Tracks validation failures, detects patterns, and enables auto-fixing
 * for high-confidence recurring issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FailureRecord,
  FailurePattern,
  LearningMetrics,
  LearningReport,
  ValidationResult,
  ValidationIssue,
} from '../types';

interface LearningData {
  failures: FailureRecord[];
  patterns: FailurePattern[];
  metrics: LearningMetrics;
  lastUpdated: string;
}

export class LearningLoop {
  private dataPath: string;
  private data: LearningData;

  constructor(projectPath: string) {
    this.dataPath = path.join(projectPath, '.validation', 'learning-data.json');
    this.data = this.loadData();
  }

  /**
   * Record validation results and update learning data
   */
  async recordResults(results: ValidationResult[]): Promise<void> {
    const timestamp = new Date().toISOString();

    for (const result of results) {
      if (result.status === 'failed' || result.status === 'error') {
        for (const issue of result.issues) {
          const record = this.createFailureRecord(result.validator, issue, timestamp);
          this.data.failures.push(record);
        }
      }
    }

    // Update patterns
    this.detectPatterns();

    // Update metrics
    this.updateMetrics(results);

    // Save data
    this.saveData();
  }

  /**
   * Generate learning report
   */
  async generateReport(): Promise<LearningReport> {
    const autoFixReady = this.data.patterns.filter(p => p.autoFixReady);
    const recommendations: string[] = [];

    if (autoFixReady.length > 0) {
      recommendations.push(`✅ ${autoFixReady.length} patterns are ready for auto-fix. Run with --fix to apply.`);
    }

    const highFrequencyPatterns = this.data.patterns.filter(p => p.occurrences >= 5);
    if (highFrequencyPatterns.length > 0) {
      recommendations.push(`⚠️ ${highFrequencyPatterns.length} patterns occur frequently. Consider addressing root causes.`);
    }

    const lowAccuracyValidators = Object.entries(this.data.metrics.validatorAccuracy)
      .filter(([_, accuracy]) => accuracy < 0.8);
    if (lowAccuracyValidators.length > 0) {
      recommendations.push(`📊 ${lowAccuracyValidators.length} validators have low accuracy. Review their configurations.`);
    }

    return {
      timestamp: new Date().toISOString(),
      metrics: this.data.metrics,
      patterns: this.data.patterns,
      recommendations,
    };
  }

  /**
   * Apply auto-fixes for high-confidence patterns
   */
  async applyAutoFixes(): Promise<{ applied: number; succeeded: number }> {
    const autoFixPatterns = this.data.patterns.filter(
      p => p.autoFixReady && p.suggestedFix
    );

    let applied = 0;
    let succeeded = 0;

    for (const pattern of autoFixPatterns) {
      // Find recent failures matching this pattern
      const matchingFailures = this.data.failures.filter(
        f => f.pattern === pattern.pattern && !f.fixApplied
      );

      for (const failure of matchingFailures.slice(0, 5)) {
        applied++;
        
        // Apply the fix (simplified - in production, this would execute actual fixes)
        const success = await this.applyFix(failure, pattern.suggestedFix!);
        
        if (success) {
          succeeded++;
          failure.fixApplied = pattern.suggestedFix;
          failure.fixSucceeded = true;
        }
      }
    }

    // Update pattern fix rates
    this.updatePatternFixRates();
    this.saveData();

    return { applied, succeeded };
  }

  /**
   * Get patterns that are ready for auto-fix
   */
  getAutoFixReadyPatterns(): FailurePattern[] {
    return this.data.patterns.filter(p => p.autoFixReady);
  }

  /**
   * Create a failure record from a validation issue
   */
  private createFailureRecord(
    validator: string,
    issue: ValidationIssue,
    timestamp: string
  ): FailureRecord {
    const pattern = this.identifyPattern(issue);

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp,
      validator,
      errorCode: issue.code,
      errorMessage: issue.message,
      file: issue.file,
      line: issue.line,
      pattern,
      confidence: this.calculateConfidence(pattern),
    };
  }

  /**
   * Identify pattern from an issue
   */
  private identifyPattern(issue: ValidationIssue): string {
    // Normalize the error message to identify patterns
    let pattern = issue.message;

    // Remove specific file paths
    pattern = pattern.replace(/['"`]\/[^'"`]+['"`]/g, '"<path>"');
    
    // Remove specific line/column numbers
    pattern = pattern.replace(/line \d+/gi, 'line <N>');
    pattern = pattern.replace(/column \d+/gi, 'column <N>');
    
    // Remove specific variable names in common patterns
    pattern = pattern.replace(/'[a-zA-Z_][a-zA-Z0-9_]*'/g, "'<identifier>'");

    return `${issue.code}:${pattern}`;
  }

  /**
   * Calculate confidence for a pattern
   */
  private calculateConfidence(pattern: string): number {
    const existingPattern = this.data.patterns.find(p => p.pattern === pattern);
    
    if (!existingPattern) {
      return 0.3; // New pattern, low confidence
    }

    // Higher confidence for patterns with successful fixes
    const baseConfidence = Math.min(0.9, 0.3 + (existingPattern.occurrences * 0.1));
    const fixBonus = existingPattern.fixRate * 0.2;

    return Math.min(0.99, baseConfidence + fixBonus);
  }

  /**
   * Detect and update patterns from failure records
   */
  private detectPatterns(): void {
    const patternMap = new Map<string, FailureRecord[]>();

    // Group failures by pattern
    for (const failure of this.data.failures) {
      if (failure.pattern) {
        const existing = patternMap.get(failure.pattern) || [];
        existing.push(failure);
        patternMap.set(failure.pattern, existing);
      }
    }

    // Update patterns
    this.data.patterns = Array.from(patternMap.entries()).map(([pattern, failures]) => {
      const existingPattern = this.data.patterns.find(p => p.pattern === pattern);
      const fixedCount = failures.filter(f => f.fixSucceeded).length;

      return {
        pattern,
        description: this.generatePatternDescription(failures[0]!),
        occurrences: failures.length,
        firstSeen: failures.reduce((min, f) => f.timestamp < min ? f.timestamp : min, failures[0]!.timestamp),
        lastSeen: failures.reduce((max, f) => f.timestamp > max ? f.timestamp : max, failures[0]!.timestamp),
        fixRate: failures.length > 0 ? fixedCount / failures.length : 0,
        suggestedFix: existingPattern?.suggestedFix || this.suggestFix(pattern, failures),
        autoFixReady: failures.length >= 3 && (fixedCount / failures.length) >= 0.8,
      };
    });

    // Sort by occurrences
    this.data.patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate human-readable description for a pattern
   */
  private generatePatternDescription(failure: FailureRecord): string {
    return `${failure.validator}: ${failure.errorMessage.slice(0, 100)}`;
  }

  /**
   * Suggest a fix for a pattern
   */
  private suggestFix(pattern: string, failures: FailureRecord[]): string | undefined {
    // Common fix suggestions based on pattern
    if (pattern.includes('nullable') || pattern.includes('optional')) {
      return 'Add .nullable() or .optional() to Zod schema field';
    }
    if (pattern.includes('any')) {
      return 'Replace `any` type with specific type or `unknown`';
    }
    if (pattern.includes('unused')) {
      return 'Remove unused variable or prefix with underscore';
    }
    if (pattern.includes('import')) {
      return 'Check import path and ensure module exists';
    }

    return undefined;
  }

  /**
   * Update pattern fix rates
   */
  private updatePatternFixRates(): void {
    for (const pattern of this.data.patterns) {
      const matchingFailures = this.data.failures.filter(f => f.pattern === pattern.pattern);
      const fixedCount = matchingFailures.filter(f => f.fixSucceeded).length;
      pattern.fixRate = matchingFailures.length > 0 ? fixedCount / matchingFailures.length : 0;
      pattern.autoFixReady = matchingFailures.length >= 3 && pattern.fixRate >= 0.8;
    }
  }

  /**
   * Update metrics from validation results
   */
  private updateMetrics(results: ValidationResult[]): void {
    // Update validator accuracy
    for (const result of results) {
      const current = this.data.metrics.validatorAccuracy[result.validator] || 0.9;
      const newValue = result.status === 'passed' ? 1 : result.status === 'failed' ? 0.5 : 0;
      // Exponential moving average
      this.data.metrics.validatorAccuracy[result.validator] = current * 0.9 + newValue * 0.1;
    }

    // Update totals
    this.data.metrics.totalFailures = this.data.failures.length;
    this.data.metrics.uniquePatterns = this.data.patterns.length;
    this.data.metrics.autoFixesApplied = this.data.failures.filter(f => f.fixApplied).length;
    
    const fixedFailures = this.data.failures.filter(f => f.fixApplied);
    const successfulFixes = fixedFailures.filter(f => f.fixSucceeded);
    this.data.metrics.autoFixSuccessRate = fixedFailures.length > 0
      ? successfulFixes.length / fixedFailures.length
      : 0;
  }

  /**
   * Apply a fix (placeholder - would execute actual fix in production)
   */
  private async applyFix(failure: FailureRecord, fix: string): Promise<boolean> {
    // In a real implementation, this would:
    // 1. Parse the fix instruction
    // 2. Locate the file
    // 3. Apply the transformation
    // 4. Verify the fix worked
    
    console.log(`  🔧 Applying fix for ${failure.errorCode}: ${fix}`);
    
    // Simulate success rate based on confidence
    return failure.confidence > 0.7;
  }

  /**
   * Load learning data from disk
   */
  private loadData(): LearningData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Ignore errors, return default
    }

    return {
      failures: [],
      patterns: [],
      metrics: {
        totalFailures: 0,
        uniquePatterns: 0,
        autoFixesApplied: 0,
        autoFixSuccessRate: 0,
        validatorAccuracy: {},
        falsePositiveRate: {},
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save learning data to disk
   */
  private saveData(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
  }
}

export default LearningLoop;
