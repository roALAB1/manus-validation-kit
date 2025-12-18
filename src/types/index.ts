/**
 * @audiencelab/manus-validation-kit
 * Core Type Definitions
 */

// ============================================================================
// VALIDATION ENGINE TYPES
// ============================================================================

export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ValidationStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface ValidatorConfig {
  name: string;
  weight: number;
  command: string;
  timeout: number;
  required: boolean;
  enabled: boolean;
}

export interface ValidationResult {
  validator: string;
  status: ValidationStatus;
  weight: number;
  duration: number;
  issues: ValidationIssue[];
  metadata?: Record<string, unknown>;
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ConsensusConfig {
  minValidatorsToFlag: number;
  singleValidatorThreshold: number;
}

export interface ValidationEngineConfig {
  validators: Record<string, ValidatorConfig>;
  consensus: ConsensusConfig;
  outputDir: string;
  failOnError: boolean;
}

export interface ValidationReport {
  timestamp: string;
  duration: number;
  status: ValidationStatus;
  score: number;
  results: ValidationResult[];
  consensusIssues: ConsensusIssue[];
  summary: ValidationSummary;
}

export interface ConsensusIssue {
  issue: ValidationIssue;
  validators: string[];
  combinedWeight: number;
  flaggedByConsensus: boolean;
}

export interface ValidationSummary {
  totalValidators: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
}

// ============================================================================
// SKEPTICAL REASONING TYPES (LAYER 2)
// ============================================================================

export type SkepticalSeverity = 'critical' | 'warning' | 'suggestion';

export interface ArchitectureCritique {
  severity: SkepticalSeverity;
  title: string;
  concern: string;
  breaksAt: ScaleThreshold;
  recommendation: string;
  rationale: string;
}

export interface ScaleThreshold {
  users?: number;
  qps?: number;
  dataSize?: string;
  connections?: number;
}

export interface GrowthPhase {
  phase: number;
  name: string;
  userRange: [number, number];
  qpsRange: [number, number];
  bottlenecks: string[];
  changesNeeded: string[];
  timeline: string;
}

export interface BlindSpot {
  title: string;
  likelihood: number;
  impact: SkepticalSeverity;
  description: string;
  prevention: string;
}

export interface TechStackIssue {
  component: string;
  issue: string;
  severity: SkepticalSeverity;
  recommendation: string;
}

export interface SkepticalAssessment {
  readinessScore: number;
  scalabilityScore: number;
  architectureScore: number;
  recommendation: 'proceed' | 'proceed-with-caution' | 'stop-and-fix';
}

export interface SkepticalReport {
  timestamp: string;
  assessment: SkepticalAssessment;
  critiques: ArchitectureCritique[];
  growthPhases: GrowthPhase[];
  blindSpots: BlindSpot[];
  techStackIssues: TechStackIssue[];
}

// ============================================================================
// LEARNING LOOP TYPES (LAYER 3)
// ============================================================================

export interface FailureRecord {
  id: string;
  timestamp: string;
  validator: string;
  errorCode: string;
  errorMessage: string;
  file?: string;
  line?: number;
  pattern?: string;
  fixApplied?: string;
  fixSucceeded?: boolean;
  confidence: number;
}

export interface FailurePattern {
  pattern: string;
  description: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  fixRate: number;
  suggestedFix?: string;
  autoFixReady: boolean;
}

export interface LearningMetrics {
  totalFailures: number;
  uniquePatterns: number;
  autoFixesApplied: number;
  autoFixSuccessRate: number;
  validatorAccuracy: Record<string, number>;
  falsePositiveRate: Record<string, number>;
}

export interface LearningReport {
  timestamp: string;
  metrics: LearningMetrics;
  patterns: FailurePattern[];
  recommendations: string[];
}

// ============================================================================
// CONTEXT OPTIMIZATION TYPES (LAYER 4)
// ============================================================================

export interface ContextMetrics {
  totalSize: number;
  activeSize: number;
  archivedSize: number;
  compressionRatio: number;
  tokenEstimate: number;
}

export interface CleanupConfig {
  maxActiveSize: number;
  maxFailureCount: number;
  maxPatternCount: number;
  retentionDays: number;
  archiveAfterDays: number;
  compressAfterDays: number;
  deleteAfterDays: number;
}

export interface CleanupReport {
  timestamp: string;
  beforeMetrics: ContextMetrics;
  afterMetrics: ContextMetrics;
  itemsRemoved: number;
  itemsArchived: number;
  itemsCompressed: number;
  spaceSaved: number;
}

// ============================================================================
// OPTIMIZATION STACK TYPES (LAYER 5)
// ============================================================================

export interface OptimizationConfig {
  codeAsApi: {
    enabled: boolean;
    batchSize: number;
    timeout: number;
  };
  serenaContext: {
    enabled: boolean;
    maxContextSize: number;
    semanticThreshold: number;
  };
  selfSpec: {
    enabled: boolean;
    strictMode: boolean;
  };
  sparseDebate: {
    enabled: boolean;
    initialValidators: string[];
    escalationThreshold: number;
  };
}

export interface OptimizationMetrics {
  tokensSaved: number;
  tokenSavingsPercent: number;
  executionTimeMs: number;
  validatorsSkipped: number;
  contextReduction: number;
}

// ============================================================================
// CLI & INTEGRATION TYPES
// ============================================================================

export interface CLIOptions {
  config?: string;
  validators?: string[];
  layer?: 'code' | 'skeptical' | 'learning' | 'context' | 'optimization' | 'all';
  output?: 'json' | 'text' | 'markdown';
  verbose?: boolean;
  fix?: boolean;
  ci?: boolean;
}

export interface InitOptions {
  projectPath: string;
  overwrite?: boolean;
  skipHooks?: boolean;
  skipCI?: boolean;
}

// ============================================================================
// SERVICE RESULT PATTERN
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export function createSuccessResult<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResult<T>(code: string, message: string): ServiceResult<T> {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}
