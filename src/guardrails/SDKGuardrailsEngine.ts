/**
 * SDK Guardrails Engine
 * Layer 7: Verified Data Structure Enforcement
 * 
 * This engine validates code against verified schemas to prevent
 * hallucinated data structures and unverified field access.
 * 
 * @packageDocumentation
 * @module @roALAB1/manus-validation-kit
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SDKGuardrailsConfig,
  SDKGuardrailsResult,
  SDKGuardrailsOptions,
  GuardrailViolation,
  ViolationType,
  GuardrailSeverity,
  GuardrailConfidence,
  VerifiedSchema,
  ISDKGuardrailsEngine
} from '../types/sdk-guardrails';

/**
 * SDK Guardrails Engine
 * 
 * Validates code against verified schemas to ensure only verified
 * data structures are used. Prevents AI hallucination of field names
 * and data structures.
 */
export class SDKGuardrailsEngine implements ISDKGuardrailsEngine {
  private config: SDKGuardrailsConfig | null = null;
  private projectPath: string = '';

  /**
   * Load guardrails configuration from a file
   */
  async loadConfig(configPath: string): Promise<SDKGuardrailsConfig> {
    const fullPath = path.resolve(configPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Guardrails config not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Support both JSON and Markdown formats
    if (fullPath.endsWith('.json')) {
      this.config = JSON.parse(content) as SDKGuardrailsConfig;
    } else if (fullPath.endsWith('.md')) {
      this.config = this.parseMarkdownConfig(content);
    } else {
      throw new Error(`Unsupported config format: ${fullPath}`);
    }

    return this.config;
  }

  /**
   * Parse a Markdown guardrails file into config
   */
  private parseMarkdownConfig(content: string): SDKGuardrailsConfig {
    const config: SDKGuardrailsConfig = {
      version: '1.0.0',
      projectName: 'Unknown',
      lastUpdated: new Date().toISOString(),
      sourceFiles: [],
      schemas: [],
      commonMistakes: []
    };

    // Extract project name from title
    const titleMatch = content.match(/^#\s+(.+?)(?:\s+SDK)?\s+(?:Integration\s+)?Guardrails/mi);
    if (titleMatch) {
      config.projectName = titleMatch[1].trim();
    }

    // Extract schemas from tables
    const tableRegex = /###\s+`?(\w+)`?\s+Table\s*\n([\s\S]*?)(?=###|$)/gi;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(content)) !== null) {
      const tableName = tableMatch[1];
      const tableContent = tableMatch[2];
      
      const schema: VerifiedSchema = {
        name: tableName,
        fields: [],
        nonExistentFields: []
      };

      // Parse field rows from table
      const rowRegex = /\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(Yes|No)\s*\|/gi;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        schema.fields.push({
          name: rowMatch[1],
          type: rowMatch[2].toLowerCase(),
          required: rowMatch[3].toLowerCase() === 'yes',
          nullable: rowMatch[3].toLowerCase() !== 'yes'
        });
      }

      // Parse non-existent fields warnings
      const nonExistentRegex = /❌\s*`?(\w+)`?\s*-?\s*(?:DOES NOT EXIST|doesn't exist)/gi;
      let nonExistentMatch;
      
      while ((nonExistentMatch = nonExistentRegex.exec(tableContent)) !== null) {
        schema.nonExistentFields?.push(nonExistentMatch[1]);
      }

      if (schema.fields.length > 0) {
        config.schemas.push(schema);
      }
    }

    // Extract common mistakes
    const mistakesRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
    const mistakesSection = content.match(/##\s*Historical Mistakes[\s\S]*?(?=##|$)/i);
    
    if (mistakesSection) {
      let mistakeMatch;
      while ((mistakeMatch = mistakesRegex.exec(mistakesSection[0])) !== null) {
        if (!mistakeMatch[1].includes('Mistake') && !mistakeMatch[1].includes('---')) {
          config.commonMistakes?.push({
            mistake: mistakeMatch[1].trim(),
            correction: mistakeMatch[3].trim()
          });
        }
      }
    }

    return config;
  }

  /**
   * Validate a project against loaded guardrails
   */
  async validate(
    projectPath: string,
    options: SDKGuardrailsOptions = {}
  ): Promise<SDKGuardrailsResult> {
    const startTime = Date.now();
    this.projectPath = path.resolve(projectPath);

    // Load config if not already loaded
    if (!this.config && options.configPath) {
      await this.loadConfig(options.configPath);
    }

    if (!this.config) {
      // Try to find config in standard locations
      const standardPaths = [
        path.join(this.projectPath, '.validation', 'sdk-guardrails.json'),
        path.join(this.projectPath, '.validation', 'sdk-guardrails.md'),
        path.join(this.projectPath, 'SDK_GUARDRAILS.md')
      ];

      for (const configPath of standardPaths) {
        if (fs.existsSync(configPath)) {
          await this.loadConfig(configPath);
          break;
        }
      }
    }

    if (!this.config) {
      return this.createErrorResult('No SDK guardrails configuration found', startTime);
    }

    const violations: GuardrailViolation[] = [];
    const filesToScan = this.getFilesToScan(options);

    for (const file of filesToScan) {
      const fileViolations = await this.scanFile(file, options);
      violations.push(...fileViolations);
    }

    return this.createResult(violations, filesToScan.length, startTime, options);
  }

  /**
   * Get list of files to scan
   */
  private getFilesToScan(options: SDKGuardrailsOptions): string[] {
    const files: string[] = [];
    const targetPaths = options.targetPaths || [this.projectPath];
    const excludePaths = options.excludePaths || ['node_modules', '.git', 'dist', 'build'];

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);
        
        // Check exclusions
        if (excludePaths.some(exc => relativePath.includes(exc))) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && this.isRelevantFile(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    for (const target of targetPaths) {
      const fullTarget = path.isAbsolute(target) ? target : path.join(this.projectPath, target);
      
      if (fs.statSync(fullTarget).isDirectory()) {
        scanDir(fullTarget);
      } else {
        files.push(fullTarget);
      }
    }

    return files;
  }

  /**
   * Check if file is relevant for SDK validation
   */
  private isRelevantFile(filename: string): boolean {
    const relevantExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const relevantPatterns = ['sdk', 'api', 'client', 'service', 'integration'];
    
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    if (!relevantExtensions.includes(ext)) {
      return false;
    }

    // Prioritize files that likely contain SDK code
    return relevantPatterns.some(pattern => name.includes(pattern)) || true;
  }

  /**
   * Scan a single file for guardrail violations
   */
  private async scanFile(
    filePath: string,
    options: SDKGuardrailsOptions
  ): Promise<GuardrailViolation[]> {
    const violations: GuardrailViolation[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.projectPath, filePath);

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const lineNumber = lineNum + 1;

      // Check for non-existent field access
      for (const schema of this.config!.schemas) {
        for (const nonExistent of schema.nonExistentFields || []) {
          const patterns = [
            new RegExp(`\\.${nonExistent}\\b`, 'g'),
            new RegExp(`\\['${nonExistent}'\\]`, 'g'),
            new RegExp(`\\["${nonExistent}"\\]`, 'g'),
            new RegExp(`${schema.name}\\.${nonExistent}`, 'gi')
          ];

          for (const pattern of patterns) {
            if (pattern.test(line)) {
              violations.push({
                id: `sdk-${violations.length + 1}`,
                type: 'unverified_field',
                severity: 'critical',
                confidence: 'high',
                file: relativePath,
                line: lineNumber,
                code: line.trim(),
                message: `Field '${nonExistent}' does not exist on '${schema.name}' table`,
                suggestion: `Remove reference to '${nonExistent}'. Check verified schema for correct field names.`,
                evidence: `Verified schema for '${schema.name}' does not include field '${nonExistent}'`,
                schema: schema.name,
                field: nonExistent
              });
            }
          }
        }

        // Check for potential unverified field access
        const fieldAccessPattern = new RegExp(
          `(?:${schema.name}|row|record|data|item)\\.([a-zA-Z_][a-zA-Z0-9_]*)`,
          'gi'
        );
        
        let match;
        while ((match = fieldAccessPattern.exec(line)) !== null) {
          const fieldName = match[1];
          const verifiedFields = schema.fields.map(f => f.name.toLowerCase());
          const nonExistentFields = (schema.nonExistentFields || []).map(f => f.toLowerCase());
          
          // Skip common JS properties
          const commonProps = ['length', 'map', 'filter', 'forEach', 'find', 'reduce', 'push', 'pop', 'toString', 'valueOf'];
          if (commonProps.includes(fieldName.toLowerCase())) {
            continue;
          }

          if (nonExistentFields.includes(fieldName.toLowerCase())) {
            // Already caught above
            continue;
          }

          if (!verifiedFields.includes(fieldName.toLowerCase()) && 
              fieldName.length > 2 && 
              !fieldName.startsWith('_')) {
            violations.push({
              id: `sdk-${violations.length + 1}`,
              type: 'assumption',
              severity: 'medium',
              confidence: 'medium',
              file: relativePath,
              line: lineNumber,
              code: line.trim(),
              message: `Field '${fieldName}' not found in verified schema for '${schema.name}'`,
              suggestion: `Verify that '${fieldName}' exists in the schema. If valid, add to guardrails config.`,
              evidence: `Field '${fieldName}' is not in the verified field list for '${schema.name}'`,
              schema: schema.name,
              field: fieldName
            });
          }
        }
      }

      // Check for common mistakes
      for (const mistake of this.config!.commonMistakes || []) {
        if (line.toLowerCase().includes(mistake.mistake.toLowerCase())) {
          violations.push({
            id: `sdk-${violations.length + 1}`,
            type: 'assumption',
            severity: 'high',
            confidence: 'high',
            file: relativePath,
            line: lineNumber,
            code: line.trim(),
            message: `Known mistake detected: ${mistake.mistake}`,
            suggestion: mistake.correction,
            evidence: `This pattern has been identified as a common mistake`
          });
        }
      }
    }

    // Filter by severity threshold
    if (options.severityThreshold) {
      const severityOrder: GuardrailSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
      const thresholdIndex = severityOrder.indexOf(options.severityThreshold);
      return violations.filter(v => severityOrder.indexOf(v.severity) <= thresholdIndex);
    }

    return violations;
  }

  /**
   * Create validation result
   */
  private createResult(
    violations: GuardrailViolation[],
    filesScanned: number,
    startTime: number,
    options: SDKGuardrailsOptions
  ): SDKGuardrailsResult {
    const summary = {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
      info: violations.filter(v => v.severity === 'info').length,
      byType: {} as Record<ViolationType, number>
    };

    // Count by type
    const types: ViolationType[] = [
      'unverified_field', 'wrong_type', 'deprecated_field', 'missing_required',
      'invalid_structure', 'hardcoded_value', 'assumption', 'deprecated_endpoint'
    ];
    for (const type of types) {
      summary.byType[type] = violations.filter(v => v.type === type).length;
    }

    // Calculate score (100 = perfect, 0 = many critical issues)
    const score = Math.max(0, 100 - (
      summary.critical * 25 +
      summary.high * 10 +
      summary.medium * 5 +
      summary.low * 2 +
      summary.info * 0.5
    ));

    // Determine status
    let status: 'passed' | 'failed' | 'warning' | 'error' = 'passed';
    if (summary.critical > 0 || (options.strictMode && violations.length > 0)) {
      status = 'failed';
    } else if (summary.high > 0 || (options.failOnWarning && violations.length > 0)) {
      status = 'warning';
    }

    return {
      status,
      score: Math.round(score),
      duration: Date.now() - startTime,
      filesScanned,
      violationsFound: violations.length,
      violations,
      summary,
      verifiedAgainst: {
        configFile: this.config?.projectName || 'Unknown',
        configVersion: this.config?.version || '1.0.0',
        schemasChecked: this.config?.schemas.map(s => s.name) || []
      }
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, startTime: number): SDKGuardrailsResult {
    return {
      status: 'error',
      score: 0,
      duration: Date.now() - startTime,
      filesScanned: 0,
      violationsFound: 0,
      violations: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        byType: {} as Record<ViolationType, number>
      },
      verifiedAgainst: {
        configFile: 'None',
        configVersion: '0.0.0',
        schemasChecked: []
      }
    };
  }

  /**
   * Generate a report from validation results
   */
  generateReport(
    result: SDKGuardrailsResult,
    format: 'json' | 'text' | 'markdown' = 'markdown'
  ): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (format === 'text') {
      return this.generateTextReport(result);
    }

    return this.generateMarkdownReport(result);
  }

  /**
   * Generate text report
   */
  private generateTextReport(result: SDKGuardrailsResult): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '  SDK GUARDRAILS VALIDATION REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Status: ${result.status.toUpperCase()}`,
      `Score: ${result.score}/100`,
      `Files Scanned: ${result.filesScanned}`,
      `Violations Found: ${result.violationsFound}`,
      `Duration: ${result.duration}ms`,
      '',
      'Summary:',
      `  Critical: ${result.summary.critical}`,
      `  High: ${result.summary.high}`,
      `  Medium: ${result.summary.medium}`,
      `  Low: ${result.summary.low}`,
      `  Info: ${result.summary.info}`,
      ''
    ];

    if (result.violations.length > 0) {
      lines.push('Violations:');
      lines.push('───────────────────────────────────────────────────────────────');
      
      for (const v of result.violations) {
        lines.push(`[${v.severity.toUpperCase()}] ${v.file}:${v.line}`);
        lines.push(`  ${v.message}`);
        if (v.suggestion) {
          lines.push(`  → ${v.suggestion}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(result: SDKGuardrailsResult): string {
    const statusEmoji = {
      passed: '✅',
      failed: '❌',
      warning: '⚠️',
      error: '🚫'
    };

    const lines: string[] = [
      '# SDK Guardrails Validation Report',
      '',
      `**Status:** ${statusEmoji[result.status]} ${result.status.toUpperCase()}`,
      `**Score:** ${result.score}/100`,
      `**Files Scanned:** ${result.filesScanned}`,
      `**Violations Found:** ${result.violationsFound}`,
      `**Duration:** ${result.duration}ms`,
      '',
      '## Summary',
      '',
      '| Severity | Count |',
      '|----------|-------|',
      `| 🔴 Critical | ${result.summary.critical} |`,
      `| 🟠 High | ${result.summary.high} |`,
      `| 🟡 Medium | ${result.summary.medium} |`,
      `| 🔵 Low | ${result.summary.low} |`,
      `| ⚪ Info | ${result.summary.info} |`,
      ''
    ];

    if (result.violations.length > 0) {
      lines.push('## Violations');
      lines.push('');

      for (const v of result.violations) {
        const severityEmoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🔵',
          info: '⚪'
        };

        lines.push(`### ${severityEmoji[v.severity]} ${v.file}:${v.line}`);
        lines.push('');
        lines.push(`**Type:** ${v.type}`);
        lines.push(`**Message:** ${v.message}`);
        lines.push('');
        lines.push('```');
        lines.push(v.code);
        lines.push('```');
        lines.push('');
        if (v.suggestion) {
          lines.push(`**Suggestion:** ${v.suggestion}`);
          lines.push('');
        }
        lines.push(`**Evidence:** ${v.evidence}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    lines.push('## Verified Against');
    lines.push('');
    lines.push(`- **Config:** ${result.verifiedAgainst.configFile}`);
    lines.push(`- **Version:** ${result.verifiedAgainst.configVersion}`);
    lines.push(`- **Schemas:** ${result.verifiedAgainst.schemasChecked.join(', ') || 'None'}`);

    return lines.join('\n');
  }

  /**
   * Create a blank guardrails template for a new project
   */
  createTemplate(projectName: string): SDKGuardrailsConfig {
    return {
      version: '1.0.0',
      projectName,
      lastUpdated: new Date().toISOString(),
      sourceFiles: [
        {
          path: 'swagger_spec.json',
          purpose: 'API schema definitions'
        },
        {
          path: 'database_schema.sql',
          purpose: 'Database table definitions'
        }
      ],
      schemas: [
        {
          name: 'example_table',
          description: 'Example table - replace with your actual schema',
          fields: [
            {
              name: 'id',
              type: 'uuid',
              required: true,
              nullable: false,
              description: 'Primary key'
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              nullable: false,
              description: 'Name field'
            },
            {
              name: 'created_at',
              type: 'timestamp',
              required: true,
              nullable: false,
              description: 'Creation timestamp'
            }
          ],
          primaryKey: 'id',
          nonExistentFields: [
            'field_that_does_not_exist'
          ]
        }
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/example',
          description: 'Example endpoint - replace with your actual endpoints'
        }
      ],
      commonMistakes: [
        {
          mistake: 'Example mistake pattern',
          correction: 'Use the correct pattern instead'
        }
      ],
      rules: [
        {
          id: 'no-hardcoded-urls',
          description: 'Do not hardcode API URLs',
          severity: 'high',
          pattern: 'https?://[^\\s]+\\.com'
        }
      ]
    };
  }
}

export default SDKGuardrailsEngine;
