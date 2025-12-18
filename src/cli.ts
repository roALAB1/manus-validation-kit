#!/usr/bin/env node
/**
 * @audiencelab/manus-validation-kit
 * Command Line Interface
 * 
 * Usage:
 *   manus-validate validate [--all] [--validator=<name>] [--layer=<layer>]
 *   manus-validate learn [--fix]
 *   manus-validate cleanup
 *   manus-validate init [--force]
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationEngine } from './core/ValidationEngine';
import { SkepticalReasoningEngine } from './core/SkepticalReasoningEngine';
import { LearningLoop } from './learning/LearningLoop';
import { ContextOptimization } from './optimization/ContextOptimization';

const program = new Command();

program
  .name('manus-validate')
  .description('5-Layer Validation & Optimization System for AI-Assisted Development')
  .version('1.0.0');

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
    
    console.log('\n🚀 Manus Validation Kit v1.0.0\n');
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
  .action(async () => {
    const projectPath = process.cwd();
    
    try {
      const contextOpt = new ContextOptimization(projectPath);
      await contextOpt.cleanup();
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
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  📁 Created ${path.relative(projectPath, dir)}/`);
      }
    }

    // Create default config
    const defaultConfig = {
      version: '1.0.0',
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
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`  📄 Created .validation/config.json`);

    // Create .gitignore for validation directory
    const gitignorePath = path.join(validationDir, '.gitignore');
    const gitignoreContent = `# Ignore learning data and archives (can be large)
learning-data.json
archive/
reports/

# Keep config
!config.json
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
    console.log('  3. Run `npm run validate:architecture` for skeptical analysis\n');
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
