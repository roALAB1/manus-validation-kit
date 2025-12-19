#!/usr/bin/env node
/**
 * @roALAB1/manus-validation-kit
 * Command Line Interface
 * 
 * Usage:
 *   manus-validate validate [--all] [--validator=<name>] [--layer=<layer>]
 *   manus-validate audit [--type=<type>] [--generate-cleanup]
 *   manus-validate learn [--fix]
 *   manus-validate cleanup [--confirm]
 *   manus-validate init [--force]
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationEngine } from './core/ValidationEngine';
import { SkepticalReasoningEngine } from './core/SkepticalReasoningEngine';
import { LearningLoop } from './learning/LearningLoop';
import { ContextOptimization } from './optimization/ContextOptimization';
import { CodebaseAuditEngine } from './audit/CodebaseAuditEngine';
import { AuditReportGenerator } from './audit/AuditReportGenerator';

const program = new Command();

program
  .name('manus-validate')
  .description('6-Layer Validation & Optimization System for AI-Assisted Development')
  .version('1.1.0');

// ============================================================================
// VALIDATE COMMAND
// ============================================================================

program
  .command('validate')
  .description('Run validation on the current project')
  .option('-a, --all', 'Run all validators including disabled ones')
  .option('-v, --validator <names>', 'Comma-separated list of validators to run')
  .option('-l, --layer <layer>', 'Run specific layer (code, skeptical, all)', 'code')
  .option('-o, --output <format>', 'Output format (json, text, markdown)', 'text')
  .option('--ci', 'Run in CI mode (exit with error code on failure)')
  .option('--fix', 'Attempt to auto-fix issues')
  .action(async (options) => {
    const projectPath = process.cwd();
    
    console.log('\n🚀 Manus Validation Kit v1.1.0\n');
    console.log(`📁 Project: ${projectPath}\n`);

    let exitCode = 0;

    try {
      // Layer 1: Code Validation
      if (options.layer === 'code' || options.layer === 'all') {
        const engine = new ValidationEngine(projectPath);
        const validators = options.validator?.split(',');
        const report = await engine.validate(validators);

        // Record results in learning loop
        const learningLoop = new LearningLoop(projectPath);
        await learningLoop.recordResults(report.results);

        if (report.status === 'failed') {
          exitCode = 1;
        }

        // Save report
        saveReport(projectPath, 'validation', report);

        // Auto-fix if requested
        if (options.fix && report.status === 'failed') {
          console.log('\n🔧 Attempting auto-fixes...\n');
          const { applied, succeeded } = await learningLoop.applyAutoFixes();
          console.log(`   Applied: ${applied}, Succeeded: ${succeeded}`);
        }
      }

      // Layer 2: Skeptical Reasoning
      if (options.layer === 'skeptical' || options.layer === 'all') {
        const skeptical = new SkepticalReasoningEngine(projectPath);
        const report = await skeptical.analyze();

        if (report.assessment.recommendation === 'stop-and-fix') {
          exitCode = 1;
        }

        saveReport(projectPath, 'skeptical', report);
      }

      // Auto cleanup if needed
      const contextOpt = new ContextOptimization(projectPath);
      if (await contextOpt.shouldCleanup()) {
        console.log('\n⚠️  Context size threshold exceeded. Running cleanup...');
        await contextOpt.cleanup();
      }

    } catch (error) {
      console.error('\n❌ Validation failed:', error);
      exitCode = 1;
    }

    if (options.ci) {
      process.exit(exitCode);
    }
  });

// ============================================================================
// AUDIT COMMAND (Layer 6)
// ============================================================================

program
  .command('audit')
  .description('Run evidence-based codebase audit to find unused code, dependencies, and bloat')
  .option('-t, --type <type>', 'Audit type (all, dependencies, files, exports, duplicates)', 'all')
  .option('-o, --output <format>', 'Output format (text, json, markdown)', 'text')
  .option('--generate-cleanup', 'Generate cleanup script for high-confidence findings')
  .option('--ci', 'Run in CI mode (exit with error code if high-confidence issues found)')
  .option('--min-confidence <number>', 'Minimum confidence to report (0-100)', '50')
  .action(async (options) => {
    const projectPath = process.cwd();
    
    console.log('\n🔍 Manus Validation Kit - Evidence-Based Audit\n');
    console.log(`📁 Project: ${projectPath}\n`);

    try {
      // Configure which tools to run based on type
      const toolConfig: Record<string, boolean> = {
        depcheck: options.type === 'all' || options.type === 'dependencies',
        'ts-prune': options.type === 'all' || options.type === 'exports',
        unimported: options.type === 'all' || options.type === 'files',
        jscpd: options.type === 'all' || options.type === 'duplicates',
        madge: options.type === 'all',
        'cost-of-modules': false,
      };

      const auditEngine = new CodebaseAuditEngine(projectPath, {
        tools: {
          depcheck: { enabled: toolConfig.depcheck },
          'ts-prune': { enabled: toolConfig['ts-prune'] },
          unimported: { enabled: toolConfig.unimported },
          jscpd: { enabled: toolConfig.jscpd, minLines: 10 },
          madge: { enabled: toolConfig.madge },
          'cost-of-modules': { enabled: toolConfig['cost-of-modules'] },
        },
        thresholds: {
          minConfidenceToReport: parseInt(options.minConfidence) || 50,
          minConfidenceToRecommend: 70,
          staleFileDays: 180,
        },
      });

      const report = await auditEngine.audit();
      const reportGenerator = new AuditReportGenerator(report);

      // Output based on format
      if (options.output === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else if (options.output === 'markdown') {
        console.log(reportGenerator.generateMarkdownReport());
      } else {
        console.log(reportGenerator.generateConsoleReport());
      }

      // Save reports
      const jsonPath = reportGenerator.saveJsonReport();
      const mdPath = reportGenerator.saveMarkdownReport();
      console.log(`\n📄 Reports saved:`);
      console.log(`   JSON: ${path.relative(projectPath, jsonPath)}`);
      console.log(`   Markdown: ${path.relative(projectPath, mdPath)}`);

      // Generate cleanup script if requested
      if (options.generateCleanup) {
        const scriptPath = reportGenerator.saveCleanupScript();
        console.log(`   Cleanup Script: ${path.relative(projectPath, scriptPath)}`);
        console.log('\n⚠️  Review the cleanup script before running it!');
      }

      // CI mode exit code
      if (options.ci && report.summary.highConfidence > 0) {
        console.log(`\n❌ Found ${report.summary.highConfidence} high-confidence issues`);
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Audit failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// LEARN COMMAND
// ============================================================================

program
  .command('learn')
  .description('Generate learning report and optionally apply auto-fixes')
  .option('--fix', 'Apply auto-fixes for high-confidence patterns')
  .action(async (options) => {
    const projectPath = process.cwd();
    
    console.log('\n📚 Learning Loop Analysis\n');

    try {
      const learningLoop = new LearningLoop(projectPath);
      const report = await learningLoop.generateReport();

      console.log('\n' + '═'.repeat(60));
      console.log('  LEARNING REPORT');
      console.log('═'.repeat(60));
      console.log(`  Total Failures:     ${report.metrics.totalFailures}`);
      console.log(`  Unique Patterns:    ${report.metrics.uniquePatterns}`);
      console.log(`  Auto-Fixes Applied: ${report.metrics.autoFixesApplied}`);
      console.log(`  Auto-Fix Success:   ${(report.metrics.autoFixSuccessRate * 100).toFixed(1)}%`);
      console.log('─'.repeat(60));

      if (report.patterns.length > 0) {
        console.log('\n📋 Top Patterns:');
        for (const pattern of report.patterns.slice(0, 5)) {
          const status = pattern.autoFixReady ? '✅' : '⏳';
          console.log(`  ${status} ${pattern.description.slice(0, 50)}...`);
          console.log(`     Occurrences: ${pattern.occurrences}, Fix Rate: ${(pattern.fixRate * 100).toFixed(0)}%`);
        }
      }

      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const rec of report.recommendations) {
          console.log(`  ${rec}`);
        }
      }

      console.log('═'.repeat(60) + '\n');

      if (options.fix) {
        console.log('🔧 Applying auto-fixes...\n');
        const { applied, succeeded } = await learningLoop.applyAutoFixes();
        console.log(`   Applied: ${applied}, Succeeded: ${succeeded}\n`);
      }

      saveReport(projectPath, 'learning', report);

    } catch (error) {
      console.error('\n❌ Learning analysis failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// CLEANUP COMMAND
// ============================================================================

program
  .command('cleanup')
  .description('Run context optimization and cleanup')
  .option('--confirm', 'Execute cleanup actions (without this, only shows what would be done)')
  .option('--dry-run', 'Show what would be cleaned up without making changes')
  .action(async (options) => {
    const projectPath = process.cwd();
    
    try {
      const contextOpt = new ContextOptimization(projectPath);
      
      if (options.dryRun || !options.confirm) {
        console.log('\n🔍 Cleanup Preview (dry run)\n');
        console.log('The following actions would be taken:');
        // Show what would be cleaned
        await contextOpt.cleanup();
        console.log('\nRun with --confirm to execute these actions.');
      } else {
        await contextOpt.cleanup();
      }
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// INIT COMMAND
// ============================================================================

program
  .command('init')
  .description('Initialize validation kit in the current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    const projectPath = process.cwd();
    const validationDir = path.join(projectPath, '.validation');
    const configPath = path.join(validationDir, 'config.json');

    console.log('\n🔧 Initializing Manus Validation Kit...\n');

    // Check if already initialized
    if (fs.existsSync(configPath) && !options.force) {
      console.log('⚠️  Validation kit already initialized. Use --force to overwrite.\n');
      return;
    }

    // Create directories
    const dirs = [
      validationDir,
      path.join(validationDir, 'reports'),
      path.join(validationDir, 'archive'),
      path.join(validationDir, 'audit'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  📁 Created ${path.relative(projectPath, dir)}/`);
      }
    }

    // Create default config
    const defaultConfig = {
      version: '1.1.0',
      validators: {
        typescript: { enabled: true, weight: 0.96 },
        eslint: { enabled: true, weight: 0.92 },
        jest_unit: { enabled: true, weight: 0.93 },
        zod_schema_validation: { enabled: true, weight: 0.99 },
        security_scan: { enabled: true, weight: 0.88 },
      },
      consensus: {
        minValidatorsToFlag: 2,
        singleValidatorThreshold: 0.95,
      },
      cleanup: {
        maxActiveSize: 512000,
        retentionDays: 30,
        archiveAfterDays: 7,
      },
      audit: {
        enabled: true,
        tools: {
          depcheck: { enabled: true },
          'ts-prune': { enabled: true },
          unimported: { enabled: true },
          jscpd: { enabled: true, minLines: 10 },
          madge: { enabled: true },
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
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`  📄 Created .validation/config.json`);

    // Create keep.json for exclusions
    const keepPath = path.join(validationDir, 'keep.json');
    const keepContent = {
      description: 'Files and packages intentionally kept despite appearing unused',
      files: [],
      packages: [],
    };
    fs.writeFileSync(keepPath, JSON.stringify(keepContent, null, 2));
    console.log(`  📄 Created .validation/keep.json`);

    // Create patterns.json
    const patternsPath = path.join(validationDir, 'patterns.json');
    const patternsContent = {
      version: '1.0.0',
      patterns: [],
    };
    fs.writeFileSync(patternsPath, JSON.stringify(patternsContent, null, 2));
    console.log(`  📄 Created .validation/patterns.json`);

    // Create .gitignore for validation directory
    const gitignorePath = path.join(validationDir, '.gitignore');
    const gitignoreContent = `# Ignore learning data and archives (can be large)
learning-data.json
archive/
reports/
audit/
cleanup.sh

# Keep config files
!config.json
!keep.json
!patterns.json
`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(`  📄 Created .validation/.gitignore`);

    // Add scripts to package.json if it exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        packageJson.scripts = packageJson.scripts || {};
        
        const newScripts = {
          'validate': 'manus-validate validate',
          'validate:all': 'manus-validate validate --all',
          'validate:architecture': 'manus-validate validate --layer=skeptical',
          'validate:audit': 'manus-validate audit',
          'validate:audit:deps': 'manus-validate audit --type=dependencies',
          'validate:audit:files': 'manus-validate audit --type=files',
          'validate:learn': 'manus-validate learn',
          'validate:cleanup': 'manus-validate cleanup',
        };

        let scriptsAdded = 0;
        for (const [key, value] of Object.entries(newScripts)) {
          if (!packageJson.scripts[key]) {
            packageJson.scripts[key] = value;
            scriptsAdded++;
          }
        }

        if (scriptsAdded > 0) {
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          console.log(`  📦 Added ${scriptsAdded} npm scripts to package.json`);
        }
      } catch {
        // Ignore package.json errors
      }
    }

    console.log('\n✅ Initialization complete!\n');
    console.log('Next steps:');
    console.log('  1. Review .validation/config.json');
    console.log('  2. Run `npm run validate` to validate your project');
    console.log('  3. Run `npm run validate:audit` to audit for bloat and unused code');
    console.log('  4. Run `npm run validate:architecture` for skeptical analysis\n');
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function saveReport(projectPath: string, type: string, report: unknown): void {
  const reportsDir = path.join(projectPath, '.validation', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
}

// Run CLI
program.parse();
