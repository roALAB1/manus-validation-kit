/**
 * @roALAB1/manus-validation-kit
 * 
 * A 6-layer production-ready validation and optimization system
 * for AI-assisted development.
 * 
 * Layers:
 * 1. Code Validation - 10 validators with consensus scoring
 * 2. Skeptical Reasoning - Architectural soundness & scalability
 * 3. Learning Loop - Pattern detection & auto-fixing
 * 4. Context Optimization - Cleanup & compression
 * 5. Token Efficiency - Code as API, Serena, Self-Spec, S²-MAD
 * 6. Codebase Audit - Evidence-based bloat detection & cleanup
 */

// Core engines
export { ValidationEngine } from './core/ValidationEngine';
export { SkepticalReasoningEngine } from './core/SkepticalReasoningEngine';

// Learning & optimization
export { LearningLoop } from './learning/LearningLoop';
export { ContextOptimization } from './optimization/ContextOptimization';

// Audit (Layer 6)
export { CodebaseAuditEngine } from './audit/CodebaseAuditEngine';
export { AuditReportGenerator } from './audit/AuditReportGenerator';

// Configuration
export {
  DEFAULT_VALIDATORS,
  DEFAULT_CLEANUP_CONFIG,
  DEFAULT_OPTIMIZATION_CONFIG,
  SEVERITY_WEIGHTS,
  GROWTH_PHASES,
  COMMON_BLIND_SPOTS,
} from './config/default.config';

// Types
export type {
  // Validation types
  ValidationSeverity,
  ValidationStatus,
  ValidatorConfig,
  ValidationResult,
  ValidationIssue,
  ConsensusConfig,
  ValidationEngineConfig,
  ValidationReport,
  ConsensusIssue,
  ValidationSummary,
  
  // Skeptical reasoning types
  SkepticalSeverity,
  ArchitectureCritique,
  ScaleThreshold,
  GrowthPhase,
  BlindSpot,
  TechStackIssue,
  SkepticalAssessment,
  SkepticalReport,
  
  // Learning types
  FailureRecord,
  FailurePattern,
  LearningMetrics,
  LearningReport,
  
  // Context optimization types
  ContextMetrics,
  CleanupConfig,
  CleanupReport,
  
  // Optimization types
  OptimizationConfig,
  OptimizationMetrics,
  
  // CLI types
  CLIOptions,
  InitOptions,
  
  // Service result pattern
  ServiceResult,
} from './types';

// Audit types (Layer 6)
export type {
  AuditConfig,
  AuditReport,
  AuditSummary,
  Finding,
  FindingType,
  ConfidenceCategory,
  Evidence,
  KeepList,
  CleanupPlan,
  CleanupAction,
} from './types/audit';

// Utility functions
export {
  createSuccessResult,
  createErrorResult,
} from './types';

/**
 * Quick start function to run full validation
 */
export async function validate(projectPath: string, options?: {
  validators?: string[];
  layer?: 'code' | 'skeptical' | 'all';
  fix?: boolean;
}) {
  const { ValidationEngine } = await import('./core/ValidationEngine');
  const { SkepticalReasoningEngine } = await import('./core/SkepticalReasoningEngine');
  const { LearningLoop } = await import('./learning/LearningLoop');

  const results: {
    validation?: Awaited<ReturnType<ValidationEngine['validate']>>;
    skeptical?: Awaited<ReturnType<SkepticalReasoningEngine['analyze']>>;
  } = {};

  // Run code validation
  if (!options?.layer || options.layer === 'code' || options.layer === 'all') {
    const engine = new ValidationEngine(projectPath);
    results.validation = await engine.validate(options?.validators);

    // Record in learning loop
    const learningLoop = new LearningLoop(projectPath);
    await learningLoop.recordResults(results.validation.results);

    // Auto-fix if requested
    if (options?.fix && results.validation.status === 'failed') {
      await learningLoop.applyAutoFixes();
    }
  }

  // Run skeptical reasoning
  if (options?.layer === 'skeptical' || options?.layer === 'all') {
    const skeptical = new SkepticalReasoningEngine(projectPath);
    results.skeptical = await skeptical.analyze();
  }

  return results;
}

/**
 * Quick start function to run codebase audit
 */
export async function audit(projectPath: string, options?: {
  type?: 'all' | 'dependencies' | 'files' | 'exports' | 'duplicates';
  generateCleanup?: boolean;
}) {
  const { CodebaseAuditEngine } = await import('./audit/CodebaseAuditEngine');
  const { AuditReportGenerator } = await import('./audit/AuditReportGenerator');

  // Configure tools based on type
  const type = options?.type || 'all';
  const toolConfig = {
    depcheck: { enabled: type === 'all' || type === 'dependencies' },
    'ts-prune': { enabled: type === 'all' || type === 'exports' },
    unimported: { enabled: type === 'all' || type === 'files' },
    jscpd: { enabled: type === 'all' || type === 'duplicates', minLines: 10 },
    madge: { enabled: type === 'all' },
    'cost-of-modules': { enabled: false },
  };

  const auditEngine = new CodebaseAuditEngine(projectPath, { tools: toolConfig });
  const report = await auditEngine.audit();
  const reportGenerator = new AuditReportGenerator(report);

  // Save reports
  const jsonPath = reportGenerator.saveJsonReport();
  const mdPath = reportGenerator.saveMarkdownReport();

  // Generate cleanup script if requested
  let cleanupPath: string | undefined;
  if (options?.generateCleanup) {
    cleanupPath = reportGenerator.saveCleanupScript();
  }

  return {
    report,
    consoleOutput: reportGenerator.generateConsoleReport(),
    markdownOutput: reportGenerator.generateMarkdownReport(),
    files: {
      json: jsonPath,
      markdown: mdPath,
      cleanup: cleanupPath,
    },
  };
}
