/**
 * @roALAB1/manus-validation-kit
 * Audit System Types - Layer 6
 */

// ============================================================================
// Evidence Types
// ============================================================================

export interface Evidence {
  /** Which tool produced this evidence */
  tool: 'depcheck' | 'ts-prune' | 'unimported' | 'jscpd' | 'madge' | 'eslint' | 'cost-of-modules';
  /** Raw output from the tool */
  output: string;
  /** When the tool was run */
  timestamp: string;
  /** Exit code of the tool (0 = success) */
  exitCode?: number;
}

// ============================================================================
// Finding Types
// ============================================================================

export type FindingType = 
  | 'unused-dependency'
  | 'unused-file'
  | 'unused-export'
  | 'duplicate-code'
  | 'circular-dependency'
  | 'large-dependency'
  | 'stale-file';

export type ConfidenceCategory = 'high' | 'medium' | 'low';

export interface Finding {
  /** Unique identifier for this finding */
  id: string;
  /** Type of issue found */
  type: FindingType;
  /** Target file path or package name */
  target: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Confidence category based on score */
  category: ConfidenceCategory;
  /** Human-readable recommendation */
  recommendation: string;
  /** Evidence from tools that support this finding */
  evidence: Evidence[];
  /** Impact assessment */
  impact?: {
    sizeKB?: number;
    description: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Report Types
// ============================================================================

export interface AuditSummary {
  totalFindings: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  estimatedBloatKB: number;
  unusedDependencies: number;
  unusedFiles: number;
  unusedExports: number;
  duplicateBlocks: number;
  circularDependencies: number;
  staleFiles: number;
}

export interface AuditReport {
  /** Report version */
  version: string;
  /** When the audit was run */
  timestamp: string;
  /** Path to the audited project */
  projectPath: string;
  /** Duration of the audit in milliseconds */
  duration: number;
  /** Summary statistics */
  summary: AuditSummary;
  /** All findings */
  findings: Finding[];
  /** Tools that were run */
  toolsUsed: string[];
  /** Any errors encountered during audit */
  errors: AuditError[];
}

export interface AuditError {
  tool: string;
  message: string;
  timestamp: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AuditToolConfig {
  enabled: boolean;
  /** Tool-specific options */
  options?: Record<string, unknown>;
}

export interface AuditConfig {
  enabled: boolean;
  tools: {
    depcheck: AuditToolConfig;
    'ts-prune': AuditToolConfig;
    unimported: AuditToolConfig;
    jscpd: AuditToolConfig & { minLines?: number; minTokens?: number };
    madge: AuditToolConfig;
    'cost-of-modules': AuditToolConfig;
  };
  thresholds: {
    /** Minimum confidence to include in report */
    minConfidenceToReport: number;
    /** Minimum confidence to recommend action */
    minConfidenceToRecommend: number;
    /** Files older than this (days) are considered stale */
    staleFileDays: number;
  };
  exclusions: {
    /** Paths to exclude from audit */
    paths: string[];
    /** Package patterns to exclude */
    packages: string[];
    /** File patterns to exclude */
    patterns: string[];
  };
}

// ============================================================================
// Exclusion List Types
// ============================================================================

export interface ExcludedFile {
  path: string;
  reason: string;
  addedBy?: string;
  addedAt?: string;
}

export interface ExcludedPackage {
  name: string;
  reason: string;
  addedBy?: string;
  addedAt?: string;
}

export interface KeepList {
  description: string;
  files: ExcludedFile[];
  packages: ExcludedPackage[];
}

// ============================================================================
// Cleanup Types
// ============================================================================

export interface CleanupAction {
  type: 'delete-file' | 'remove-dependency' | 'archive-file' | 'remove-export';
  target: string;
  finding: Finding;
  command?: string;
}

export interface CleanupPlan {
  timestamp: string;
  projectPath: string;
  actions: CleanupAction[];
  estimatedImpact: {
    filesRemoved: number;
    dependenciesRemoved: number;
    sizeFreedKB: number;
  };
  script: string;
}

// ============================================================================
// Tool Output Types
// ============================================================================

export interface DepcheckResult {
  dependencies: string[];
  devDependencies: string[];
  missing: Record<string, string[]>;
  invalidFiles: Record<string, unknown>;
  invalidDirs: Record<string, unknown>;
}

export interface TsPruneResult {
  file: string;
  line: number;
  export: string;
  type: string;
}

export interface UnimportedResult {
  unimported: string[];
  unresolved: string[];
  unused: string[];
}

export interface JscpdResult {
  duplicates: Array<{
    firstFile: { name: string; start: number; end: number };
    secondFile: { name: string; start: number; end: number };
    lines: number;
    tokens: number;
  }>;
  statistics: {
    total: { lines: number; sources: number; clones: number; duplicatedLines: number };
  };
}

export interface MadgeResult {
  circular: string[][];
  orphans: string[];
  warnings: string[];
}
