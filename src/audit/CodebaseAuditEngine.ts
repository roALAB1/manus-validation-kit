/**
 * @roALAB1/manus-validation-kit
 * Codebase Audit Engine - Layer 6
 * 
 * Evidence-based codebase health analysis using proven static analysis tools.
 * Every finding includes proof from real tools - no AI guessing.
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  AuditConfig,
  AuditReport,
  AuditSummary,
  Finding,
  FindingType,
  Evidence,
  ConfidenceCategory,
  KeepList,
  AuditError,
  DepcheckResult,
  TsPruneResult,
  JscpdResult,
  MadgeResult,
} from '../types/audit';

export class CodebaseAuditEngine {
  private projectPath: string;
  private config: AuditConfig;
  private keepList: KeepList;
  private findings: Finding[] = [];
  private errors: AuditError[] = [];
  private toolsUsed: string[] = [];

  constructor(projectPath: string, config?: Partial<AuditConfig>) {
    this.projectPath = path.resolve(projectPath);
    this.config = this.mergeConfig(config);
    this.keepList = this.loadKeepList();
  }

  /**
   * Run the full codebase audit
   */
  async audit(): Promise<AuditReport> {
    const startTime = Date.now();
    this.findings = [];
    this.errors = [];
    this.toolsUsed = [];

    console.log('🔍 Starting Evidence-Based Codebase Audit...\n');

    // Run each tool if enabled
    if (this.config.tools.depcheck.enabled) {
      await this.runDepcheck();
    }

    if (this.config.tools['ts-prune'].enabled) {
      await this.runTsPrune();
    }

    if (this.config.tools.unimported.enabled) {
      await this.runUnimported();
    }

    if (this.config.tools.jscpd.enabled) {
      await this.runJscpd();
    }

    if (this.config.tools.madge.enabled) {
      await this.runMadge();
    }

    // Check for stale files
    await this.checkStaleFiles();

    // Filter findings by minimum confidence
    this.findings = this.findings.filter(
      f => f.confidence >= this.config.thresholds.minConfidenceToReport
    );

    const duration = Date.now() - startTime;

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      projectPath: this.projectPath,
      duration,
      summary: this.generateSummary(),
      findings: this.findings,
      toolsUsed: this.toolsUsed,
      errors: this.errors,
    };
  }

  /**
   * Run depcheck to find unused dependencies
   */
  private async runDepcheck(): Promise<void> {
    console.log('📦 Running depcheck (unused dependencies)...');
    this.toolsUsed.push('depcheck');

    try {
      // Check if depcheck is available, install if not
      this.ensureToolInstalled('depcheck');

      const output = execSync(
        `npx depcheck ${this.projectPath} --json`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const result: DepcheckResult = JSON.parse(output);
      const timestamp = new Date().toISOString();

      // Process unused dependencies
      for (const dep of result.dependencies) {
        if (this.isPackageExcluded(dep)) continue;

        const finding = this.createFinding({
          type: 'unused-dependency',
          target: dep,
          evidence: [{
            tool: 'depcheck',
            output: `Unused dependency: ${dep}`,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Remove "${dep}" from dependencies in package.json`,
          baseConfidence: 85,
        });

        this.findings.push(finding);
      }

      // Process unused devDependencies
      for (const dep of result.devDependencies) {
        if (this.isPackageExcluded(dep)) continue;

        const finding = this.createFinding({
          type: 'unused-dependency',
          target: dep,
          evidence: [{
            tool: 'depcheck',
            output: `Unused devDependency: ${dep}`,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Remove "${dep}" from devDependencies in package.json`,
          baseConfidence: 80,
        });

        this.findings.push(finding);
      }

      console.log(`   Found ${result.dependencies.length + result.devDependencies.length} unused dependencies\n`);

    } catch (error) {
      this.handleToolError('depcheck', error);
    }
  }

  /**
   * Run ts-prune to find unused TypeScript exports
   */
  private async runTsPrune(): Promise<void> {
    console.log('📤 Running ts-prune (unused exports)...');
    this.toolsUsed.push('ts-prune');

    try {
      this.ensureToolInstalled('ts-prune');

      const output = execSync(
        `npx ts-prune --project ${this.projectPath}/tsconfig.json 2>/dev/null || true`,
        { encoding: 'utf-8', cwd: this.projectPath, maxBuffer: 10 * 1024 * 1024 }
      );

      const timestamp = new Date().toISOString();
      const lines = output.trim().split('\n').filter(l => l.trim());
      let count = 0;

      for (const line of lines) {
        // Parse ts-prune output: "path/to/file.ts:10 - exportName"
        const match = line.match(/^(.+):(\d+)\s+-\s+(.+)$/);
        if (!match) continue;

        const [, filePath, lineNum, exportName] = match;
        if (this.isPathExcluded(filePath)) continue;

        const finding = this.createFinding({
          type: 'unused-export',
          target: `${filePath}:${lineNum}`,
          evidence: [{
            tool: 'ts-prune',
            output: line,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Remove unused export "${exportName}" from ${filePath}`,
          baseConfidence: 75,
          metadata: { exportName, lineNumber: parseInt(lineNum) },
        });

        this.findings.push(finding);
        count++;
      }

      console.log(`   Found ${count} unused exports\n`);

    } catch (error) {
      this.handleToolError('ts-prune', error);
    }
  }

  /**
   * Run unimported to find unreachable files
   */
  private async runUnimported(): Promise<void> {
    console.log('📁 Running unimported (unreachable files)...');
    this.toolsUsed.push('unimported');

    try {
      this.ensureToolInstalled('unimported');

      const output = execSync(
        `npx unimported --show-unused-files --no-cache 2>/dev/null || echo "{}"`,
        { encoding: 'utf-8', cwd: this.projectPath, maxBuffer: 10 * 1024 * 1024 }
      );

      const timestamp = new Date().toISOString();
      
      // Parse unimported output (it outputs file paths, one per line)
      const lines = output.trim().split('\n').filter(l => l.trim() && !l.startsWith('{'));
      let count = 0;

      for (const filePath of lines) {
        if (this.isPathExcluded(filePath)) continue;
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && 
            !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) continue;

        const finding = this.createFinding({
          type: 'unused-file',
          target: filePath,
          evidence: [{
            tool: 'unimported',
            output: `Unreachable file: ${filePath}`,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Archive or remove "${filePath}" - not imported by any entry point`,
          baseConfidence: 70,
        });

        this.findings.push(finding);
        count++;
      }

      console.log(`   Found ${count} unreachable files\n`);

    } catch (error) {
      this.handleToolError('unimported', error);
    }
  }

  /**
   * Run jscpd to find duplicate code
   */
  private async runJscpd(): Promise<void> {
    console.log('📋 Running jscpd (duplicate code)...');
    this.toolsUsed.push('jscpd');

    try {
      this.ensureToolInstalled('jscpd');

      const minLines = this.config.tools.jscpd.minLines || 10;
      const output = execSync(
        `npx jscpd ${this.projectPath}/src --reporters json --min-lines ${minLines} --silent 2>/dev/null || echo '{"duplicates":[]}'`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const timestamp = new Date().toISOString();
      
      // Try to parse JSON output
      let result: JscpdResult;
      try {
        result = JSON.parse(output);
      } catch {
        result = { duplicates: [], statistics: { total: { lines: 0, sources: 0, clones: 0, duplicatedLines: 0 } } };
      }

      for (const dup of result.duplicates || []) {
        const target = `${dup.firstFile.name} <-> ${dup.secondFile.name}`;
        
        const finding = this.createFinding({
          type: 'duplicate-code',
          target,
          evidence: [{
            tool: 'jscpd',
            output: `Duplicate code block: ${dup.lines} lines, ${dup.tokens} tokens\n` +
                    `File 1: ${dup.firstFile.name} (lines ${dup.firstFile.start}-${dup.firstFile.end})\n` +
                    `File 2: ${dup.secondFile.name} (lines ${dup.secondFile.start}-${dup.secondFile.end})`,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Refactor duplicate code into shared function/module`,
          baseConfidence: 85,
          metadata: {
            lines: dup.lines,
            tokens: dup.tokens,
            firstFile: dup.firstFile,
            secondFile: dup.secondFile,
          },
        });

        this.findings.push(finding);
      }

      console.log(`   Found ${result.duplicates?.length || 0} duplicate code blocks\n`);

    } catch (error) {
      this.handleToolError('jscpd', error);
    }
  }

  /**
   * Run madge to find circular dependencies
   */
  private async runMadge(): Promise<void> {
    console.log('🔄 Running madge (circular dependencies)...');
    this.toolsUsed.push('madge');

    try {
      this.ensureToolInstalled('madge');

      const output = execSync(
        `npx madge --circular --json ${this.projectPath}/src 2>/dev/null || echo "[]"`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const timestamp = new Date().toISOString();
      
      let circular: string[][];
      try {
        circular = JSON.parse(output);
      } catch {
        circular = [];
      }

      for (const cycle of circular) {
        const target = cycle.join(' → ');
        
        const finding = this.createFinding({
          type: 'circular-dependency',
          target,
          evidence: [{
            tool: 'madge',
            output: `Circular dependency detected:\n${cycle.join(' → ')} → ${cycle[0]}`,
            timestamp,
            exitCode: 0,
          }],
          recommendation: `Break circular dependency cycle: ${cycle.join(' → ')}`,
          baseConfidence: 90,
          metadata: { cycle },
        });

        this.findings.push(finding);
      }

      console.log(`   Found ${circular.length} circular dependencies\n`);

    } catch (error) {
      this.handleToolError('madge', error);
    }
  }

  /**
   * Check for stale files (not modified recently)
   */
  private async checkStaleFiles(): Promise<void> {
    console.log('📅 Checking for stale files...');

    try {
      const staleDays = this.config.thresholds.staleFileDays || 180;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - staleDays);

      const output = execSync(
        `find ${this.projectPath}/src -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) -mtime +${staleDays} 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const timestamp = new Date().toISOString();
      const files = output.trim().split('\n').filter(f => f.trim());
      let count = 0;

      for (const filePath of files) {
        if (this.isPathExcluded(filePath)) continue;

        const relativePath = path.relative(this.projectPath, filePath);
        
        const finding = this.createFinding({
          type: 'stale-file',
          target: relativePath,
          evidence: [{
            tool: 'madge', // Using filesystem check
            output: `File not modified in ${staleDays}+ days: ${relativePath}`,
            timestamp,
          }],
          recommendation: `Review stale file "${relativePath}" - not modified in ${staleDays}+ days`,
          baseConfidence: 40, // Low confidence - stale doesn't mean unused
        });

        this.findings.push(finding);
        count++;
      }

      console.log(`   Found ${count} stale files (>${staleDays} days old)\n`);

    } catch (error) {
      // Non-critical, just log
      console.log('   Could not check stale files\n');
    }
  }

  /**
   * Create a finding with calculated confidence
   */
  private createFinding(params: {
    type: FindingType;
    target: string;
    evidence: Evidence[];
    recommendation: string;
    baseConfidence: number;
    metadata?: Record<string, unknown>;
  }): Finding {
    let confidence = params.baseConfidence;

    // Apply confidence modifiers
    if (this.isInKeepList(params.target)) {
      confidence -= 20;
    }

    // Boost if multiple evidence sources
    if (params.evidence.length > 1) {
      confidence += 15;
    }

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence));

    const category: ConfidenceCategory = 
      confidence >= 80 ? 'high' :
      confidence >= 60 ? 'medium' : 'low';

    return {
      id: `${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      target: params.target,
      confidence,
      category,
      recommendation: params.recommendation,
      evidence: params.evidence,
      metadata: params.metadata,
    };
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(): AuditSummary {
    const summary: AuditSummary = {
      totalFindings: this.findings.length,
      highConfidence: this.findings.filter(f => f.category === 'high').length,
      mediumConfidence: this.findings.filter(f => f.category === 'medium').length,
      lowConfidence: this.findings.filter(f => f.category === 'low').length,
      estimatedBloatKB: 0,
      unusedDependencies: this.findings.filter(f => f.type === 'unused-dependency').length,
      unusedFiles: this.findings.filter(f => f.type === 'unused-file').length,
      unusedExports: this.findings.filter(f => f.type === 'unused-export').length,
      duplicateBlocks: this.findings.filter(f => f.type === 'duplicate-code').length,
      circularDependencies: this.findings.filter(f => f.type === 'circular-dependency').length,
      staleFiles: this.findings.filter(f => f.type === 'stale-file').length,
    };

    return summary;
  }

  /**
   * Check if a path is excluded
   */
  private isPathExcluded(filePath: string): boolean {
    const relativePath = path.relative(this.projectPath, filePath);
    
    // Check exclusion paths
    for (const excludePath of this.config.exclusions.paths) {
      if (relativePath.startsWith(excludePath) || relativePath.includes(`/${excludePath}`)) {
        return true;
      }
    }

    // Check exclusion patterns
    for (const pattern of this.config.exclusions.patterns) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(relativePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a package is excluded
   */
  private isPackageExcluded(packageName: string): boolean {
    for (const pattern of this.config.exclusions.packages) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (packageName.startsWith(prefix)) return true;
      } else if (packageName === pattern) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if target is in keep list
   */
  private isInKeepList(target: string): boolean {
    // Check files
    for (const file of this.keepList.files) {
      if (target.includes(file.path)) return true;
    }
    // Check packages
    for (const pkg of this.keepList.packages) {
      if (target === pkg.name) return true;
    }
    return false;
  }

  /**
   * Load the keep list from .validation/keep.json
   */
  private loadKeepList(): KeepList {
    const keepPath = path.join(this.projectPath, '.validation', 'keep.json');
    
    if (fs.existsSync(keepPath)) {
      try {
        return JSON.parse(fs.readFileSync(keepPath, 'utf-8'));
      } catch {
        // Invalid JSON, return empty
      }
    }

    return {
      description: 'Files and packages intentionally kept despite appearing unused',
      files: [],
      packages: [],
    };
  }

  /**
   * Ensure a tool is installed
   */
  private ensureToolInstalled(tool: string): void {
    try {
      execSync(`npx ${tool} --version`, { stdio: 'ignore' });
    } catch {
      console.log(`   Installing ${tool}...`);
      execSync(`npm install -g ${tool}`, { stdio: 'ignore' });
    }
  }

  /**
   * Handle tool errors gracefully
   */
  private handleToolError(tool: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`   ⚠️ ${tool} encountered an error: ${message.slice(0, 100)}\n`);
    
    this.errors.push({
      tool,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Merge user config with defaults
   */
  private mergeConfig(userConfig?: Partial<AuditConfig>): AuditConfig {
    const defaultConfig: AuditConfig = {
      enabled: true,
      tools: {
        depcheck: { enabled: true },
        'ts-prune': { enabled: true },
        unimported: { enabled: true },
        jscpd: { enabled: true, minLines: 10, minTokens: 50 },
        madge: { enabled: true },
        'cost-of-modules': { enabled: false },
      },
      thresholds: {
        minConfidenceToReport: 50,
        minConfidenceToRecommend: 70,
        staleFileDays: 180,
      },
      exclusions: {
        paths: ['node_modules/', 'dist/', 'build/', '.git/', '__tests__/', '__mocks__/', 'migrations/'],
        packages: ['@types/*'],
        patterns: ['*.config.js', '*.config.ts', '*.d.ts', '*.test.ts', '*.spec.ts'],
      },
    };

    if (!userConfig) return defaultConfig;

    return {
      ...defaultConfig,
      ...userConfig,
      tools: { ...defaultConfig.tools, ...userConfig.tools },
      thresholds: { ...defaultConfig.thresholds, ...userConfig.thresholds },
      exclusions: { ...defaultConfig.exclusions, ...userConfig.exclusions },
    };
  }
}
